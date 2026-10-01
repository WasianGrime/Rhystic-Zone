// Lets the Top Commanders grid remember where you left off — filters,
// already-loaded results, and scroll position — when you click into a
// commander and come back, instead of refetching page 1 from scratch.
// A plain module-level variable is enough here: it survives for the life
// of the SPA session and is naturally cleared on a full page reload.
let cache = null

export function saveCommanderBrowseState(state) {
  cache = state
}

export function getCommanderBrowseState() {
  return cache
}
