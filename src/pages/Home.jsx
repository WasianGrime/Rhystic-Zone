import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { findCommandersPage, cardImage, cardPrice, formatPrice } from '../api/scryfall'
import ColorPips from '../components/ColorPips'
import CommanderFilters from '../components/CommanderFilters'

// How often (while the tab is visible) to quietly check whether the live
// top-commanders ranking has moved — new sets, price/popularity shifts, etc.
const UPDATE_CHECK_INTERVAL_MS = 5 * 60 * 1000

export default function Home() {
  const [commanders, setCommanders] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState(null)
  const [refreshAvailable, setRefreshAvailable] = useState(false)

  const [order, setOrder] = useState('edhrec')
  const [colors, setColors] = useState([])

  const requestId = useRef(0)
  const pageRef = useRef(1)
  const sentinelRef = useRef(null)
  const firstPageSignature = useRef(null)

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

  const loadFirstPage = useCallback(() => {
    const id = ++requestId.current
    pageRef.current = 1
    setLoading(true)
    setError(null)
    setCommanders([])
    setHasMore(true)
    setRefreshAvailable(false)

    findCommandersPage({ colors, order, page: 1 })
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
  }, [colors, order])

  useEffect(() => {
    loadFirstPage()
  }, [loadFirstPage])

  const loadMore = useCallback(() => {
    if (loadingRef.current || loadingMoreRef.current || !hasMoreRef.current) return
    const id = requestId.current
    const nextPage = pageRef.current + 1
    setLoadingMore(true)
    findCommandersPage({ colors, order, page: nextPage })
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
  }, [colors, order])

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
      findCommandersPage({ colors, order, page: 1 })
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
  }, [colors, order])

  function clearFilters() {
    setOrder('edhrec')
    setColors([])
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
          onClear={clearFilters}
        />
      </div>

      {refreshAvailable && (
        <div className="refresh-banner">
          <span>New commander rankings are available.</span>
          <button onClick={loadFirstPage}>Refresh</button>
        </div>
      )}

      {error && <p className="error">{error}</p>}
      {loading && <p className="loading-text">Loading commanders from Scryfall…</p>}
      {!loading && !error && commanders.length === 0 && (
        <p className="section-hint">No commanders match those filters.</p>
      )}

      <div className="commander-grid">
        {commanders.map((card) => {
          const price = formatPrice(cardPrice(card))
          return (
            <Link to={`/commander/${encodeURIComponent(card.name)}`} key={card.id} className="commander-card">
              <div className="commander-card-art">
                <img
                  src={card.image_uris?.art_crop || cardImage(card, 'small')}
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
