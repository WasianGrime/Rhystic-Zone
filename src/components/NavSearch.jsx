import { useNavigate } from 'react-router-dom'
import CardSearchBox from './CardSearchBox'

export default function NavSearch() {
  const navigate = useNavigate()

  function handleSelect(card) {
    navigate(`/commander/${encodeURIComponent(card.name)}`)
  }

  function handleSearchAll(term) {
    navigate(`/search?q=${encodeURIComponent(term)}`)
  }

  return (
    <div className="nav-search">
      <CardSearchBox
        placeholder="Search cards & commanders… (Enter to see all matches)"
        onSelect={handleSelect}
        onSearchAll={handleSearchAll}
      />
    </div>
  )
}
