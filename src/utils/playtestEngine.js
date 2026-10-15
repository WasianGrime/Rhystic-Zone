// Pure, immutable game-state helpers for the goldfish playtester. Every
// function takes a game state and returns a new one, so the page can keep a
// simple undo history of snapshots.
//
// A game is { library, hand, battlefield, graveyard, exile, command, life,
// poison, tax, turn, mulligans, bottomNeeded, log }. Each zone is an array of
// card instances; the top of the library is index 0 and the top of the
// graveyard/exile is the last element.

export const ZONES = ['library', 'hand', 'battlefield', 'graveyard', 'exile', 'command']

const STARTING_HAND = 7
const STARTING_LIFE = 40
const LOG_LIMIT = 60

let nextUid = 1
let nextLogId = 1

export function makeInstance(card, extra = {}) {
  return { uid: nextUid++, card, tapped: false, faceDown: false, flipped: false, counters: 0, ...extra }
}

export function shuffle(list) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function typeLine(card) {
  return card.type_line || card.card_faces?.[0]?.type_line || ''
}

export function isLand(card) {
  return /\bLand\b/.test(typeLine(card))
}

export function hasBackFace(card) {
  return Boolean(card.card_faces?.[1]?.image_uris)
}

export function instanceName(inst) {
  return inst.faceDown ? 'A face-down card' : inst.card.name
}

export function addLog(g, text) {
  return { ...g, log: [...g.log, { id: nextLogId++, text }].slice(-LOG_LIMIT) }
}

export function draw(g, n = 1) {
  const count = Math.min(n, g.library.length)
  if (count === 0) return g
  return {
    ...g,
    library: g.library.slice(count),
    hand: [...g.hand, ...g.library.slice(0, count)],
  }
}

export function buildGame(deck) {
  const library = []
  deck.cards.forEach(({ card, qty }) => {
    for (let i = 0; i < qty; i++) library.push(makeInstance(card))
  })
  const command = deck.commander ? [makeInstance(deck.commander, { isCommander: true })] : []
  const start = {
    library: shuffle(library),
    hand: [],
    battlefield: [],
    graveyard: [],
    exile: [],
    command,
    life: STARTING_LIFE,
    poison: 0,
    tax: 0,
    turn: 1,
    mulligans: 0,
    bottomNeeded: 0,
    log: [],
  }
  return addLog(draw(start, STARTING_HAND), `New game — drew an opening hand of ${Math.min(STARTING_HAND, library.length)}.`)
}

// Lands go in a row along the bottom of the battlefield, everything else in
// rows above. x/y are 0..1 fractions of the free space, so cards stay inside
// the mat however it is resized.
export function autoPlace(battlefield, card) {
  const land = isLand(card)
  const sameKind = battlefield.filter((i) => isLand(i.card) === land).length
  const col = sameKind % 9
  const row = Math.floor(sameKind / 9)
  const x = Math.min(1, (col / 8) + row * 0.02)
  const y = land ? 0.72 : 0.04 + (row % 2) * 0.32
  return { x, y }
}

export function findInstance(g, uid) {
  for (const zone of ZONES) {
    const inst = g[zone].find((i) => i.uid === uid)
    if (inst) return { zone, inst }
  }
  return null
}

export function updateInstance(g, uid, patch) {
  const found = findInstance(g, uid)
  if (!found) return g
  return {
    ...g,
    [found.zone]: g[found.zone].map((i) => (i.uid === uid ? { ...i, ...(typeof patch === 'function' ? patch(i) : patch) } : i)),
  }
}

