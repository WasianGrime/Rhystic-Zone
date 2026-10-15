import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  cardImage,
  getRecommendedCards,
  getCardByName,
  getBestPrinting,
  resolveCardRequests,
  canBeCommander,
  cardPrice,
  formatPrice,
} from '../api/scryfall'
import { parseDecklist } from '../utils/parseDecklist'
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
import CardPrintings from '../components/CardPrintings'
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

function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

// Basics and "any number of cards named" cards can exceed one copy.
function isStackable(card) {
  return isBasicLand(card) || /any number of cards named/i.test(card.oracle_text || '')
}

// Adds a card to a deck/sideboard list, merging by name so a second printing
// of the same card never creates a second row.
function addToList(list, card, qty) {
  const idx = list.findIndex((e) => e.card.name === card.name)
  if (idx === -1) return [...list, { card, qty: isStackable(card) ? qty : 1 }]
  if (!isStackable(card)) return list
  const next = [...list]
  next[idx] = { ...next[idx], qty: next[idx].qty + qty }
  return next
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
  const [sideboard, setSideboard] = useState(existing?.sideboard || []) // [{ card, qty }]
  const [selected, setSelected] = useState(null) // { cardId, zone: 'main' | 'sideboard' }
  const [showImport, setShowImport] = useState(Boolean(location.state?.openImport))
  const [importing, setImporting] = useState(false)

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
    // Quietly upgrade to the best-looking printing once it's known.
    const best = await getBestPrinting(card)
    if (best && best.id !== card.id) setCommander(best)
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

  // Adds a pasted decklist to this deck. Resolves to true when something was
  // imported, so the panel knows it can close.
  async function handleImport(text) {
    const { entries, skippedCount } = parseDecklist(text)
    if (entries.length === 0) {
      setNotice('Couldn’t find any cards in that list. Paste one card per line, like "1 Sol Ring".')
      return false
    }

    setImporting(true)
    let resolved
    try {
      resolved = await resolveCardRequests(entries)
    } catch {
      setNotice('Couldn’t reach Scryfall to look up that list. Try again in a moment.')
      return false
    } finally {
      setImporting(false)
    }

    const missing = entries.filter((_, i) => !resolved[i]).map((e) => e.name)

    let commanderIndex = entries.findIndex((e, i) => e.isCommander && resolved[i])
    let assumedCommander = false
    if (commanderIndex === -1) {
      commanderIndex = entries.findIndex((e, i) => e.maybeCommander && resolved[i] && canBeCommander(resolved[i]))
      assumedCommander = commanderIndex !== -1
    }
    const newCommander = commanderIndex !== -1 ? resolved[commanderIndex] : null

    // Merge by card name so different printings of the same basic land (or a
    // re-import) collapse into one row. Commander decks are singleton, apart
    // from basics and "any number of cards named" cards.
    const merged = new Map(cards.map((e) => [e.card.name, e]))
    let duplicates = 0
    entries.forEach((entry, i) => {
      const card = resolved[i]
      if (!card || i === commanderIndex) return
      const stackable = isStackable(card)
      const current = merged.get(card.name)
      if (!current) {
        merged.set(card.name, { card, qty: stackable ? entry.qty : 1 })
        if (!stackable) duplicates += entry.qty - 1
      } else if (stackable) {
        merged.set(card.name, { ...current, qty: current.qty + entry.qty })
      } else {
        duplicates += entry.qty
      }
    })
    const nextCards = [...merged.values()]
    const added = nextCards.reduce((sum, e) => sum + e.qty, 0) - totalCards

    setCards(nextCards)
    if (newCommander) {
      setCommander(newCommander)
      // The list didn't pin a printing, so quietly upgrade to the best-looking one.
      if (!entries[commanderIndex].set) {
        getBestPrinting(newCommander).then((best) => {
          if (best && best.id !== newCommander.id) setCommander(best)
        })
      }
    }
    const finalCommander = newCommander || commander
    if (!deckName.trim() && finalCommander) setDeckName(`${finalCommander.name} Deck`)

    const parts = [`Imported ${plural(added, 'card')}.`]
    if (newCommander) {
      parts.push(
        assumedCommander
          ? `Using ${newCommander.name} as your commander (it was listed on its own at the top).`
          : `Commander: ${newCommander.name}.`
      )
    } else if (!commander) {
      parts.push('No commander was marked in that list — set one in the Commander box.')
    }
    if (missing.length > 0) {
      const shown = missing.slice(0, 5).join(', ')
      const more = missing.length > 5 ? `, +${missing.length - 5} more` : ''
      parts.push(`Couldn’t find ${plural(missing.length, 'card')}: ${shown}${more}.`)
    }
    if (duplicates > 0) {
      const copies = duplicates === 1 ? '1 duplicate copy' : `${duplicates} duplicate copies`
      parts.push(`Skipped ${copies} (Commander decks are singleton).`)
    }
    if (skippedCount > 0) parts.push(`Left out ${plural(skippedCount, 'sideboard/maybeboard card')}.`)
    if (finalCommander) {
      const identitySet = new Set(finalCommander.color_identity || [])
      const outside = nextCards.filter((e) => !(e.card.color_identity || []).every((c) => identitySet.has(c))).length
      if (outside > 0) parts.push(`${plural(outside, 'card')} outside ${finalCommander.name}’s color identity.`)
    }
    parts.push('Save the deck to keep it.')
    setNotice(parts.join(' '))
    return true
  }

  function removeFromSideboard(cardId) {
    setSideboard((prev) => prev.filter((e) => e.card.id !== cardId))
  }

  function moveToSideboard(entry) {
    setCards((prev) => prev.filter((e) => e.card.id !== entry.card.id))
    setSideboard((prev) => addToList(prev, entry.card, entry.qty))
    setSelected(null)
    setNotice(`${entry.card.name} moved to the sideboard.`)
  }

  function moveToMain(entry) {
    if (!cardFitsIdentity(entry.card)) {
      setNotice(`${entry.card.name} is outside ${commander.name}’s color identity — it stays in the sideboard.`)
      setSelected(null)
      return
    }
    const alreadyIn = !isStackable(entry.card) && cards.some((e) => e.card.name === entry.card.name)
    setSideboard((prev) => prev.filter((e) => e.card.id !== entry.card.id))
    setCards((prev) => addToList(prev, entry.card, entry.qty))
    setSelected(null)
    setNotice(
      alreadyIn
        ? `${entry.card.name} was already in the main deck, so the sideboard copy was dropped.`
        : `${entry.card.name} moved to the main deck.`
    )
  }

  // Promotes a card to commander. The previous commander (if any) drops into
  // the main deck, matching how the other deck sites handle a swap.
  function makeCommander(entry, zone) {
    const previous = commander
    const takeOne = (prev) =>
      entry.qty > 1
        ? prev.map((e) => (e.card.id === entry.card.id ? { ...e, qty: e.qty - 1 } : e))
        : prev.filter((e) => e.card.id !== entry.card.id)

    if (zone === 'main') {
      setCards((prev) => {
        const next = takeOne(prev)
        return previous ? addToList(next, previous, 1) : next
      })
    } else {
      setSideboard(takeOne)
      if (previous) setCards((prev) => addToList(prev, previous, 1))
    }
    setCommander(entry.card)
    setSelected(null)

    const identitySet = new Set(entry.card.color_identity || [])
    const mainCards = cards.filter((e) => e.card.id !== entry.card.id).map((e) => e.card)
    if (previous) mainCards.push(previous)
    const outside = mainCards.filter((c) => !(c.color_identity || []).every((x) => identitySet.has(x))).length
    const parts = [`${entry.card.name} is now your commander.`]
    if (previous) parts.push(`${previous.name} moved to the main deck.`)
    if (outside > 0) parts.push(`${plural(outside, 'card')} now outside its color identity.`)
    setNotice(parts.join(' '))
  }

  function changePrinting(zone, entry, printing) {
    const list = zone === 'main' ? cards : sideboard
    if (list.some((e) => e.card.id === printing.id)) {
      setNotice('That printing is already in this list.')
      return
    }
    const swap = (prev) => prev.map((e) => (e.card.id === entry.card.id ? { ...e, card: printing } : e))
    if (zone === 'main') setCards(swap)
    else setSideboard(swap)
    setSelected({ cardId: printing.id, zone })
  }

  function handleSave() {
    if (!deckName.trim()) {
      setNotice('Give your deck a name before saving.')
      return
    }
    upsertDeck({ id, name: deckName.trim(), commander, cards, sideboard, updatedAt: Date.now() })
    navigate('/decks')
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
  const selectedEntry = selected
    ? (selected.zone === 'main' ? cards : sideboard).find((e) => e.card.id === selected.cardId)
    : null

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
          <button className="secondary-button" onClick={() => setShowImport((open) => !open)}>
            Import decklist
          </button>
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

      {showImport && (
        <DeckImport importing={importing} onImport={handleImport} onClose={() => setShowImport(false)} />
      )}

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
                  {group.entries.map((entry) => (
                    <DeckRow
                      key={entry.card.id}
                      entry={entry}
                      onOpen={() => setSelected({ cardId: entry.card.id, zone: 'main' })}
                      onAdjustQty={adjustQty}
                      onRemove={removeCard}
                    />
                  ))}
                </ul>
              </li>
            ))}
            {cards.length === 0 && <p className="section-hint">No cards yet — search above to add some.</p>}
          </ul>
          {sideboard.length > 0 && (
            <div className="deck-sideboard">
              <h4 className="deck-list-group-header">
                Sideboard ({sideboard.reduce((sum, e) => sum + e.qty, 0)})
              </h4>
              <ul className="deck-list-group-rows">
                {[...sideboard]
                  .sort((a, b) => a.card.name.localeCompare(b.card.name))
                  .map((entry) => (
                    <DeckRow
                      key={entry.card.id}
                      entry={entry}
                      onOpen={() => setSelected({ cardId: entry.card.id, zone: 'sideboard' })}
                      onRemove={removeFromSideboard}
                    />
                  ))}
              </ul>
            </div>
          )}
        </section>

        <section className="deck-stats-panel">
          <h2>Estimated Value</h2>
          <p className="deck-value">{formatPrice(totalValue)}</p>
          <p className="section-hint">USD, Scryfall market prices. Unpriced cards count as $0.</p>
          <h2>Mana Curve</h2>
          <ManaCurveChart cards={cards} />
          <h2>Color Distribution</h2>
          <ColorDistributionChart cards={cards} />
          <DeckExport deckName={deckName} commander={commander} cards={cards} sideboard={sideboard} />
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
      {selectedEntry && (
        <CardOptionsModal
          entry={selectedEntry}
          zone={selected.zone}
          canMakeCommander={canBeCommander(selectedEntry.card)}
          onClose={() => setSelected(null)}
          onMakeCommander={() => makeCommander(selectedEntry, selected.zone)}
          onMoveToSideboard={() => moveToSideboard(selectedEntry)}
          onMoveToMain={() => moveToMain(selectedEntry)}
          onRemove={() => {
            if (selected.zone === 'main') removeCard(selectedEntry.card.id)
            else removeFromSideboard(selectedEntry.card.id)
            setSelected(null)
          }}
          onSelectPrinting={(printing) => changePrinting(selected.zone, selectedEntry, printing)}
        />
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

function DeckImport({ importing, onImport, onClose }) {
  const [text, setText] = useState('')

  async function submit() {
    if (!text.trim() || importing) return
    const ok = await onImport(text)
    if (ok) {
      setText('')
      onClose()
    }
  }

  return (
    <section className="deck-import-panel">
      <h2>Import a decklist</h2>
      <p className="section-hint">
        Paste a list from Moxfield, Archidekt, MTGGoldfish, EDHREC, Deckstats, or an Arena/MTGO export.
        Quantities, set codes, and commander tags are picked up automatically, and the cards are added to
        this deck.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        placeholder={`1 Atraxa, Praetors' Voice *CMDR*\n1 Sol Ring\n1 Arcane Signet\n1x Command Tower (cmm) 350\n...`}
        aria-label="Decklist to import"
      />
      <div className="deck-import-actions">
        <button className="primary-button" onClick={submit} disabled={importing || !text.trim()}>
          {importing ? 'Importing…' : 'Import'}
        </button>
        <button className="secondary-button" onClick={onClose} disabled={importing}>
          Cancel
        </button>
      </div>
    </section>
  )
}

function DeckRow({ entry: { card, qty }, onOpen, onAdjustQty, onRemove }) {
  // Row clicks open the card options; the controls inside must not.
  const stop = (fn) => (e) => {
    e.stopPropagation()
    fn()
  }
  return (
    <li className="deck-list-row" onClick={onOpen}>
      <button type="button" className="deck-list-name deck-list-name-button" title="Card options">
        {card.name}
      </button>
      <span className="deck-list-type">{card.type_line}</span>
      <span className="deck-list-mana">
        <ManaCost cost={card.mana_cost} size={15} />
      </span>
      <span className="deck-list-price">{formatPrice(cardPrice(card)) || '—'}</span>
      {isBasicLand(card) && onAdjustQty ? (
        <span className="qty-controls">
          <button onClick={stop(() => onAdjustQty(card.id, -1))}>−</button>
          {qty}
          <button onClick={stop(() => onAdjustQty(card.id, 1))}>+</button>
        </span>
      ) : (
        <span className="qty-controls">{qty}</span>
      )}
      <button className="remove-button" onClick={stop(() => onRemove(card.id))}>
        ✕
      </button>
    </li>
  )
}

function CardOptionsModal({
  entry,
  zone,
  canMakeCommander,
  onClose,
  onMakeCommander,
  onMoveToSideboard,
  onMoveToMain,
  onRemove,
  onSelectPrinting,
}) {
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const { card, qty } = entry
  const price = formatPrice(cardPrice(card))
  const meta = [
    `${card.set_name} (${(card.set || '').toUpperCase()}) #${card.collector_number}`,
    price,
    qty > 1 ? `×${qty}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="card-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card-modal" role="dialog" aria-modal="true" aria-label={`${card.name} options`}>
        <button className="card-modal-close" onClick={onClose} aria-label="Close card options">
          ✕
        </button>
        <img className="card-modal-art" src={cardImage(card, 'large')} alt={card.name} />
        <div className="card-modal-body">
          <h3>{card.name}</h3>
          <p className="type-line">{card.type_line}</p>
          <p className="card-modal-meta">{meta}</p>
          <div className="card-modal-actions">
            {canMakeCommander && (
              <button className="card-modal-action" onClick={onMakeCommander}>
                Make commander
              </button>
            )}
            {zone === 'main' ? (
              <button className="card-modal-action" onClick={onMoveToSideboard}>
                Move to sideboard
              </button>
            ) : (
              <button className="card-modal-action" onClick={onMoveToMain}>
                Move to main deck
              </button>
            )}
            <button className="card-modal-action danger" onClick={onRemove}>
              {zone === 'main' ? 'Remove from deck' : 'Remove from sideboard'}
            </button>
          </div>
          <CardPrintings card={card} onSelectPrinting={onSelectPrinting} />
        </div>
      </div>
    </div>
  )
}

function DeckExport({ deckName, commander, cards, sideboard }) {
  const [copied, setCopied] = useState(false)
  const text = useMemo(() => {
    const lines = []
    if (commander) lines.push(`1 ${commander.name} *CMDR*`)
    cards.forEach(({ card, qty }) => lines.push(`${qty} ${card.name}`))
    if (sideboard.length > 0) {
      lines.push('', 'Sideboard')
      sideboard.forEach(({ card, qty }) => lines.push(`${qty} ${card.name}`))
    }
    return lines.join('\n')
  }, [commander, cards, sideboard])

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
