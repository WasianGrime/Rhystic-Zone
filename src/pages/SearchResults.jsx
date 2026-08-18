import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { searchCards } from '../api/scryfall'
import CardTile from '../components/CardTile'

export default function SearchResults() {
  const [params] = useSearchParams()
  const query = params.get('q') || ''
  const navigate = useNavigate()

  const [results, setResults] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setResults([])
    setTotal(0)

    if (!query.trim()) {
      setLoading(false)
      return
    }

    searchCards(query, { order: 'name' })
      .then((data) => {
        if (cancelled) return
        setResults(data.data || [])
        setTotal(data.total_cards || (data.data || []).length)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'No cards found.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [query])

  return (
    <div className="page">
      <section className="hero">
        <h1>Search results</h1>
        <p>
          Every card matching &ldquo;{query}&rdquo;
          {!loading && !error && total > 0 && ` — ${total} card${total === 1 ? '' : 's'}`}.
        </p>
      </section>

      {loading && <p className="loading-text">Searching…</p>}
      {error && <p className="section-hint">No cards found matching &ldquo;{query}&rdquo;.</p>}
      {!loading && !error && results.length === 0 && query && (
        <p className="section-hint">No cards found matching &ldquo;{query}&rdquo;.</p>
      )}

      <div className="card-grid">
        {results.map((card) => (
          <CardTile
            key={card.id}
            card={card}
            onClick={() => navigate(`/commander/${encodeURIComponent(card.name)}`)}
          />
        ))}
      </div>
    </div>
  )
}
