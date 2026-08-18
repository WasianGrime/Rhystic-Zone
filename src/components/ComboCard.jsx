import { useState } from 'react'
import { comboProduces, comboUrl } from '../api/commanderSpellbook'

export default function ComboCard({ combo, deckCardNames, onAddMissing }) {
  const [showSteps, setShowSteps] = useState(false)
  const deckNames = new Set((deckCardNames || []).map((n) => n.toLowerCase()))
  const produces = comboProduces(combo).join(' • ')

  return (
    <div className="combo-card">
      <ul className="combo-pieces">
        {combo.uses.map((u) => {
          const inDeck = deckNames.has(u.card.name.toLowerCase())
          return (
            <li key={u.card.id} className={`combo-piece ${inDeck ? 'have' : 'need'}`}>
              <span>{u.card.name}</span>
              {!inDeck && onAddMissing && (
                <button onClick={() => onAddMissing(u.card.name)}>+ Add</button>
              )}
            </li>
          )
        })}
      </ul>
      <p className="combo-produces">⚡ {produces}</p>
      {(combo.easyPrerequisites || combo.notablePrerequisites) && (
        <p className="combo-prereqs">
          {combo.easyPrerequisites} {combo.notablePrerequisites}
        </p>
      )}
      <button className="combo-steps-toggle" onClick={() => setShowSteps((s) => !s)}>
        {showSteps ? 'Hide steps' : 'Show steps'}
      </button>
      {showSteps && (
        <ol className="combo-steps">
          {combo.description
            .split('\n')
            .filter(Boolean)
            .map((step, i) => (
              <li key={i}>{step}</li>
            ))}
        </ol>
      )}
      <a className="combo-link" href={comboUrl(combo.id)} target="_blank" rel="noopener noreferrer">
        View on Commander Spellbook →
      </a>
    </div>
  )
}
