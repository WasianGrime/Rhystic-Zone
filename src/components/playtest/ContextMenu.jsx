import { useEffect } from 'react'

// items: [{ label, onClick, danger? } | { divider: true }]
export default function ContextMenu({ x, y, items, onClose }) {
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    function onOutside(e) {
      if (!e.target.closest?.('.pt-menu')) onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onOutside)
    window.addEventListener('blur', onClose)
    window.addEventListener('resize', onClose)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onOutside)
      window.removeEventListener('blur', onClose)
      window.removeEventListener('resize', onClose)
    }
  }, [onClose])

  const rows = items.length
  const left = Math.max(8, Math.min(x, window.innerWidth - 220))
  const top = Math.max(8, Math.min(y, window.innerHeight - rows * 34 - 16))

  return (
    <ul className="pt-menu" style={{ left, top }} role="menu">
      {items.map((item, i) =>
        item.divider ? (
          <li key={`d${i}`} className="pt-menu-divider" role="separator" />
        ) : (
          <li key={item.label} role="none">
            <button
              role="menuitem"
              className={item.danger ? 'danger' : ''}
              onClick={() => {
                item.onClick()
                onClose()
              }}
            >
              {item.label}
            </button>
          </li>
        )
      )}
    </ul>
  )
}
