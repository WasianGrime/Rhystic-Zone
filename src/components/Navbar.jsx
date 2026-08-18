import { NavLink } from 'react-router-dom'
import NavSearch from './NavSearch'
import SettingsPanel from './SettingsPanel'

export default function Navbar() {
  return (
    <header className="navbar">
      <NavLink to="/" className="brand">
        <span className="brand-mark">⟡</span> Rhystic Zone
      </NavLink>
      <NavSearch />
      <nav className="nav-links">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
          Commanders
        </NavLink>
        <NavLink to="/decks" className={({ isActive }) => (isActive ? 'active' : '')}>
          My Decks
        </NavLink>
        <NavLink to="/news" className={({ isActive }) => (isActive ? 'active' : '')}>
          News
        </NavLink>
        <NavLink to="/builder" className={({ isActive }) => (isActive ? 'active' : '')}>
          New Deck
        </NavLink>
      </nav>
      <SettingsPanel />
    </header>
  )
}
