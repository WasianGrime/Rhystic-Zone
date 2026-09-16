import { useCallback, useEffect, useState } from 'react'
import { getLegendaryCreaturePool, getRandomLegendaryCard, cardImage } from '../api/scryfall'

const MAX_FALLING = 16
const LANE_WIDTH_PX = 220 // wide enough that even the biggest card + jitter can't cross into the next lane
const SIZE_RANGE = [110, 170]
const LANE_JITTER = 0.12 // fraction of a lane's width the card center can drift from the lane's middle

function randomBetween(min, max) {
  return min + Math.random() * (max - min)
}

function shuffle(array) {
  const copy = [...array]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function laneCountFor(width) {
  return Math.min(MAX_FALLING, Math.max(1, Math.floor(width / LANE_WIDTH_PX)))
}

// Position/size/rotation only — kept separate from timing (duration/delay)
// so a mid-flight refresh never touches the animation clock, only what's
// drawn in it.
function randomVisual(laneWidthPct, laneIndex) {
  return {
    left: laneIndex * laneWidthPct + laneWidthPct / 2 + randomBetween(-LANE_JITTER, LANE_JITTER) * laneWidthPct,
    rotate: randomBetween(-14, 14),
    size: randomBetween(...SIZE_RANGE),
  }
}

// Ambient decoration only. Each horizontal lane holds one card that falls on
// an infinite CSS loop; every time it completes a loop (i.e. hits the
// bottom), we swap in a fresh random legendary creature or planeswalker via
// Scryfall's `/cards/random`, so the set never repeats and never overlaps
// (lanes are wide enough that cards can't cross into a neighboring one).
export default function FallingCards() {
  const [laneCount, setLaneCount] = useState(() =>
    typeof window === 'undefined' ? MAX_FALLING : laneCountFor(window.innerWidth)
  )
  const [cards, setCards] = useState([])

  useEffect(() => {
    function onResize() {
      setLaneCount(laneCountFor(window.innerWidth))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (laneCount === 0) return
    let cancelled = false
    getLegendaryCreaturePool()
      .then((pool) => {
        if (cancelled) return
        const urls = pool.map((c) => cardImage(c, 'normal')).filter(Boolean)
        if (urls.length === 0) return
        const laneWidthPct = 100 / laneCount
        const picks = shuffle(urls).slice(0, laneCount)
        setCards(
          picks.map((src, i) => ({
            laneIndex: i,
            src,
            duration: randomBetween(24, 46),
            delay: randomBetween(-40, 0),
            ...randomVisual(laneWidthPct, i),
          }))
        )
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [laneCount])

  const refreshLane = useCallback((laneIndex) => {
    getRandomLegendaryCard()
      .then((card) => {
        const src = cardImage(card, 'normal') || cardImage(card, 'large')
        if (!src) return
        setCards((prev) => {
          if (laneIndex >= prev.length) return prev
          const laneWidthPct = 100 / prev.length
          const next = [...prev]
          next[laneIndex] = { ...next[laneIndex], src, ...randomVisual(laneWidthPct, laneIndex) }
          return next
        })
      })
      .catch(() => {})
  }, [])

  if (cards.length === 0) return null

  return (
    <div className="falling-cards" aria-hidden="true">
      {cards.map((c) => (
        <img
          key={c.laneIndex}
          src={c.src}
          alt=""
          className="falling-card"
          loading="lazy"
          onAnimationIteration={() => refreshLane(c.laneIndex)}
          style={{
            left: `${c.left}%`,
            width: `${c.size}px`,
            marginLeft: `-${c.size / 2}px`,
            animationDuration: `${c.duration}s`,
            animationDelay: `${c.delay}s`,
            '--rotate': `${c.rotate}deg`,
          }}
        />
      ))}
    </div>
  )
}
