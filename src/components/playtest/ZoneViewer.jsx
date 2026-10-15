import { useEffect } from 'react'
import PlaytestCard from './PlaytestCard'

export default function ZoneViewer({ title, instances, hint, onCardClick, onClose, footer }) {
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="card-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pt-modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="pt-modal-head">
          <h3>
            {title} ({instances.length})
          </h3>
          <button className="pt-modal-close" onClick={onClose} aria-label={`Close ${title}`}>
            ✕
          </button>
        </div>
        {hint && <p className="section-hint">{hint}</p>}
        <div className="pt-viewer-grid">
          {instances.map((inst) => (
            <button
              key={inst.uid}
              className="pt-viewer-card"
              title={inst.card.name}
              onClick={(e) => onCardClick(inst, e)}
            >
              <PlaytestCard inst={{ ...inst, faceDown: false, tapped: false }} />
            </button>
          ))}
          {instances.length === 0 && <p className="section-hint">Nothing here.</p>}
        </div>
        {footer && <div className="pt-modal-footer">{footer}</div>}
      </div>
    </div>
  )
}
