// Curated "how people build around this commander" filters. Scryfall has no
// archetype/playstyle tagging, so each one is approximated as an oracle-text
// search fragment layered on top of the normal color-identity recommendation
// query. Phrases are chosen so they appear as a contiguous substring in real
// card text (e.g. "damage to target creature" survives a number in between
// "deals" and "damage", so "deals damage" itself is avoided).
export const PLAYSTYLE_FILTERS = [
  { id: 'ramp', label: 'Ramp', query: '(o:"add {" OR o:"search your library for a basic land")' },
  {
    id: 'removal',
    label: 'Removal',
    query: '(o:"destroy target" OR o:"exile target" OR o:"damage to target creature" OR o:"damage to any target")',
  },
  { id: 'draw', label: 'Card Draw', query: 'o:"draw a card"' },
  { id: 'counters', label: 'Counterspells', query: '(t:instant o:"counter target spell")' },
  { id: 'tokens', label: 'Tokens', query: '(o:create o:token)' },
  { id: 'lifegain', label: 'Lifegain', query: '(o:gain o:life)' },
  { id: 'reanimator', label: 'Reanimator', query: '(o:graveyard o:"return target creature card")' },
  {
    id: 'aristocrats',
    label: 'Aristocrats',
    query: '(o:sacrifice o:creature OR o:"creature you control dies")',
  },
  { id: 'stax', label: 'Stax', query: `(o:"players can't" OR o:"opponents can't")` },
]
