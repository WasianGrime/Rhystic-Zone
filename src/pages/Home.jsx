import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  findCommandersPage,
  getRandomCommanders,
  getSets,
  cardArtCrop,
  cardPrice,
  formatPrice,
} from '../api/scryfall'
import ColorPips from '../components/ColorPips'
import CommanderFilters from '../components/CommanderFilters'
import { getCommanderBrowseState, saveCommanderBrowseState } from '../state/commanderBrowseCache'

// How often (while the tab is visible) to quietly check whether the live
// top-commanders ranking has moved — new sets, price/popularity shifts, etc.
const UPDATE_CHECK_INTERVAL_MS = 5 * 60 * 1000

export default function Home() {
  // Read once per mount — if you came back from a commander's page, this is
  // what you had loaded before you clicked away.
  const cachedRef = useRef(getCommanderBrowseState())
  const cached = cachedRef.current
  const hasCachedResults = Boolean(cached?.commanders?.length)

  const [commanders, setCommanders] = useState(() => cached?.commanders ?? [])
  const [loading, setLoading] = useState(!hasCachedResults)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(() => cached?.hasMore ?? true)
  const [error, setError] = useState(null)
  const [refreshAvailable, setRefreshAvailable] = useState(false)
  const [randomizing, setRandomizing] = useState(false)

  const [order, setOrder] = useState(() => cached?.order ?? 'edhrec')
  const [colors, setColors] = useState(() => cached?.colors ?? [])
  const [set, setSet] = useState(() => cached?.set ?? '')
  const [sets, setSets] = useState([])

  const requestId = useRef(0)
  const pageRef = useRef(cached?.page ?? 1)
  const sentinelRef = useRef(null)
  const firstPageSignature = useRef(cached?.firstPageSignature ?? null)
  // Skips the very first automatic fetch when we've just restored a
  // non-empty grid from cache — every later filter change goes through
  // loadFirstPage normally.
  const skipNextLoadRef = useRef(hasCachedResults)

  // Always holds the latest render's values so the unmount cleanup below
  // (which only runs once, on the empty-deps effect) can read current state
  // without needing to be recreated every render.
  const latestStateRef = useRef()
  latestStateRef.current = { order, colors, set, commanders, hasMore }

  // Guard flags mirrored into refs so `loadMore` always reads fresh values
  // without needing to be recreated (and re-observed) on every loading tick.
  const loadingRef = useRef(loading)
  const loadingMoreRef = useRef(loadingMore)
  const hasMoreRef = useRef(hasMore)
  useEffect(() => {
    loadingRef.current = loading
  }, [loading])
  useEffect(() => {
    loadingMoreRef.current = loadingMore
  }, [loadingMore])
  useEffect(() => {
    hasMoreRef.current = hasMore
  }, [hasMore])

  useEffect(() => {
    getSets()
      .then(setSets)
      .catch(() => {})
  }, [])

  const loadFirstPage = useCallback(() => {
    const id = ++requestId.current
    pageRef.current = 1
    setLoading(true)
    setError(null)
    setCommanders([])
    setHasMore(true)
    setRefreshAvailable(false)

    findCommandersPage({ colors, order, page: 1, set })
      .then((data) => {
        if (id !== requestId.current) return
        const results = data.data || []
        setCommanders(results)
        setHasMore(Boolean(data.has_more))
        firstPageSignature.current = results.map((c) => c.id).join(',')
      })
      .catch((err) => {
        if (id !== requestId.current) return
        setError(err.message || 'Could not reach Scryfall right now.')
      })
      .finally(() => {
        if (id !== requestId.current) return
        setLoading(false)
      })
  }, [colors, order, set])

  useEffect(() => {
    if (skipNextLoadRef.current) {
      skipNextLoadRef.current = false
      return
    }
    loadFirstPage()
  }, [loadFirstPage])

  // Restore scroll position once, right after a cached grid renders.
  useEffect(() => {
    if (cached?.scrollY) {
      requestAnimationFrame(() => window.scrollTo(0, cached.scrollY))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Snapshot filters/results/scroll position when leaving this page (e.g.
  // clicking into a commander), so coming back restores exactly this view
  // instead of refetching page 1 from scratch.
  useEffect(() => {
    return () => {
      saveCommanderBrowseState({
        ...latestStateRef.current,
        page: pageRef.current,
        firstPageSignature: firstPageSignature.current,
        scrollY: window.scrollY,
      })
    }
  }, [])

  const loadMore = useCallback(() => {
    if (loadingRef.current || loadingMoreRef.current || !hasMoreRef.current) return
    const id = requestId.current
    const nextPage = pageRef.current + 1
    setLoadingMore(true)
    findCommandersPage({ colors, order, page: nextPage, set })
      .then((data) => {
        if (id !== requestId.current) return
        pageRef.current = nextPage
        setCommanders((prev) => [...prev, ...(data.data || [])])
        setHasMore(Boolean(data.has_more))
      })
      .catch(() => {
        if (id !== requestId.current) return
        setHasMore(false)
      })
      .finally(() => {
        if (id !== requestId.current) return
        setLoadingMore(false)
      })
  }, [colors, order, set])

  function handleRandomize() {
    const id = ++requestId.current
    setRandomizing(true)
    setError(null)
    setRefreshAvailable(false)
    getRandomCommanders(colors, 20, set)
      .then((results) => {
        if (id !== requestId.current) return
        setCommanders(results)
        setHasMore(false)
        firstPageSignature.current = results.map((c) => c.id).join(',')
      })
      .catch((err) => {
        if (id !== requestId.current) return
        setError(err.message || 'Could not randomize commanders.')
      })
      .finally(() => {
        if (id !== requestId.current) return
        setRandomizing(false)
      })
  }

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver((entries) => entries[0].isIntersecting && loadMore(), {
      rootMargin: '800px',
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore])

  // Quietly poll Scryfall's page-1 ranking in the background. If it's moved
  // (new set added a commander, a popularity/price shift reordered the top
  // of the list, etc.) surface a prompt instead of yanking the grid out from
  // under someone mid-scroll.
  useEffect(() => {
    function checkForUpdates() {
      if (loadingRef.current || document.visibilityState !== 'visible') return
      findCommandersPage({ colors, order, page: 1, set })
        .then((data) => {
          const freshIds = (data.data || []).map((c) => c.id).join(',')
          if (firstPageSignature.current && freshIds && freshIds !== firstPageSignature.current) {
            setRefreshAvailable(true)
          }
        })
        .catch(() => {})
    }

    const interval = setInterval(checkForUpdates, UPDATE_CHECK_INTERVAL_MS)
    function onVisible() {
      if (document.visibilityState === 'visible') checkForUpdates()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [colors, order, set])

  function clearFilters() {
    setOrder('edhrec')
    setColors([])
    setSet('')
  }

  return (
    <div className="page">
      <section className="hero">
        <h1>Top Commanders</h1>
        <p>
          Ranked live from Scryfall&rsquo;s commander data. Click any commander to see what the
          card does and pull recommended cards to build around it.
        </p>
      </section>

      <div className="filter-bar">
        <CommanderFilters
          order={order}
          onOrderChange={setOrder}
          colors={colors}
          onColorsChange={setColors}
          set={set}
          sets={sets}
          onSetChange={setSet}
          onClear={clearFilters}
        />
        <button className="randomize-button" onClick={handleRandomize} disabled={randomizing}>
          🎲 {randomizing ? 'Randomizing…' : 'Randomize'}
        </button>
      </div>

      {refreshAvailable && (
        <div className="refresh-banner">
          <span>New commander rankings are available.</span>
          <button onClick={loadFirstPage}>Refresh</button>
        </div>
      )}

      {error && <p className="error">{error}</p>}
      {(loading || randomizing) && (
        <p className="loading-text">
          {randomizing ? 'Pulling a random set of commanders…' : 'Loading commanders from Scryfall…'}
        </p>
      )}
      {!loading && !randomizing && !error && commanders.length === 0 && (
        <p className="section-hint">No commanders match those filters.</p>
      )}

      <div className="commander-grid">
        {commanders.map((card) => {
          const price = formatPrice(cardPrice(card))
          return (
            <Link to={`/commander/${encodeURIComponent(card.name)}`} key={card.id} className="commander-card">
              <div className="commander-card-art">
                <img
                  src={cardArtCrop(card)}
                  alt={card.name}
                  loading="lazy"
                />
                {price && <span className="card-tile-price">{price}</span>}
              </div>
              <div className="commander-card-info">
                <h3>{card.name}</h3>
                <ColorPips colors={card.color_identity} />
              </div>
            </Link>
          )
        })}
      </div>

      <div ref={sentinelRef} className="scroll-sentinel">
        {loadingMore && <p className="loading-text">Loading more commanders…</p>}
        {!loading && !hasMore && commanders.length > 0 && (
          <p className="section-hint">You&rsquo;ve reached the end — {commanders.length} commanders.</p>
        )}
      </div>
    </div>
  )
}
