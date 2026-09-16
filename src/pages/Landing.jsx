import { Link, useNavigate } from 'react-router-dom'
import CardSearchBox from '../components/CardSearchBox'
import FallingCards from '../components/FallingCards'

export default function Landing() {
  const navigate = useNavigate()

  function handleSelect(card) {
    navigate(`/commander/${encodeURIComponent(card.name)}`)
  }

  function handleSearchAll(term) {
    navigate(`/search?q=${encodeURIComponent(term)}`)
  }

  return (
    <div className="landing">
      <FallingCards />
      <div className="landing-content">
        <span className="landing-logo-mark rise" style={{ animationDelay: '0ms' }}>
          ⟡
        </span>
        <h1 className="landing-title rise" style={{ animationDelay: '90ms' }}>
          Rhystic Zone
        </h1>
        <p className="landing-tagline rise" style={{ animationDelay: '180ms' }}>
          Browse Commander staples, build a deck against live data, and uncover infinite combos.
        </p>
        <div className="landing-search rise" style={{ animationDelay: '270ms' }}>
          <CardSearchBox
            placeholder="Search for any card or commander… (Enter to see all matches)"
            onSelect={handleSelect}
            onSearchAll={handleSearchAll}
          />
        </div>
        <Link to="/commanders" className="primary-button landing-cta rise" style={{ animationDelay: '360ms' }}>
          Browse Top Commanders →
        </Link>
      </div>
    </div>
  )
}
