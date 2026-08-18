import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { cardImage, getRecommendedCards, getCardByName, cardPrice, formatPrice } from '../api/scryfall'
import { findCombosInDeck, isInfiniteCombo } from '../api/commanderSpellbook'
import { useLocalDecks } from '../hooks/useLocalDecks'
import CardSearchBox from '../components/CardSearchBox'
import ManaCurveChart from '../components/ManaCurveChart'
import ColorDistributionChart from '../components/ColorDistributionChart'
import ColorPips from '../components/ColorPips'
import ManaCost from '../components/ManaCost'
import CardTile from '../components/CardTile'
import BuyLinks from '../components/BuyLinks'
import ComboCard from '../components/ComboCard'
import { PLAYSTYLE_FILTERS } from '../data/playstyles'

const TYPE_ORDER = ['Creature', 'Planeswalker', 'Battle', 'Instant', 'Sorcery', 'Artifact', 'Enchantment', 'Land']

// Fetch a deeper pool per category than we display, so adding a card just
// reveals the next-best pick from the same theme instead of shrinking the row.
const REC_POOL_SIZE = 24
const REC_TOP_DISPLAY = 12
const REC_CATEGORY_DISPLAY = 8
const REC_SECTIONS = [{ id: 'top', label: 'Top Picks', query: null }, ...PLAYSTYLE_FILTERS]

// How long to wait after the deck list stops changing before re-checking
// Commander Spellbook — avoids firing a request on every single card added.
const COMBO_CHECK_DEBOUNCE_MS = 600
const ALMOST_COMBO_DISPLAY = 8

function newDeckId() {
  return crypto.randomUUID ? crypto.randomUUID() : `deck-${Date.now()}`
}

function isBasicLand(card) {
  return /\bBasic Land\b/.test(card.type_line || '')
}

function primaryType(card) {
  const type = card.type_line || card.card_faces?.[0]?.type_line || ''
  for (const t of TYPE_ORDER) {
    if (type.includes(t)) return t
  }
  return 'Other'
}

function groupCards(cards, sortMode) {
  if (sortMode === 'name') {
    return [{ label: null, entries: [...cards].sort((a, b) => a.card.name.localeCompare(b.card.name)) }]
  }
  if (sortMode === 'mv') {
    return [{ label: null, entries: [...cards].sort((a, b) => (a.card.cmc ?? 0) - (b.card.cmc ?? 0)) }]
  }
  const buckets = {}
  cards.forEach((e) => {
    const t = primaryType(e.card)
    ;(buckets[t] ??= []).push(e)
  })
  return [...TYPE_ORDER, 'Other']
    .filter((t) => buckets[t]?.length)
    .map((t) => ({
      label: t,
      entries: buckets[t].sort((a, b) => a.card.name.localeCompare(b.card.name)),
    }))
}

