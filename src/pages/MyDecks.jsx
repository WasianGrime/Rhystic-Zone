import { Link } from 'react-router-dom'
import { useLocalDecks } from '../hooks/useLocalDecks'
import { cardImage } from '../api/scryfall'

export default function MyDecks() {
  const { decks, deleteDeck } = useLocalDecks()

  return (
    <div className="page">
      <div className="hero">
        <h1>My Decks</h1>
        <p>Decks are saved locally in this browser.</p>
      </div>

      {decks.length === 0 && (
        <p className="section-hint">
          No decks yet. Head to a <Link to="/">commander</Link> and start one.
        </p>
      )}

      <div className="deck-summary-grid">
        {decks
          .slice()
          .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
          .map((deck) => (
            <div key={deck.id} className="deck-summary-card">
              {deck.commander && (
                <img src={cardImage(deck.commander, 'small')} alt={deck.commander.name} />
              )}
              <div className="deck-summary-info">
                <h3>{deck.name}</h3>
                <p>{deck.commander?.name || 'No commander set'}</p>
                <p className="section-hint">{deck.cards?.length || 0} unique cards</p>
                <div className="deck-summary-actions">
                  <Link to={`/builder/${deck.id}`}>Edit</Link>
                  <button className="danger-button" onClick={() => deleteDeck(deck.id)}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