// Moves a card between zones. `position` ('top' | 'bottom') applies to the
// library; x/y place a card on the battlefield. Tokens vanish when they leave
// the battlefield, and casting the commander bumps the commander tax.
export function moveCard(g, uid, to, { position = 'top', x, y } = {}) {
  const found = findInstance(g, uid)
  if (!found) return g
  const { zone: from, inst } = found
  if (from === to && to !== 'battlefield' && to !== 'library') return g

  let next = { ...g, [from]: g[from].filter((i) => i.uid !== uid) }
  if (inst.isToken && to !== 'battlefield') return next

  if (to === 'battlefield') {
    const spot = x !== undefined && y !== undefined ? { x, y } : from === 'battlefield' ? { x: inst.x, y: inst.y } : autoPlace(next.battlefield, inst.card)
    next = { ...next, battlefield: [...next.battlefield, { ...inst, ...spot }] }
    if (inst.isCommander && from === 'command') next = { ...next, tax: next.tax + 1 }
    return next
  }

  const reset = { ...inst, tapped: false, faceDown: false, flipped: false, counters: 0, x: undefined, y: undefined }
  if (to === 'library') {
    return { ...next, library: position === 'bottom' ? [...next.library, reset] : [reset, ...next.library] }
  }
  return { ...next, [to]: [...next[to], reset] }
}

export function untapAll(g) {
  if (!g.battlefield.some((i) => i.tapped)) return g
  return { ...g, battlefield: g.battlefield.map((i) => (i.tapped ? { ...i, tapped: false } : i)) }
}

export function nextTurn(g) {
  const turn = g.turn + 1
  return addLog(draw(untapAll({ ...g, turn }), 1), `Turn ${turn}: untapped and drew a card.`)
}

// London mulligan with Commander's free first mulligan: shuffle everything in
// hand back, draw seven, then bottom (mulligans - 1) cards.
export function mulligan(g) {
  const mulligans = g.mulligans + 1
  const library = shuffle([...g.library, ...g.hand.map((i) => ({ ...i, tapped: false }))])
  const start = { ...g, library, hand: [], mulligans, bottomNeeded: Math.max(0, mulligans - 1) }
  const drawn = draw(start, STARTING_HAND)
  const bottom = drawn.bottomNeeded
  return addLog(
    drawn,
    bottom > 0
      ? `Mulligan #${mulligans}: drew ${STARTING_HAND}. Put ${bottom} card${bottom === 1 ? '' : 's'} on the bottom.`
      : `Mulligan #${mulligans}: drew ${STARTING_HAND} (the first one is free).`
  )
}

export function mill(g, n) {
  const count = Math.min(n, g.library.length)
  if (count === 0) return g
  return addLog(
    {
      ...g,
      library: g.library.slice(count),
      graveyard: [...g.graveyard, ...g.library.slice(0, count).map((i) => ({ ...i }))],
    },
    `Milled ${count} card${count === 1 ? '' : 's'}.`
  )
}

// decisions: [{ uid, dest: 'top' | 'bottom' | 'graveyard' }] for the top N.
export function applyScry(g, decisions) {
  const ids = new Set(decisions.map((d) => d.uid))
  const scried = decisions
    .map((d) => ({ dest: d.dest, inst: g.library.find((i) => i.uid === d.uid) }))
    .filter((d) => d.inst)
  const rest = g.library.filter((i) => !ids.has(i.uid))
  const top = scried.filter((d) => d.dest === 'top').map((d) => d.inst)
  const bottom = scried.filter((d) => d.dest === 'bottom').map((d) => d.inst)
  const yard = scried.filter((d) => d.dest === 'graveyard').map((d) => d.inst)
  const parts = [`${top.length} on top`, `${bottom.length} on the bottom`]
  if (yard.length > 0) parts.push(`${yard.length} to the graveyard`)
  return addLog(
    { ...g, library: [...top, ...rest, ...bottom], graveyard: [...g.graveyard, ...yard] },
    `Scry ${decisions.length}: ${parts.join(', ')}.`
  )
}

export function addToken(g, card) {
  const inst = makeInstance(card, { isToken: true, ...autoPlace(g.battlefield, card) })
  return addLog({ ...g, battlefield: [...g.battlefield, inst] }, `Created a ${card.name} token.`)
}

export function copyAsToken(g, uid) {
  const found = findInstance(g, uid)
  if (!found || found.zone !== 'battlefield') return g
  const { inst } = found
  const copy = makeInstance(inst.card, {
    isToken: true,
    flipped: inst.flipped,
    x: Math.min(1, (inst.x ?? 0) + 0.03),
    y: Math.min(1, (inst.y ?? 0) + 0.04),
  })
  return addLog({ ...g, battlefield: [...g.battlefield, copy] }, `Copied ${inst.card.name} as a token.`)
}
