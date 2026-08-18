import ManaSymbol from './ManaSymbol'

const COLOR_FILL = {
  W: '#efe8d2',
  U: '#7bb6e8',
  B: '#9a8fa3',
  R: '#e8967a',
  G: '#9bcf8f',
}

const COLOR_ORDER = ['W', 'U', 'B', 'R', 'G']

function isLand(card) {
  return /\bLand\b/.test(card.type_line || card.card_faces?.[0]?.type_line || '')
}

export default function ColorDistributionChart({ cards }) {
  const counts = { W: 0, U: 0, B: 0, R: 0, G: 0 }

  cards.forEach(({ card, qty }) => {
    if (isLand(card)) return
    const cost = card.mana_cost || card.card_faces?.[0]?.mana_cost || ''
    const symbols = [...cost.matchAll(/\{([^}]+)\}/g)].map((m) => m[1])
    symbols.forEach((s) => {
      s.split('/').forEach((part) => {
        if (counts[part] !== undefined) counts[part] += qty
      })
    })
  })

  const total = COLOR_ORDER.reduce((sum, c) => sum + counts[c], 0)

  if (total === 0) {
    return <p className="section-hint">Add colored cards to see your mana distribution.</p>
  }

  const present = COLOR_ORDER.filter((c) => counts[c] > 0)

  return (
    <div className="color-distribution">
      <div className="color-distribution-bar">
        {present.map((c) => (
          <div
            key={c}
            className="color-distribution-segment"
            style={{ width: `${(counts[c] / total) * 100}%`, background: COLOR_FILL[c] }}
            title={`${c}: ${counts[c]} symbol${counts[c] === 1 ? '' : 's'}`}
          />
        ))}
      </div>
      <ul className="color-distribution-legend">
        {present.map((c) => (
          <li key={c}>
            <ManaSymbol symbol={c} size={16} />
            <span>{Math.round((counts[c] / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
