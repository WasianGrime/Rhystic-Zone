import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getCardByName, getRecommendedCards, cardImage, canBeCommander, cardPrice, formatPrice } from '../api/scryfall'
import CardTile from '../components/CardTile'
import ColorPips from '../components/ColorPips'
import ManaCost from '../components/ManaCost'
import CardPrintings from '../components/CardPrintings'
import BuyLinks from '../components/BuyLinks'
import ComboCard from '../components/ComboCard'
import { getPotentialInfiniteCombos } from '../api/commanderSpellbook'

export default function CommanderDetail() {
  const { name } = useParams()
  const navigate = useNavigate()
  const [commander, setCommander] = useState(null)
  const [recs, setRecs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [combos, setCombos] = useState([])
  const [loadingCombos, setLoadingCombos] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setCommander(null)
    setRecs([])

    async function load() {
      try {
        const card = await getCardByName(name)
        if (cancelled) return
        setCommander(card)
        const recommended = await getRecommendedCards(card)
        if (!cancelled) setRecs(recommended)
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [name])

  useEffect(() => {
    if (!commander) {
      setCombos([])
      return
    }
    let cancelled = false
    setLoadingCombos(true)
    getPotentialInfiniteCombos(commander.color_identity)
      .then((data) => {
        if (!cancelled) setCombos(data)
      })
      .catch(() => {
        if (!cancelled) setCombos([])
      })
      .finally(() => {
        if (!cancelled) setLoadingCombos(false)
      })
    return () => {
      cancelled = true
    }
  }, [commander && (commander.color_identity || []).join('')])

  function startDeck() {
    navigate('/builder', { state: { commander } })
  }

  function handleSelectPrinting(printing) {
    setCommander(printing)
  }

  if (loading) return <div className="page loading-text">Loading commander…</div>
  if (error) return <div className="page error">{error}</div>
  if (!commander) return null

  const face = commander.card_faces?.[0]

  return (
    <div className="page commander-detail">
      <div className="commander-detail-top">
        <img className="commander-detail-art" src={cardImage(commander, 'large')} alt={commander.name} />
        <div className="commander-detail-info">
          <h1>{commander.name}</h1>
          <ColorPips colors={commander.color_identity} />
          <p className="type-line">{commander.type_line || face?.type_line}</p>
          <p className="mana-cost">
            <ManaCost cost={commander.mana_cost || face?.mana_cost} size={22} />
          </p>
          <p className="oracle-text">
            {(commander.oracle_text || face?.oracle_text || '').split('\n').map((line, i) => (
              <span key={i}>
                {line}
                <br />
              </span>
            ))}
          </p>
          {(commander.power || face?.power) && (
            <p className="pt">
              {commander.power ?? face?.power}/{commander.toughness ?? face?.toughness}
            </p>
          )}
          {formatPrice(cardPrice(commander)) && (
            <p className="card-price-line">{formatPrice(cardPrice(commander))} <span>USD, Scryfall market price</span></p>
          )}
          <BuyLinks card={commander} />
          {canBeCommander(commander) && (
            <button className="primary-button" onClick={startDeck}>
              Start a deck with this commander
            </button>
          )}
          <CardPrintings card={commander} onSelectPrinting={handleSelectPrinting} />
        </div>
      </div>

      <section>
        <h2>Recommended cards</h2>
        <p className="section-hint">
          Cards legal in Commander, within {commander.name}&rsquo;s color identity, ranked by
          Scryfall&rsquo;s EDHREC popularity data.
        </p>
        <div className="card-grid">
          {recs.map((card) => (
            <CardTile
              key={card.id}
              card={card}
              onClick={() => navigate(`/commander/${encodeURIComponent(card.name)}`)}
            />
          ))}
          {recs.length === 0 && <p className="loading-text">Loading recommendations…</p>}
        </div>
      </section>

      <section>
        <h2>Infinite Combos</h2>
        <p className="section-hint">
          Popular infinite combos legal within {commander.name}&rsquo;s color identity, via{' '}
          <a href="https://commanderspellbook.com" target="_blank" rel="noopener noreferrer">
            Commander Spellbook
          </a>
          .
        </p>
        <div className="combo-grid">
          {combos.map((combo) => (
            <ComboCard key={combo.id} combo={combo} deckCardNames={[]} />
          ))}
          {loadingCombos && <p className="loading-text">Loading combos…</p>}
          {!loadingCombos && combos.length === 0 && (
            <p className="section-hint">No known infinite combos in this color identity yet.</p>
          )}
        </div>
      </section>
    </div>
  )
}
