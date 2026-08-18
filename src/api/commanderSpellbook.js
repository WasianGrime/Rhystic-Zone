// Commander Spellbook (commanderspellbook.com) is the community's combo
// database for EDH — this is their public API, meant for third-party tools
// like this one (same spirit as Scryfall's). It's unofficial Fan Content,
// not affiliated with Wizards of the Coast.
const BASE = 'https://backend.commanderspellbook.com'

async function request(url, options) {
  const res = await fetch(url, options)
  if (!res.ok) throw new Error(`Commander Spellbook request failed (${res.status})`)
  return res.json()
}

// Popular infinite combos legal within a color identity — used before a deck
// exists yet, e.g. on a commander's own detail page.
export async function getPotentialInfiniteCombos(colorIdentity, { limit = 12 } = {}) {
  const ids = colorIdentity && colorIdentity.length > 0 ? colorIdentity.join('').toLowerCase() : 'c'
  const params = new URLSearchParams({
    q: `coloridentity<=${ids} result:infinite`,
    ordering: '-popularity',
    limit: String(limit),
  })
  const data = await request(`${BASE}/variants?${params.toString()}`)
  return data.results || []
}

// Combos already fully assembled from the given commander(s) + decklist,
// plus combos missing exactly one card (same commander, same colors).
export async function findCombosInDeck(commanderNames, cardNames) {
  const data = await request(`${BASE}/find-my-combos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      commanders: commanderNames.map((name) => ({ card: name })),
      main: cardNames.map((name) => ({ card: name })),
    }),
  })
  return data.results || {}
}

export function comboUrl(id) {
  return `https://commanderspellbook.com/combo/${id}/`
}

export function comboProduces(combo) {
  return combo.produces.map((p) => p.feature.name)
}

export function isInfiniteCombo(combo) {
  return combo.produces.some((p) => /infinite/i.test(p.feature.name))
}
