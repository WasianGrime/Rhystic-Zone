// Parses pasted decklists from the common deck sites (Moxfield, Archidekt,
// MTGGoldfish, EDHREC, Deckstats, MTG Arena/MTGO exports, plain "1 Card"
// lists) into { entries, skippedCount }.
//
// Each entry: { qty, name, set, collector_number, isCommander, maybeCommander }
//  - isCommander: explicitly marked (a "Commander" section, *CMDR*,
//    [Commander{top}], #!Commander).
//  - maybeCommander: nothing was marked, but this card sits alone in the
//    first blank-line-separated block above the rest of the list — the
//    layout MTGGoldfish and Moxfield exports use for the commander.

const SECTION_HEADERS = {
  commander: 'commander',
  commanders: 'commander',
  deck: 'main',
  main: 'main',
  maindeck: 'main',
  'main deck': 'main',
  mainboard: 'main',
  sideboard: 'skip',
  side: 'skip',
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

    if (/^SB:\s*/i.test(line)) {
      skippedCount += 1
      continue
    }

    const match = line.match(/^(?:(\d+)\s*[xX]?\s+)?(.+)$/)
    if (!match) continue
    const qty = match[1] ? parseInt(match[1], 10) : 1
    let rest = match[2]
    let isCommander = section === 'commander'

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

    if (section === 'ignore') continue
    if (section === 'skip') {
      skippedCount += qty
      continue
    }

    entries.push({ qty, name, set, collector_number, isCommander, group })
    groupHasEntries = true
  }

  const anyMarked = entries.some((e) => e.isCommander)
  const firstGroup = entries.filter((e) => e.group === 0)
  const looksLikeCommanderBlock =
    !anyMarked && firstGroup.length === 1 && firstGroup[0].qty === 1 && entries.length > 1
  return {
    entries: entries.map((e, i) => ({
      qty: e.qty,
      name: e.name,
      set: e.set,
      collector_number: e.collector_number,
      isCommander: e.isCommander,
      maybeCommander: looksLikeCommanderBlock && i === 0,
    })),
    skippedCount,
  }
}
