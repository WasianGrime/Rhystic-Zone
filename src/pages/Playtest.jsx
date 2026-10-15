import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useLocalDecks } from '../hooks/useLocalDecks'
import {
  addLog,
  addToken,
  applyScry,
  buildGame,
  copyAsToken,
  draw,
  findInstance,
  hasBackFace,
  instanceName,
  mill,
  moveCard,
  mulligan,
  nextTurn,
  shuffle,
  untapAll,
  updateInstance,
} from '../utils/playtestEngine'
import PlaytestCard, { instanceImage } from '../components/playtest/PlaytestCard'
import ContextMenu from '../components/playtest/ContextMenu'
import ZoneViewer from '../components/playtest/ZoneViewer'
import ScryModal from '../components/playtest/ScryModal'
import TokenModal from '../components/playtest/TokenModal'

const ZONE_LABEL = {
  library: 'the library',
  hand: 'your hand',
  battlefield: 'the battlefield',
  graveyard: 'the graveyard',
  exile: 'exile',
  command: 'the command zone',
}

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n))

function zoneAt(x, y) {
  for (const el of document.elementsFromPoint(x, y)) {
    const zone = el.closest?.('[data-zone]')
    if (zone) return zone.dataset.zone
  }
  return null
}

function StatRow({ label, value, hint, steps, onStep }) {
  return (
    <div className="pt-stat">
      <span className="pt-stat-label">{label}</span>
      <span className="pt-stat-controls">
        {steps.filter((s) => s < 0).map((s) => (
          <button key={s} onClick={() => onStep(s)} aria-label={`${label} ${s}`}>
            {s}
          </button>
        ))}
        <span className="pt-stat-value">
          {value}
          {hint && <small>{hint}</small>}
        </span>
        {steps.filter((s) => s > 0).map((s) => (
          <button key={s} onClick={() => onStep(s)} aria-label={`${label} +${s}`}>
            +{s}
          </button>
        ))}
      </span>
    </div>
  )
}

