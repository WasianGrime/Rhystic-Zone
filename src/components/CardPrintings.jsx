import { useState } from 'react'
import { getPrintings, cardImage } from '../api/scryfall'

export default function CardPrintings({ card, onSelectPrinting }) {
  const [open, setOpen] = useState(false)
  const [printings, setPrintings] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function toggle() {
    if (!open && printings === null) {
      setLoading(true)
      setError(null)
      try {
        setPrintings(await getPrintings(card))
      } catch (err) {
        setError(err.message || 'Could not load printings.')
      } finally {
        setLoading(false)
      }
    }
    setOpen((o) => !o)
  }

  return (
    <div className="printings-section">
      <button className="secondary-button" onClick={toggle}>
        {open ? 'Hide all printings' : 'View all printings'}
      </button>

      {open && (
        <div className="printings-panel">
          {loading && <p className="loading-text">Loading printings…</p>}
          {error && <p className="error">{error}</p>}
          {printings && (
            <ul className="printings-list">
              {printings.map((p) => {
                const isCurrent = p.id === card.id
                return (
                  <li key={p.id} className="printing-row">
                    <button
                      className={`printing-row-button ${isCurrent ? 'current' : ''}`}
                      onClick={() => !isCurrent && onSelectPrinting?.(p)}
                      disabled={isCurrent}
                    >
                      <img src={cardImage(p, 'small')} alt={`${p.set_name} printing`} loading="lazy" />
                      <div className="printing-info">
                        <span className="printing-set">
                          {p.set_name} <span className="printing-code">({p.set.toUpperCase()})</span>
                        </span>
                        <span className="printing-meta">
                          #{p.collector_number} · {p.rarity} · {p.released_at?.slice(0, 4)}
                        </span>
                      </div>
                      {isCurrent && <span className="printing-current-badge">Current</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