export default function DeckBuilder() {
  const { deckId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { getDeck, upsertDeck, deleteDeck } = useLocalDecks()

  const existing = deckId ? getDeck(deckId) : null
  const passedCommander = location.state?.commander

  const [id] = useState(existing?.id || newDeckId())
  const [deckName, setDeckName] = useState(existing?.name || '')
  const [commander, setCommander] = useState(existing?.commander || passedCommander || null)
  const [cards, setCards] = useState(existing?.cards || []) // [{ card, qty }]
  const [notice, setNotice] = useState(null)
  const [sortMode, setSortMode] = useState('type')

  // One entry per REC_SECTIONS id: { label, cards, loading }. Each section is
  // fetched independently so they fill in as their own request resolves
  // rather than waiting on all of them together.
  const [recSections, setRecSections] = useState({})

  useEffect(() => {
    if (!existing && passedCommander && !deckName) {
      setDeckName(`${passedCommander.name} Deck`)
    }
  }, [passedCommander, existing, deckName])

  const identity = useMemo(() => new Set(commander?.color_identity || []), [commander])

  useEffect(() => {
    if (!commander) {
      setRecSections({})
      return
    }
    let cancelled = false
    setRecSections(
      REC_SECTIONS.reduce((acc, s) => {
        acc[s.id] = { label: s.label, cards: [], loading: true }
        return acc
      }, {})
    )
    REC_SECTIONS.forEach((s) => {
      getRecommendedCards(commander, { playstyles: s.query ? [s.query] : [], limit: REC_POOL_SIZE })
        .then((data) => {
          if (cancelled) return
          setRecSections((prev) => ({ ...prev, [s.id]: { label: s.label, cards: data, loading: false } }))
        })
        .catch(() => {
          if (cancelled) return
          setRecSections((prev) => ({ ...prev, [s.id]: { label: s.label, cards: [], loading: false } }))
        })
    })
    return () => {
      cancelled = true
    }
  }, [commander])

  const [completeCombos, setCompleteCombos] = useState([])
  const [almostCombos, setAlmostCombos] = useState([])
  const [loadingCombos, setLoadingCombos] = useState(false)

  useEffect(() => {
    if (!commander) {
      setCompleteCombos([])
      setAlmostCombos([])
      return
    }
    let cancelled = false
    setLoadingCombos(true)
    const handle = setTimeout(() => {
      findCombosInDeck([commander.name], cards.map((e) => e.card.name))
        .then((results) => {
          if (cancelled) return
          const complete = (results.included || []).filter(isInfiniteCombo)
          const almost = (results.almostIncluded || [])
            .filter(isInfiniteCombo)
            .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
            .slice(0, ALMOST_COMBO_DISPLAY)
          setCompleteCombos(complete)
          setAlmostCombos(almost)
        })
        .catch(() => {
          if (cancelled) return
          setCompleteCombos([])
          setAlmostCombos([])
        })
        .finally(() => {
          if (cancelled) return
          setLoadingCombos(false)
        })
    }, COMBO_CHECK_DEBOUNCE_MS)
    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [commander, cards])

  async function addMissingComboCard(name) {
    try {
      const card = await getCardByName(name)
      addCard(card)
    } catch {
      setNotice(`Couldn't find "${name}" on Scryfall.`)
    }
  }

  function cardFitsIdentity(card) {
    if (!commander) return true
    const cardColors = card.color_identity || []
    return cardColors.every((c) => identity.has(c))
  }

  async function handlePickCommander(card) {
    const isLegendaryCreatureOrPW =
      /Legendary/.test(card.type_line || '') &&
      (/Creature/.test(card.type_line) || /Planeswalker/.test(card.type_line))
    if (!isLegendaryCreatureOrPW) {
      setNotice(`${card.name} isn't a legendary creature or planeswalker, but it's set as your commander anyway.`)
    } else {
      setNotice(null)
    }
    setCommander(card)
  }

  function addCard(card) {
    if (!cardFitsIdentity(card)) {
      setNotice(`${card.name} is outside ${commander.name}'s color identity — not added.`)
      return
    }
    setCards((prev) => {
      const idx = prev.findIndex((e) => e.card.id === card.id)
      if (idx !== -1) {
        if (isBasicLand(card)) {
          const next = [...prev]
          next[idx] = { ...next[idx], qty: next[idx].qty + 1 }
          return next
        }
        setNotice(`${card.name} is already in the deck (Commander decks are singleton).`)
        return prev
      }
      return [...prev, { card, qty: 1 }]
    })
    setNotice(null)
  }

  function removeCard(cardId) {
    setCards((prev) => prev.filter((e) => e.card.id !== cardId))
  }

  function adjustQty(cardId, delta) {
    setCards((prev) =>
      prev
        .map((e) => (e.card.id === cardId ? { ...e, qty: Math.max(1, e.qty + delta) } : e))
        .filter((e) => e.qty > 0)
    )
  }

  function handleSave() {
    if (!deckName.trim()) {
      setNotice('Give your deck a name before saving.')
      return
    }
    upsertDeck({ id, name: deckName.trim(), commander, cards, updatedAt: Date.now() })
    setNotice('Deck saved.')
    navigate(`/builder/${id}`, { replace: true })
  }

  function handleDelete() {
    deleteDeck(id)
    navigate('/decks')
  }

  const totalCards = cards.reduce((sum, e) => sum + e.qty, 0)
  const groupedCards = useMemo(() => groupCards(cards, sortMode), [cards, sortMode])
  const totalValue = useMemo(() => {
    const commanderPrice = commander ? cardPrice(commander) || 0 : 0
    return cards.reduce((sum, e) => sum + (cardPrice(e.card) || 0) * e.qty, commanderPrice)
  }, [cards, commander])
  const inDeckIds = useMemo(() => new Set(cards.map((e) => e.card.id)), [cards])

  function visibleRecs(sectionId, displayCount) {
    const section = recSections[sectionId]
    if (!section) return []
    return section.cards.filter((c) => !inDeckIds.has(c.id)).slice(0, displayCount)
  }

  return (
    <div className="page deck-builder">
      <div className="deck-builder-header">
        <input
          className="deck-name-input"
          value={deckName}
          placeholder="Untitled Deck"
          onChange={(e) => setDeckName(e.target.value)}
        />
        <div className="deck-builder-actions">
          <button className="primary-button" onClick={handleSave}>
            Save deck
          </button>
          {existing && (
            <button className="danger-button" onClick={handleDelete}>
              Delete
            </button>
          )}
        </div>
      </div>

      {notice && <p className="notice">{notice}</p>}

      <div className="deck-builder-grid">
        <section className="deck-commander-panel">
          <h2>Commander</h2>
          {commander ? (
            <div className="deck-commander-card">
              <img src={cardImage(commander, 'large')} alt={commander.name} />
              <div className="deck-commander-info">
                <h3>{commander.name}</h3>
                <ColorPips colors={commander.color_identity} />
                {formatPrice(cardPrice(commander)) && (
                  <p className="card-price-line small">{formatPrice(cardPrice(commander))}</p>
                )}
                <BuyLinks card={commander} />
              </div>
            </div>
          ) : (
            <p className="section-hint">Search for a legendary creature to set as your commander.</p>
          )}
          <CardSearchBox placeholder="Set commander…" onSelect={handlePickCommander} />
        </section>

        <section className="deck-list-panel">
          <div className="deck-list-header">
            <h2>Deck ({totalCards} cards)</h2>
            <div className="deck-list-controls">
              <select value={sortMode} onChange={(e) => setSortMode(e.target.value)} aria-label="Sort deck list">
                <option value="type">Sort by Type</option>
                <option value="name">Sort by Name</option>
                <option value="mv">Sort by Mana Value</option>
              </select>
              <CardSearchBox placeholder="Add a card…" onSelect={addCard} />
            </div>
          </div>
          <ul className="deck-list">
            {groupedCards.map((group, i) => (
              <li key={group.label || i} className="deck-list-group">
                {group.label && (
                  <h4 className="deck-list-group-header">
                    {group.label} ({group.entries.reduce((sum, e) => sum + e.qty, 0)})
                  </h4>
                )}
                <ul className="deck-list-group-rows">
                  {group.entries.map(({ card, qty }) => (
                    <li key={card.id} className="deck-list-row">
                      <span className="deck-list-name">{card.name}</span>
                      <span className="deck-list-type">{card.type_line}</span>
                      <span className="deck-list-mana">
                        <ManaCost cost={card.mana_cost} size={15} />
                      </span>
                      <span className="deck-list-price">{formatPrice(cardPrice(card)) || '—'}</span>
                      {isBasicLand(card) ? (
                        <span className="qty-controls">
                          <button onClick={() => adjustQty(card.id, -1)}>−</button>
                          {qty}
                          <button onClick={() => adjustQty(card.id, 1)}>+</button>
                        </span>
                      ) : (
                        <span className="qty-controls">{qty}</span>
                      )}
                      <button className="remove-button" onClick={() => removeCard(card.id)}>
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
            {cards.length === 0 && <p className="section-hint">No cards yet — search above to add some.</p>}
          </ul>
        </section>

        <section className="deck-stats-panel">
          <h2>Estimated Value</h2>
          <p className="deck-value">{formatPrice(totalValue)}</p>
          <p className="section-hint">USD, Scryfall market prices. Unpriced cards count as $0.</p>
          <h2>Mana Curve</h2>
          <ManaCurveChart cards={cards} />
          <h2>Color Distribution</h2>
          <ColorDistributionChart cards={cards} />
          <DeckExport deckName={deckName} commander={commander} cards={cards} />
        </section>
      </div>

      {commander && (
        <section className="deck-combos">
          <h2>Infinite Combos</h2>
          <p className="section-hint">
            Checked against your current decklist via{' '}
            <a href="https://commanderspellbook.com" target="_blank" rel="noopener noreferrer">
              Commander Spellbook
            </a>
            .
          </p>
          {loadingCombos && <p className="loading-text">Checking for combos…</p>}
          {!loadingCombos && completeCombos.length === 0 && almostCombos.length === 0 && (
            <p className="section-hint">No infinite combos found in your deck yet.</p>
          )}
          {completeCombos.length > 0 && (
            <>
              <h3 className="rec-section-title">✓ Complete in your deck</h3>
              <div className="combo-grid">
                {completeCombos.map((combo) => (
                  <ComboCard key={combo.id} combo={combo} deckCardNames={cards.map((e) => e.card.name)} />
                ))}
              </div>
            </>
          )}
          {almostCombos.length > 0 && (
            <>
              <h3 className="rec-section-title">One card away</h3>
              <div className="combo-grid">
                {almostCombos.map((combo) => (
                  <ComboCard
                    key={combo.id}
                    combo={combo}
                    deckCardNames={cards.map((e) => e.card.name)}
                    onAddMissing={addMissingComboCard}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {commander && (
        <section className="deck-recommendations">
          <h2>Recommended for {commander.name}</h2>
          <p className="section-hint">
            Curated like EDHREC — top overall picks first, then cards grouped by common playstyles for
            this commander. Add one and the row pulls in the next best pick for that group.
          </p>

          <RecommendationRow
            title="Top Picks"
            cards={visibleRecs('top', REC_TOP_DISPLAY)}
            loading={recSections.top?.loading}
            onAdd={addCard}
            grid
          />

          {PLAYSTYLE_FILTERS.map((p) => {
            const visible = visibleRecs(p.id, REC_CATEGORY_DISPLAY)
            const loading = recSections[p.id]?.loading
            if (!loading && visible.length === 0) return null
            return (
              <RecommendationRow key={p.id} title={p.label} cards={visible} loading={loading} onAdd={addCard} />
            )
          })}
        </section>
      )}
    </div>
  )
}

function RecommendationRow({ title, cards, loading, onAdd, grid }) {
  return (
    <div className="rec-section">
      <h3 className="rec-section-title">{title}</h3>
      <div className={grid ? 'card-grid' : 'rec-row'}>
        {cards.map((card) => (
          <CardTile key={card.id} card={card} actionLabel="+ Add" onAction={onAdd} small={!grid} />
        ))}
        {loading && cards.length === 0 && <p className="loading-text">Loading…</p>}
        {!loading && cards.length === 0 && <p className="section-hint">No picks found.</p>}
      </div>
    </div>
  )
}

function DeckExport({ deckName, commander, cards }) {
  const [copied, setCopied] = useState(false)
  const text = useMemo(() => {
    const lines = []
    if (commander) lines.push(`1 ${commander.name} *CMDR*`)
    cards.forEach(({ card, qty }) => lines.push(`${qty} ${card.name}`))
    return lines.join('\n')
  }, [commander, cards])

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="deck-export">
      <h3>Export</h3>
      <textarea readOnly value={text} rows={6} />
      <button onClick={copy}>{copied ? 'Copied!' : 'Copy decklist'}</button>
    </div>
  )
}
