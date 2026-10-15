import { useEffect, useState } from 'react'
import { cardImage, getCardsByIds, searchCards } from '../../api/scryfall'

const MAX_DECK_TOKENS = 40

function TokenTile({ card, count, onPick }) {
  return (
    <button className="pt-token-tile" onClick={() => onPick(card)} title={`Add ${card.name}`}>
      <img src={cardImage(card, 'normal')} alt={card.name} loading="lazy" />
      {count > 0 && <span className="pt-token-added">×{count}</span>}
    </button>
  )
}

export default function TokenModal({ deckCards, onPick, onClose }) {
  const [deckTokens, setDeckTokens] = useState(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const [added, setAdded] = useState({})

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  // Tokens the deck's own cards create, from Scryfall's related-card data.
  useEffect(() => {
    const idsByName = new Map()
    deckCards.forEach((card) =>
      (card.all_parts || []).forEach((part) => {
        if (part.component === 'token' && !idsByName.has(part.name)) idsByName.set(part.name, part.id)
      })
    )
    let cancelled = false
    getCardsByIds([...idsByName.values()].slice(0, MAX_DECK_TOKENS))
      .then((cards) => !cancelled && setDeckTokens(cards))
      .catch(() => !cancelled && setDeckTokens([]))
    return () => {
      cancelled = true
    }
  }, [deckCards])

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults(null)
      return
    }
    let cancelled = false
    setSearching(true)
    const handle = setTimeout(() => {
      searchCards(`t:token name:"${q.replace(/"/g, '')}"`)
        .then((data) => !cancelled && setResults(data.data || []))
        .catch(() => !cancelled && setResults([]))
        .finally(() => !cancelled && setSearching(false))
    }, 350)
    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [query])

  function pick(card) {
    setAdded((prev) => ({ ...prev, [card.id]: (prev[card.id] || 0) + 1 }))
    onPick(card)
  }

  return (
    <div className="card-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pt-modal" role="dialog" aria-modal="true" aria-label="Add a token">
        <div className="pt-modal-head">
          <h3>Add a token</h3>
          <button className="pt-modal-close" onClick={onClose} aria-label="Close token picker">
            ✕
          </button>
        </div>

        <h4 className="pt-modal-subhead">From your deck</h4>
        <div className="pt-token-grid">
          {deckTokens === null && <p className="loading-text">Looking up your deck&rsquo;s tokens…</p>}
          {deckTokens?.length === 0 && <p className="section-hint">None of your cards list tokens.</p>}
          {deckTokens?.map((card) => (
            <TokenTile key={card.id} card={card} count={added[card.id]} onPick={pick} />
          ))}
        </div>

        <h4 className="pt-modal-subhead">Search all tokens</h4>
        <input
          className="pt-token-search"
          type="text"
          value={query}
          placeholder="Treasure, Soldier, Zombie…"
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search tokens"
        />
        <div className="pt-token-grid">
          {searching && <p className="loading-text">Searching…</p>}
          {!searching && results?.length === 0 && <p className="section-hint">No tokens found.</p>}
          {results?.map((card) => (
            <TokenTile key={card.id} card={card} count={added[card.id]} onPick={pick} />
          ))}
        </div>
      </div>
    </div>
  )
}
