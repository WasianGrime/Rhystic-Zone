import { useEffect, useRef, useState } from 'react'
import ManaSymbol from './ManaSymbol'

const COLORS = ['W', 'U', 'B', 'R', 'G']

export default function CommanderFilters({
  order,
  onOrderChange,
  colors,
  onColorsChange,
  set,
  sets,
  onSetChange,
  onClear,
}) {
  const [open, setOpen] = useState(false)
  const [setPickerOpen, setSetPickerOpen] = useState(false)
  const [setQuery, setSetQuery] = useState('')
  const boxRef = useRef(null)

  useEffect(() => {
    function onClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  // Collapse the set picker along with the rest of the panel, so it doesn't
  // reappear already-expanded the next time Filters is opened.
  useEffect(() => {
    if (!open) {
      setSetPickerOpen(false)
      setSetQuery('')
    }
  }, [open])

  useEffect(() => {
    if (!setPickerOpen) return
    function onKeyDown(e) {
      if (e.key === 'Escape') setSetPickerOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [setPickerOpen])

  function pickSet(code) {
    onSetChange(code)
    setSetPickerOpen(false)
    setSetQuery('')
  }

  function toggleColor(c) {
    // Functional update so rapid clicks each build on the latest state
    // instead of racing on a stale `colors` prop from the same render.
    onColorsChange((prev) => {
      if (c === 'C') {
        return prev.includes('C') ? [] : ['C']
      }
      const withoutColorless = prev.filter((x) => x !== 'C')
      return withoutColorless.includes(c)
        ? withoutColorless.filter((x) => x !== c)
        : [...withoutColorless, c]
    })
  }

  const activeCount = colors.length + (order !== 'edhrec' ? 1 : 0) + (set ? 1 : 0)
  const selectedSet = sets.find((s) => s.code === set)
  const visibleSets = setQuery
    ? sets.filter((s) => s.name.toLowerCase().includes(setQuery.toLowerCase()))
    : sets

  return (
    <div className="commander-filters" ref={boxRef}>
      <button className="filter-toggle-button" onClick={() => setOpen((o) => !o)}>
        Filters {activeCount > 0 && <span className="filter-count">{activeCount}</span>}
        <span className="filter-caret">{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div className="filter-panel">
          <div className="filter-group">
            <label htmlFor="sort-order">Sort by</label>
            <select id="sort-order" value={order} onChange={(e) => onOrderChange(e.target.value)}>
              <option value="edhrec">Most popular commander</option>
              <option value="name">Name (A–Z)</option>
              <option value="released">Newest printing</option>
            </select>
          </div>

          <div className="filter-group set-filter-group">
            <label>Set</label>
            <button
              type="button"
              className="set-picker-toggle"
              onClick={() => setSetPickerOpen((o) => !o)}
            >
              {selectedSet?.icon_svg_uri && (
                <span
                  className="set-icon"
                  style={{
                    WebkitMaskImage: `url(${selectedSet.icon_svg_uri})`,
                    maskImage: `url(${selectedSet.icon_svg_uri})`,
                  }}
                />
              )}
              <span className="set-picker-toggle-label">{selectedSet ? selectedSet.name : 'All sets'}</span>
              <span className="filter-caret">{setPickerOpen ? '▴' : '▾'}</span>
            </button>

            {setPickerOpen && (
              <div className="set-picker">
                <div className="set-picker-header">
                  <input
                    type="text"
                    className="set-picker-search"
                    placeholder="Search sets…"
                    value={setQuery}
                    onChange={(e) => setSetQuery(e.target.value)}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="set-picker-close"
                    onClick={() => setSetPickerOpen(false)}
                    aria-label="Close set picker"
                  >
                    ✕
                  </button>
                </div>
                <div className="set-picker-grid">
                  <button
                    type="button"
                    className={`set-picker-item ${!set ? 'active' : ''}`}
                    onClick={() => pickSet('')}
                  >
                    <span className="set-icon set-icon-all">∀</span>
                    <span className="set-picker-name">All sets</span>
                  </button>
                  {visibleSets.map((s) => (
                    <button
                      key={s.code}
                      type="button"
                      className={`set-picker-item ${set === s.code ? 'active' : ''}`}
                      onClick={() => pickSet(s.code)}
                      title={s.name}
                    >
                      {s.icon_svg_uri && (
                        <span
                          className="set-icon"
                          style={{
                            WebkitMaskImage: `url(${s.icon_svg_uri})`,
                            maskImage: `url(${s.icon_svg_uri})`,
                          }}
                        />
                      )}
                      <span className="set-picker-name">{s.name}</span>
                    </button>
                  ))}
                  {visibleSets.length === 0 && (
                    <p className="set-picker-empty">No sets match &ldquo;{setQuery}&rdquo;.</p>
                  )}
                </div>
              </div>
            )}

            {set && order === 'edhrec' && (
              <p className="color-filter-hint">Showing this set&rsquo;s commanders, most popular first.</p>
            )}
          </div>

          <div className="filter-group">
            <label>Color identity</label>
            <div className="color-toggle-row">
              {COLORS.map((c) => (
                <button
                  key={c}
                  className={`color-toggle ${colors.includes(c) ? 'active' : ''}`}
                  onClick={() => toggleColor(c)}
                >
                  <ManaSymbol symbol={c} size={20} />
                </button>
              ))}
              <button
                className={`color-toggle ${colors.includes('C') ? 'active' : ''}`}
                onClick={() => toggleColor('C')}
              >
                <ManaSymbol symbol="C" size={20} />
              </button>
            </div>
            {colors.length > 0 && (
              <p className="color-filter-hint">
                Showing only exact {colors.includes('C') ? 'colorless' : colors.join('/')} commanders.
              </p>
            )}
          </div>

          <button className="filter-clear-button" onClick={onClear}>
            Clear filters
          </button>
        </div>
      )}
    </div>
  )
}
