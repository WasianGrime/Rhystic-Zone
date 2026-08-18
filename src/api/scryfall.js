const BASE = 'https://api.scryfall.com'

// Scryfall asks integrations to stay under ~10 req/sec and to insert small
// delays between requests. We queue every call through here so bursts of
// UI-triggered fetches (search-as-you-type, grids of card art, etc.) never
// hammer the API.
let queue = Promise.resolve()
const MIN_GAP_MS = 100

function throttledFetch(url) {
  const run = queue.then(async () => {
    const res = await fetch(url)
    await new Promise((r) => setTimeout(r, MIN_GAP_MS))
    return res
  })
  queue = run.catch(() => {})
  return run
}

const cache = new Map()
// Cards, prices, and popularity rankings shift over time on Scryfall's end —
// without a TTL this in-memory cache would freeze every result for the whole
// tab session, so re-visiting a commander an hour later would still show
// the data from page load.
const CACHE_TTL_MS = 10 * 60 * 1000

async function get(path) {
  const url = `${BASE}${path}`
  const cached = cache.get(url)
  if (cached && Date.now() - cached.time < CACHE_TTL_MS) return cached.data
  const res = await throttledFetch(url)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.details || `Scryfall request failed (${res.status})`)
  }
  const data = await res.json()
  cache.set(url, { data, time: Date.now() })
  return data
}

export function getCardByName(name, { fuzzy = true } = {}) {
  const param = fuzzy ? 'fuzzy' : 'exact'
  return get(`/cards/named?${param}=${encodeURIComponent(name)}`)
}

export function searchCards(query, { order, unique = 'cards', page = 1 } = {}) {
  const params = new URLSearchParams({ q: query, unique })
  if (order) params.set('order', order)
  if (page > 1) params.set('page', String(page))
  return get(`/cards/search?${params.toString()}`)
}

export async function autocomplete(term) {
  if (!term || term.length < 2) return []
  const data = await get(`/cards/autocomplete?q=${encodeURIComponent(term)}`)
  return data.data || []
}

// Cards legal in the Commander format, whose color identity fits inside the
// commander's, ranked by Scryfall's own `edhrec_rank` field — this is public
// per-card metadata Scryfall exposes, not a scrape of EDHREC's site.
// `playstyles` optionally narrows results to cards matching any of the given
// PLAYSTYLE_FILTERS query fragments (see src/data/playstyles.js).
export async function getRecommendedCards(commander, { playstyles = [], limit = 18 } = {}) {
  const identity = (commander.color_identity || []).join('') || 'C'
  const clauses = ['f:commander', `id<=${identity}`, '-is:funny', `-!"${commander.name}"`]
  if (playstyles.length > 0) {
    clauses.push(`(${playstyles.join(' OR ')})`)
  }
  const data = await searchCards(clauses.join(' '), { order: 'edhrec' })
  return (data.data || []).slice(0, limit)
}

// Live "top commanders" query. Uses Scryfall's `is:commander` filter (any
// card legal to be your commander, including partners/backgrounds text) and
// its `edhrec_rank` field for a real popularity ranking — no static list.
// Color filtering is an exact color-identity match (`id=`), so picking W/U
// only shows Azorius commanders, not every commander that merely includes
// white and blue among more colors.
// Returns the raw Scryfall list object (data/has_more/next_page) so callers
// can page through results for infinite scroll.
export function findCommandersPage({ colors = [], order = 'edhrec', page = 1 } = {}) {
  const clauses = ['is:commander', '-is:funny']
  if (colors.length > 0) {
    const ids = colors.includes('C') ? 'c' : colors.join('').toLowerCase()
    clauses.push(`id=${ids}`)
  }
  return searchCards(clauses.join(' '), { order, page })
}

export function cardImage(card, size = 'normal') {
  if (card.image_uris) return card.image_uris[size]
  if (card.card_faces?.[0]?.image_uris) return card.card_faces[0].image_uris[size]
  return null
}

// USD market price from Scryfall's own aggregated pricing data (falls back
// to the foil price for foil-only printings). Returns null if unpriced.
export function cardPrice(card) {
  const p = card.prices || {}
  const usd = p.usd || p.usd_foil
  return usd ? Number(usd) : null
}

export function formatPrice(price) {
  return price == null ? null : `$${price.toFixed(2)}`
}

// Where to buy this printing. TCGplayer/Cardmarket/Cardhoarder come straight
// from Scryfall's own `purchase_uris` (their affiliate links, meant for
// exactly this use). PriceCharting and eBay aren't in Scryfall's data, so
// those are plain search-by-name links instead of a specific listing.
export function getBuyLinks(card) {
  const links = []
  const p = card.purchase_uris || {}
  if (p.tcgplayer) links.push({ id: 'tcgplayer', label: 'TCGplayer', url: p.tcgplayer })
  if (p.cardmarket) links.push({ id: 'cardmarket', label: 'Cardmarket', url: p.cardmarket })
  if (p.cardhoarder) links.push({ id: 'cardhoarder', label: 'Cardhoarder (MTGO)', url: p.cardhoarder })

  const q = encodeURIComponent(card.name)
  links.push({ id: 'pricecharting', label: 'PriceCharting', url: `https://www.pricecharting.com/search-products?q=${q}&type=prices` })
  links.push({ id: 'ebay', label: 'eBay', url: `https://www.ebay.com/sch/i.html?_nkw=${q}+mtg` })

  return links
}

export function canBeCommander(card) {
  const type = card.type_line || card.card_faces?.[0]?.type_line || ''
  if (/Legendary/.test(type) && (/Creature/.test(type) || /Planeswalker/.test(type))) return true
  const text = card.oracle_text || card.card_faces?.[0]?.oracle_text || ''
  return /can be your commander/i.test(text)
}

// Every printing of a card (set, collector number, rarity, etc.), via the
// `prints_search_uri` Scryfall includes on every card object for this exact
// purpose.
export async function getPrintings(card) {
  if (!card.prints_search_uri) return []
  const path = card.prints_search_uri.replace(BASE, '')
  const data = await get(path)
  return data.data || []
}
