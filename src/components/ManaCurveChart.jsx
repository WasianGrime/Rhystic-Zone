export default function ManaCurveChart({ cards }) {
  const buckets = new Array(8).fill(0) // 0,1,2,3,4,5,6,7+
  cards.forEach(({ card, qty }) => {
    if (/\bland\b/i.test(card.type_line || '')) return
    const cmc = Math.min(Math.floor(card.cmc ?? 0), 7)
    buckets[cmc] += qty
  })
  const max = Math.max(1, ...buckets)

  return (
    <div className="mana-curve">
      {buckets.map((count, cmc) => (
        <div className="mana-curve-col" key={cmc}>
          <div className="mana-curve-bar-track">
            <div
              className="mana-curve-bar"
              style={{ height: `${(count / max) * 100}%` }}
              title={`${count} card${count === 1 ? '' : 's'}`}
            />
          </div>
          <span className="mana-curve-count">{count || ''}</span>
          <span className="mana-curve-label">{cmc === 7 ? '7+' : cmc}</span>
        </div>
      ))}
    </div>
  )
}
