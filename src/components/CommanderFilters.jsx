import { useEffect, useRef, useState } from 'react'
import ManaSymbol from './ManaSymbol'

const COLORS = ['W', 'U', 'B', 'R', 'G']

export default function CommanderFilters({ order, onOrderChange, colors, onColorsChange, onClear }) {
  const [open, setOpen] = useState(false)
  const boxRef = useRef(null)

  useEffect(() => {
    function onClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

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

  const activeCount = colors.length + (order !== 'edhrec' ? 1 : 0)

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
