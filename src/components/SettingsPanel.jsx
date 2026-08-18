import { useEffect, useRef, useState } from 'react'
import { useTheme } from '../context/ThemeContext'
import { ACCENT_THEMES } from '../data/accentThemes'
import { useLocalDecks } from '../hooks/useLocalDecks'

const MODES = [
  { id: 'light', label: 'Day' },
  { id: 'dark', label: 'Night' },
  { id: 'system', label: 'Auto' },
]

export default function SettingsPanel() {
  const [open, setOpen] = useState(false)
  const boxRef = useRef(null)
  const { mode, accent, setMode, setAccent } = useTheme()
  const { decks, clearAll } = useLocalDecks()

  useEffect(() => {
    function onClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function handleClearDecks() {
    if (window.confirm(`Delete all ${decks.length} saved deck${decks.length === 1 ? '' : 's'}? This can't be undone.`)) {
      clearAll()
    }
  }

  return (
    <div className="settings-menu" ref={boxRef}>
      <button className="icon-button" onClick={() => setOpen((o) => !o)} aria-label="Settings">
        <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true">
          <path
            fill="currentColor"
            d="M12 8.5A3.5 3.5 0 1 0 12 15.5 3.5 3.5 0 0 0 12 8.5Zm8.94 3.5a7.94 7.94 0 0 0-.16-1.6l2.02-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.38.96a8 8 0 0 0-1.38-.8l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54a8 8 0 0 0-1.38.8l-2.38-.96a.5.5 0 0 0-.6.22L2.9 8.18a.5.5 0 0 0 .12.64L5.04 10.4A7.94 7.94 0 0 0 4.88 12c0 .55.06 1.08.16 1.6l-2.02 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.13.22.4.31.6.22l2.38-.96c.42.33.88.6 1.38.8l.36 2.54c.04.25.25.42.5.42h3.84c.25 0 .46-.17.5-.42l.36-2.54c.5-.2.96-.47 1.38-.8l2.38.96c.22.09.47 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.02-1.58c.1-.52.16-1.05.16-1.6Z"
          />
        </svg>
      </button>

      {open && (
        <div className="settings-panel">
          <div className="filter-group">
            <label>Appearance</label>
            <div className="segmented-control">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  className={mode === m.id ? 'active' : ''}
                  onClick={() => setMode(m.id)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <label>Accent color</label>
            <div className="accent-swatch-row">
              {ACCENT_THEMES.map((t) => (
                <button
                  key={t.id}
                  className={`accent-swatch ${accent === t.id ? 'active' : ''}`}
                  style={{ background: `linear-gradient(135deg, ${t.accent}, ${t.secondary})` }}
                  onClick={() => setAccent(t.id)}
                  title={t.label}
                  aria-label={t.label}
                />
              ))}
            </div>
          </div>

          <div className="filter-group">
            <label>Data</label>
            <button className="danger-button" onClick={handleClearDecks} disabled={decks.length === 0}>
              Clear all saved decks
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