export default function Playtest() {
  const { deckId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { getDeck } = useLocalDecks()
  const deck = useMemo(
    () => location.state?.deck || (deckId ? getDeck(deckId) : null),
    [location.state, deckId, getDeck]
  )

  // The live game and its undo history live in refs so drag handlers (which
  // run outside React's render cycle) always see the latest state.
  const gameRef = useRef(null)
  const historyRef = useRef([])
  const [game, setGame] = useState(null)

  const [preview, setPreview] = useState(null)
  const [drag, setDrag] = useState(null) // { inst, x, y }
  const [hoverZone, setHoverZone] = useState(null)
  const [menu, setMenu] = useState(null) // { x, y, uid }
  const [viewer, setViewer] = useState(null) // 'library' | 'graveyard' | 'exile'
  const [scryCount, setScryCount] = useState(0)
  const [showTokens, setShowTokens] = useState(false)
  const [amount, setAmount] = useState(1)

  const matRef = useRef(null)
  const ghostRef = useRef(null)

  const deckCards = useMemo(
    () => (deck ? [...(deck.commander ? [deck.commander] : []), ...deck.cards.map((e) => e.card)] : []),
    [deck]
  )

  const commit = useCallback((updater, message) => {
    const prev = gameRef.current
    if (!prev) return
    let next = updater(prev)
    if (!next || next === prev) return
    if (message) next = addLog(next, message)
    historyRef.current = [...historyRef.current.slice(-99), prev]
    gameRef.current = next
    setGame(next)
  }, [])

  const undo = useCallback(() => {
    const prev = historyRef.current.at(-1)
    if (!prev) return
    historyRef.current = historyRef.current.slice(0, -1)
    gameRef.current = prev
    setGame(prev)
  }, [])

  const startGame = useCallback(() => {
    if (!deck) return
    historyRef.current = []
    const fresh = buildGame(deck)
    gameRef.current = fresh
    setGame(fresh)
    setPreview(null)
  }, [deck])

  useEffect(() => {
    if (deck && !gameRef.current) startGame()
  }, [deck, startGame])

  const doDraw = useCallback(
    (n = 1) =>
      commit((g) => {
        if (g.library.length === 0) return addLog(g, 'Your library is empty.')
        const count = Math.min(n, g.library.length)
        return addLog(draw(g, n), `Drew ${count} card${count === 1 ? '' : 's'}.`)
      }),
    [commit]
  )
  const doUntap = useCallback(() => commit(untapAll, 'Untapped everything.'), [commit])
  const doNextTurn = useCallback(() => commit(nextTurn), [commit])

  useEffect(() => {
    function onKeyDown(e) {
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        undo()
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey || viewer || scryCount || showTokens) return
      const key = e.key.toLowerCase()
      if (key === 'd') doDraw(1)
      else if (key === 'u') doUntap()
      else if (key === 'n') doNextTurn()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [undo, doDraw, doUntap, doNextTurn, viewer, scryCount, showTokens])

  function handleClick(inst, zone) {
    if (zone === 'battlefield') {
      commit((g) => updateInstance(g, inst.uid, (i) => ({ tapped: !i.tapped })))
    } else if (zone === 'hand') {
      if (gameRef.current.bottomNeeded > 0) {
        commit(
          (g) => ({ ...moveCard(g, inst.uid, 'library', { position: 'bottom' }), bottomNeeded: g.bottomNeeded - 1 }),
          `Put ${inst.card.name} on the bottom of your library.`
        )
      } else {
        commit((g) => moveCard(g, inst.uid, 'battlefield'), `Played ${inst.card.name}.`)
      }
    } else if (zone === 'command') {
      commit((g) => moveCard(g, inst.uid, 'battlefield'), `Cast ${inst.card.name} from the command zone.`)
    } else if (zone === 'graveyard' || zone === 'exile') {
      setViewer(zone)
    }
  }

  function handleDrop(inst, from, x, y) {
    const target = zoneAt(x, y)
    if (!target) return
    if (target === 'battlefield') {
      const rect = matRef.current.getBoundingClientRect()
      const width = ghostRef.current?.offsetWidth || 92
      const height = width * 1.4
      const fx = clamp((x - width / 2 - rect.left) / (rect.width - width), 0, 1)
      const fy = clamp((y - height / 2 - rect.top) / (rect.height - height), 0, 1)
      commit(
        (g) => moveCard(g, inst.uid, 'battlefield', { x: fx, y: fy }),
        from === 'battlefield' ? null : `Put ${inst.card.name} onto the battlefield.`
      )
    } else {
      commit((g) => moveCard(g, inst.uid, target), `Moved ${instanceName(inst)} to ${ZONE_LABEL[target]}.`)
    }
  }

  // One handler for click, drag and (on touch) long-press, for every card.
  function onCardPointerDown(e, inst, zone) {
    if (e.button !== 0) return
    const press = { sx: e.clientX, sy: e.clientY, moved: false, done: false, timer: null }

    function cleanup() {
      clearTimeout(press.timer)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
    }
    function onMove(ev) {
      if (press.done) return
      if (!press.moved && Math.hypot(ev.clientX - press.sx, ev.clientY - press.sy) < 6) return
      if (!press.moved) {
        press.moved = true
        clearTimeout(press.timer)
        setMenu(null)
        setPreview(null)
      }
      setDrag({ inst, x: ev.clientX, y: ev.clientY })
      const z = zoneAt(ev.clientX, ev.clientY)
      setHoverZone((prev) => (prev === z ? prev : z))
    }
    function onUp(ev) {
      cleanup()
      if (press.done) return
      press.done = true
      setDrag(null)
      setHoverZone(null)
      if (press.moved) handleDrop(inst, zone, ev.clientX, ev.clientY)
      else handleClick(inst, zone)
    }
    function onCancel() {
      cleanup()
      press.done = true
      setDrag(null)
      setHoverZone(null)
    }

    if (e.pointerType === 'touch') {
      press.timer = setTimeout(() => {
        if (press.moved || press.done) return
        press.done = true
        cleanup()
        setMenu({ x: press.sx, y: press.sy, uid: inst.uid })
      }, 550)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
  }

  function openMenu(e, inst) {
    e.preventDefault()
    setMenu({ x: e.clientX, y: e.clientY, uid: inst.uid })
  }

  function cardMenuItems(zone, inst) {
    const uid = inst.uid
    const name = instanceName(inst)
    const sendTo = (dest, label, opts) => ({
      label,
      onClick: () =>
        commit(
          (g) => moveCard(g, uid, dest, opts),
          `Moved ${name} to ${ZONE_LABEL[dest]}${opts?.position ? ` (${opts.position})` : ''}.`
        ),
    })
    const items = []

    if (zone === 'battlefield') {
      items.push({
        label: inst.tapped ? 'Untap' : 'Tap',
        onClick: () => commit((g) => updateInstance(g, uid, (i) => ({ tapped: !i.tapped }))),
      })
      if (hasBackFace(inst.card)) {
        items.push({
          label: 'Transform',
          onClick: () => commit((g) => updateInstance(g, uid, (i) => ({ flipped: !i.flipped }))),
        })
      }
      items.push({
        label: inst.faceDown ? 'Turn face up' : 'Turn face down',
        onClick: () => commit((g) => updateInstance(g, uid, (i) => ({ faceDown: !i.faceDown }))),
      })
      items.push({
        label: 'Add counter',
        onClick: () => commit((g) => updateInstance(g, uid, (i) => ({ counters: i.counters + 1 }))),
      })
      if (inst.counters > 0) {
        items.push({
          label: 'Remove counter',
          onClick: () => commit((g) => updateInstance(g, uid, (i) => ({ counters: Math.max(0, i.counters - 1) }))),
        })
      }
      items.push({ label: 'Copy as token', onClick: () => commit((g) => copyAsToken(g, uid)) })
      items.push({ divider: true })
    } else if (zone === 'hand') {
      items.push({
        label: 'Play to battlefield',
        onClick: () => commit((g) => moveCard(g, uid, 'battlefield'), `Played ${name}.`),
      })
      items.push({ divider: true })
    } else {
      items.push({
        label: zone === 'command' ? 'Cast to battlefield' : 'Put onto battlefield',
        onClick: () => commit((g) => moveCard(g, uid, 'battlefield'), `Put ${name} onto the battlefield.`),
      })
      items.push({ divider: true })
    }

    if (zone !== 'hand') items.push(sendTo('hand', 'Return to hand'))
    items.push(sendTo('library', 'Top of library', { position: 'top' }))
    items.push(sendTo('library', 'Bottom of library', { position: 'bottom' }))
    if (zone !== 'graveyard') items.push(sendTo('graveyard', 'Send to graveyard'))
    if (zone !== 'exile') items.push(sendTo('exile', 'Exile'))
    if (inst.isCommander && zone !== 'command') items.push(sendTo('command', 'Return to command zone'))
    return items
  }

  function roll(sides) {
    commit((g) => addLog(g, `Rolled a d${sides}: ${1 + Math.floor(Math.random() * sides)}.`))
  }

  if (!deck) {
    return (
      <div className="page">
        <h1>Playtest</h1>
        <p className="section-hint">
          That deck couldn&rsquo;t be found. Open a deck from <Link to="/decks">My Decks</Link> and press
          Playtest.
        </p>
      </div>
    )
  }
  if (!game) return <div className="page loading-text">Shuffling up…</div>

  const menuFound = menu ? findInstance(game, menu.uid) : null
  const dragging = drag?.inst.uid
  const viewerCards =
    viewer === 'library'
      ? [...game.library].sort((a, b) => a.card.name.localeCompare(b.card.name))
      : viewer
        ? [...game[viewer]].reverse()
        : []
  const topGraveyard = game.graveyard.at(-1)
  const topExile = game.exile.at(-1)
  const dropClass = (zone) => (drag && hoverZone === zone ? 'drop-target' : '')

  return (
    <div className="playtest">
      <div className="pt-main">
        <div className="pt-table">
        <div className={`pt-mat ${dropClass('battlefield')}`} data-zone="battlefield" ref={matRef}>
          <span className="pt-mat-label">Battlefield</span>
          {game.bottomNeeded > 0 && (
            <div className="pt-banner">
              Mulligan: click {game.bottomNeeded} card{game.bottomNeeded === 1 ? '' : 's'} in your hand to put{' '}
              {game.bottomNeeded === 1 ? 'it' : 'them'} on the bottom of your library.
            </div>
          )}
          {game.battlefield.map((inst) => (
            <PlaytestCard
              key={inst.uid}
              inst={inst}
              className={`on-mat ${dragging === inst.uid ? 'dragging' : ''}`}
              style={{
                left: `calc((100% - var(--pt-card-w)) * ${inst.x ?? 0})`,
                top: `calc((100% - var(--pt-card-h)) * ${inst.y ?? 0})`,
              }}
              onPointerDown={(e) => onCardPointerDown(e, inst, 'battlefield')}
              onPointerEnter={() => !drag && setPreview(inst)}
              onContextMenu={(e) => openMenu(e, inst)}
            />
          ))}
        </div>

          <div className="pt-piles">
            <div className={`pt-pile ${dropClass('command')}`} data-zone="command">
              <span className="pt-pile-label">Command</span>
              <div className="pt-pile-slot">
                {game.command.map((inst) => (
                  <PlaytestCard
                    key={inst.uid}
                    inst={inst}
                    className={dragging === inst.uid ? 'dragging' : ''}
                    onPointerDown={(e) => onCardPointerDown(e, inst, 'command')}
                    onPointerEnter={() => !drag && setPreview(inst)}
                    onContextMenu={(e) => openMenu(e, inst)}
                  />
                ))}
                {game.command.length === 0 && <span className="pt-pile-empty">Empty</span>}
              </div>
            </div>

            <div className={`pt-pile ${dropClass('library')}`} data-zone="library">
              <span className="pt-pile-label">Library ({game.library.length})</span>
              <button
                className="pt-pile-slot pt-library"
                onClick={() => doDraw(1)}
                disabled={game.library.length === 0}
                title="Click to draw a card"
              >
                {game.library.length > 0 ? <div className="pt-card pt-card-static"><div className="pt-card-back" /></div> : <span className="pt-pile-empty">Empty</span>}
              </button>
            </div>

            <div className={`pt-pile ${dropClass('graveyard')}`} data-zone="graveyard">
              <span className="pt-pile-label">Graveyard ({game.graveyard.length})</span>
              <div className="pt-pile-slot">
                {topGraveyard ? (
                  <PlaytestCard
                    inst={topGraveyard}
                    className={dragging === topGraveyard.uid ? 'dragging' : ''}
                    onPointerDown={(e) => onCardPointerDown(e, topGraveyard, 'graveyard')}
                    onPointerEnter={() => !drag && setPreview(topGraveyard)}
                    onContextMenu={(e) => openMenu(e, topGraveyard)}
                  />
                ) : (
                  <span className="pt-pile-empty">Empty</span>
                )}
              </div>
            </div>

            <div className={`pt-pile ${dropClass('exile')}`} data-zone="exile">
              <span className="pt-pile-label">Exile ({game.exile.length})</span>
              <div className="pt-pile-slot">
                {topExile ? (
                  <PlaytestCard
                    inst={topExile}
                    className={dragging === topExile.uid ? 'dragging' : ''}
                    onPointerDown={(e) => onCardPointerDown(e, topExile, 'exile')}
                    onPointerEnter={() => !drag && setPreview(topExile)}
                    onContextMenu={(e) => openMenu(e, topExile)}
                  />
                ) : (
                  <span className="pt-pile-empty">Empty</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-bottom">
          <div className={`pt-hand ${dropClass('hand')}`} data-zone="hand">
            <span className="pt-pile-label">Hand ({game.hand.length})</span>
            <div className="pt-hand-cards">
              {game.hand.map((inst) => (
                <PlaytestCard
                  key={inst.uid}
                  inst={inst}
                  className={`in-hand ${dragging === inst.uid ? 'dragging' : ''} ${game.bottomNeeded > 0 ? 'pick-bottom' : ''}`}
                  onPointerDown={(e) => onCardPointerDown(e, inst, 'hand')}
                  onPointerEnter={() => !drag && setPreview(inst)}
                  onContextMenu={(e) => openMenu(e, inst)}
                />
              ))}
              {game.hand.length === 0 && <span className="pt-pile-empty">No cards in hand</span>}
            </div>
          </div>
        </div>
      </div>

      <aside className="pt-side">
        <div className="pt-side-head">
          <button className="back-button" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <h2>{deck.name || 'Playtest'}</h2>
        </div>

        <div className="pt-preview">
          {preview ? (
            <img src={instanceImage(preview, 'normal')} alt={preview.card.name} />
          ) : (
            <p className="section-hint">Hover a card to see it here.</p>
          )}
        </div>

        <section className="pt-section">
          <StatRow label="Life" value={game.life} steps={[-5, -1, 1, 5]} onStep={(d) => commit((g) => ({ ...g, life: g.life + d }))} />
          <StatRow label="Poison" value={game.poison} steps={[-1, 1]} onStep={(d) => commit((g) => ({ ...g, poison: Math.max(0, g.poison + d) }))} />
          <StatRow
            label="Cmdr casts"
            value={game.tax}
            hint={game.tax > 0 ? `tax +${game.tax * 2}` : null}
            steps={[-1, 1]}
            onStep={(d) => commit((g) => ({ ...g, tax: Math.max(0, g.tax + d) }))}
          />
          <div className="pt-stat">
            <span className="pt-stat-label">Turn</span>
            <span className="pt-stat-value">{game.turn}</span>
          </div>
        </section>

        <section className="pt-section">
          <h3>Turn</h3>
          <div className="pt-btn-row">
            <button className="pt-btn primary" onClick={doNextTurn} title="Untap everything and draw (N)">
              Next turn
            </button>
            <button className="pt-btn" onClick={doUntap} title="Untap all permanents (U)">
              Untap all
            </button>
          </div>
        </section>

        <section className="pt-section">
          <h3>Library</h3>
          <div className="pt-btn-row">
            <label className="pt-amount">
              <span>Cards</span>
              <input
                type="number"
                min="1"
                max="99"
                value={amount}
                onChange={(e) => setAmount(clamp(parseInt(e.target.value, 10) || 1, 1, 99))}
              />
            </label>
            <button className="pt-btn" onClick={() => doDraw(amount)} title="Draw (D draws one)">
              Draw
            </button>
            <button className="pt-btn" onClick={() => commit((g) => mill(g, amount))}>
              Mill
            </button>
            <button
              className="pt-btn"
              disabled={game.library.length === 0}
              onClick={() => setScryCount(Math.min(amount, game.library.length))}
            >
              Scry
            </button>
          </div>
          <div className="pt-btn-row">
            <button
              className="pt-btn"
              onClick={() => commit((g) => ({ ...g, library: shuffle(g.library) }), 'Shuffled your library.')}
            >
              Shuffle
            </button>
            <button className="pt-btn" onClick={() => setViewer('library')}>
              Search library
            </button>
          </div>
        </section>

        <section className="pt-section">
          <h3>Table</h3>
          <div className="pt-btn-row">
            <button className="pt-btn" onClick={() => commit(mulligan)}>
              Mulligan
            </button>
            <button className="pt-btn" onClick={() => setShowTokens(true)}>
              Add token
            </button>
          </div>
          <div className="pt-btn-row">
            <button className="pt-btn" onClick={() => roll(6)}>
              d6
            </button>
            <button className="pt-btn" onClick={() => roll(20)}>
              d20
            </button>
            <button
              className="pt-btn"
              onClick={() => commit((g) => addLog(g, `Coin flip: ${Math.random() < 0.5 ? 'heads' : 'tails'}.`))}
            >
              Coin
            </button>
          </div>
        </section>

        <section className="pt-section">
          <h3>Game</h3>
          <div className="pt-btn-row">
            <button className="pt-btn" onClick={undo} disabled={historyRef.current.length === 0} title="Undo (Ctrl/Cmd+Z)">
              Undo
            </button>
            <button className="pt-btn danger" onClick={startGame}>
              New game
            </button>
          </div>
          <p className="section-hint pt-hints">
            Click a battlefield card to tap it, a hand card to play it, the library to draw. Drag cards between
            zones, right-click (or long-press) for more. Keys: D draw, U untap, N next turn.
          </p>
        </section>

        <section className="pt-section">
          <h3>Log</h3>
          <ul className="pt-log">
            {[...game.log].reverse().slice(0, 14).map((entry) => (
              <li key={entry.id}>{entry.text}</li>
            ))}
          </ul>
        </section>
      </aside>

      {drag && (
        <div className="pt-ghost" ref={ghostRef} style={{ left: drag.x, top: drag.y }}>
          <PlaytestCard inst={drag.inst} />
        </div>
      )}

      {menu && menuFound && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={cardMenuItems(menuFound.zone, menuFound.inst)}
          onClose={() => setMenu(null)}
        />
      )}

      {viewer && (
        <ZoneViewer
          title={viewer === 'library' ? 'Library (sorted A–Z)' : viewer === 'graveyard' ? 'Graveyard' : 'Exile'}
          instances={viewerCards}
          hint="Click a card to move it."
          onCardClick={(inst, e) => setMenu({ x: e.clientX, y: e.clientY, uid: inst.uid })}
          onClose={() => setViewer(null)}
          footer={
            viewer === 'library' && (
              <>
                <button
                  className="primary-button"
                  onClick={() => {
                    commit((g) => ({ ...g, library: shuffle(g.library) }), 'Shuffled your library.')
                    setViewer(null)
                  }}
                >
                  Shuffle &amp; close
                </button>
                <button className="secondary-button" onClick={() => setViewer(null)}>
                  Close
                </button>
              </>
            )
          }
        />
      )}

      {scryCount > 0 && (
        <ScryModal
          cards={game.library.slice(0, scryCount)}
          onApply={(decisions) => {
            commit((g) => applyScry(g, decisions))
            setScryCount(0)
          }}
          onCancel={() => setScryCount(0)}
        />
      )}

      {showTokens && (
        <TokenModal
          deckCards={deckCards}
          onPick={(card) => commit((g) => addToken(g, card))}
          onClose={() => setShowTokens(false)}
        />
      )}
    </div>
  )
}
