// Real, verified search URL patterns — no product API exists for TCG
// accessories, so "shopping" here builds a live search on each marketplace.
export function tcgplayerSearchUrl(query) {
  return `https://www.tcgplayer.com/search/all/product?q=${encodeURIComponent(query)}`
}

export function ebaySearchUrl(query) {
  return `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}`
}

export function amazonSearchUrl(query) {
  return `https://www.amazon.com/s?k=${encodeURIComponent(query)}`
}
