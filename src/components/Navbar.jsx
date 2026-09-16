import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import NavSearch from './NavSearch'
import SettingsPanel from './SettingsPanel'

const NAV_ITEMS = [
  { to: '/commanders', label: 'Commanders' },
  { to: '/decks', label: 'My Decks' },
  { to: '/news', label: 'News' },
  { to: '/shop', label: 'Shop' },
]

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  // Close the mobile menu automatically whenever navigation happens.
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  return (
    <header className="navbar">
      <div className="navbar-row">
        <NavLink to="/" className="brand">
          <span className="brand-mark">⟡</span> Rhystic Zone
        </NavLink>
        <NavSearch />
        <nav className="nav-links">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? 'active' : '')}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button
          className="nav-menu-toggle"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            {menuOpen ? (
              <path
                d="M6 6l12 12M18 6L6 18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            ) : (
              <path
                d="M4 7h16M4 12h16M4 17h16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            )}
          </svg>
        </button>
        <SettingsPanel />
      </div>

      {menuOpen && (
        <nav className="nav-links-mobile">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? 'active' : '')}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  )
}
