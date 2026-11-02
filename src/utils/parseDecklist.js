// Parses pasted decklists from the common deck sites (Moxfield, Archidekt,
// MTGGoldfish, EDHREC, Deckstats, MTG Arena/MTGO exports, plain "1 Card"
// lists) into { entries, skippedCount }.
//
// Each entry: { qty, name, set, collector_number, isCommander, blockRole }
//  - isCommander: explicitly marked (a "Commander" section, *CMDR*,
//    [Commander{top}], #!Commander).
//  - blockRole: nothing needs to be marked for this to be set. 'first' or
//    'last' means the card sits in a block of one or two cards at the top or
//    bottom of the list, separated from the rest by a blank line — how
//    MTGGoldfish (top) and Moxfield (bottom) lay out their commanders.
//
// sideEntries are the cards from Sideboard sections, same shape as entries.
// Moxfield's export puts the commanders in the last block of that section, so
// a sideboard card can carry blockRole 'last' too.

const SECTION_HEADERS = {
  commander: 'commander',
  commanders: 'commander',
  deck: 'main',
  main: 'main',
  maindeck: 'main',
  'main deck': 'main',
  mainboard: 'main',
  sideboard: 'sideboard',
  side: 'sideboard',
  maybeboard: 'skip',
  maybe: 'skip',
  considering: 'skip',
  companion: 'skip',
  tokens: 'skip',
  token: 'skip',
  about: 'ignore',
}

function headerSection(line) {
  const key = line
    .replace(/\s*\(\d+\)\s*$/, '')
    .replace(/:$/, '')
    .trim()
    .toLowerCase()
  return SECTION_HEADERS[key] || null
}

export function parseDecklist(text) {
  const entries = []
  const sideEntries = []
  let skippedCount = 0
  let section = 'main'
  let group = 0
  let groupHasEntries = false

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()

    if (!line) {
      if (groupHasEntries) {
        group += 1
        groupHasEntries = false
      }
      continue
    }
    if (line.startsWith('//') || line.startsWith('#')) continue

    const header = headerSection(line)
    if (header) {
      section = header
      continue
    }

    let lineSection = section
    let body = line
    const sbPrefix = line.match(/^SB:\s*(.*)$/i)
    if (sbPrefix) {
      lineSection = 'sideboard'
      body = sbPrefix[1]
      if (!body) continue
    }

    const match = body.match(/^(?:(\d+)\s*[xX]?\s+)?(.+)$/)
    if (!match) continue
    const qty = match[1] ? parseInt(match[1], 10) : 1
    let rest = match[2]
    let isCommander = lineSection === 'commander'

    // Archidekt categories: [Commander{top}], [Ramp]
    rest = rest.replace(/\[([^\]]*)\]/g, (_, tag) => {
      if (/commander/i.test(tag)) isCommander = true
      return ''
    })
    // Deckstats tags: #!Commander, #Ramp
    rest = rest.replace(/\s+#.*$/, (tail) => {
      if (/commander/i.test(tail)) isCommander = true
      return ''
    })
    // Archidekt flags: ^Have,#37cd7e^
    rest = rest.replace(/\^[^^]*\^/g, '')
    // Moxfield/MTGGoldfish markers: *F*, *E*, *CMDR*
    rest = rest.replace(/\*([A-Za-z]+)\*/g, (_, tag) => {
      if (/^(cmdr|commander)$/i.test(tag)) isCommander = true
      return ''
    })
    rest = rest.trim()

    // Set + collector number: "Sol Ring (CMM) 400"
    let name = rest
    let set = null
    let collector_number = null
    const printing = rest.match(/^(.*?)\s+\(([A-Za-z0-9]{2,6})\)(?:\s+([A-Za-z0-9★†-]+))?$/)
    if (printing) {
      name = printing[1].trim()
      set = printing[2]
      collector_number = printing[3] || null
    }
    if (!name) continue

    if (lineSection === 'ignore') continue
    if (lineSection === 'skip') {
      skippedCount += qty
      continue
    }
    if (lineSection === 'sideboard') {
      sideEntries.push({ qty, name, set, collector_number, isCommander: false, group })
      groupHasEntries = true
      continue
    }

    entries.push({ qty, name, set, collector_number, isCommander, group })
    groupHasEntries = true
  }

  // A block of one or two single cards at the top or bottom of a section.
  function smallBlock(list, groupIndex) {
    const block = list.filter((e) => e.group === groupIndex)
    return block.length > 0 && block.length <= 2 && block.every((e) => e.qty === 1)
  }
  const lastGroup = entries.reduce((max, e) => Math.max(max, e.group), 0)
  const firstIsSmall = lastGroup > 0 && smallBlock(entries, 0)
  const lastIsSmall = lastGroup > 0 && smallBlock(entries, lastGroup)
  const lastSideGroup = sideEntries.reduce((max, e) => Math.max(max, e.group), 0)
  const sideLastIsSmall = sideEntries.length > 0 && smallBlock(sideEntries, lastSideGroup)

  return {
    entries: entries.map((e) => ({
      qty: e.qty,
      name: e.name,
      set: e.set,
      collector_number: e.collector_number,
      isCommander: e.isCommander,
      blockRole: e.group === lastGroup && lastIsSmall ? 'last' : e.group === 0 && firstIsSmall ? 'first' : null,
    })),
    sideEntries: sideEntries.map((e) => ({
      qty: e.qty,
      name: e.name,
      set: e.set,
      collector_number: e.collector_number,
      isCommander: false,
      blockRole: e.group === lastSideGroup && sideLastIsSmall ? 'last' : null,
    })),
    skippedCount,
  }
}
