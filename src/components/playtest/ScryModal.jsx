import { useEffect, useState } from 'react'
import PlaytestCard from './PlaytestCard'

const DESTINATIONS = [
  { id: 'top', label: 'Top' },
  { id: 'bottom', label: 'Bottom' },
  { id: 'graveyard', label: 'Graveyard' },
]

// `cards` are the top N library instances, top first. Cards kept on top keep
// their order; cards sent to the bottom go underneath in the same order.
export default function ScryModal({ cards, onApply, onCancel }) {
  const [dest, setDest] = useState(() => Object.fromEntries(cards.map((i) => [i.uid, 'top'])))

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onCancel])

  return (
    <div className="card-modal-overlay">
      <div className="pt-modal" role="dialog" aria-modal="true" aria-label="Scry">
        <div className="pt-modal-head">
          <h3>Scry {cards.length}</h3>
          <button className="pt-modal-close" onClick={onCancel} aria-label="Cancel scry">
            ✕
          </button>
        </div>
        <p className="section-hint">Choose where each card goes. Cards you keep on top stay in this order.</p>
        <div className="pt-scry-row">
          {cards.map((inst) => (
            <div key={inst.uid} className="pt-scry-card">
              <PlaytestCard inst={inst} />
              <div className="pt-segmented" role="group" aria-label={`Where ${inst.card.name} goes`}>
                {DESTINATIONS.map((d) => (
                  <button
                    key={d.id}
                    className={dest[inst.uid] === d.id ? 'active' : ''}
                    onClick={() => setDest((prev) => ({ ...prev, [inst.uid]: d.id }))}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="pt-modal-footer">
          <button
            className="primary-button"
            onClick={() => onApply(cards.map((i) => ({ uid: i.uid, dest: dest[i.uid] })))}
          >
            Done
          </button>
          <button className="secondary-button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
