import { useEffect, useMemo, useState } from 'react'
import { findCommandersPage, cardImage } from '../api/scryfall'

const FALLING_COUNT = 16

function randomBetween(min, max) {
  return min + Math.random() * (max - min)
}

// Ambient decoration only — fetches one page of popular commander art and
// lets it drift down behind the landing page content on a loop.
export default function FallingCards() {
  const [images, setImages] = useState([])

  useEffect(() => {
    let cancelled = false
    findCommandersPage({ order: 'edhrec', page: 1 })
      .then((data) => {
        if (cancelled) return
        const urls = (data.data || [])
          .map((c) => c.image_uris?.art_crop || cardImage(c, 'small'))
          .filter(Boolean)
        setImages(urls)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const cards = useMemo(() => {
    if (images.length === 0) return []
    return Array.from({ length: FALLING_COUNT }, (_, i) => ({
      id: i,
      src: images[i % images.length],
      left: randomBetween(2, 92),
      duration: randomBetween(24, 46),
      delay: randomBetween(-40, 0),
      rotate: randomBetween(-18, 18),
      size: randomBetween(70, 130),
    }))
    // Only reshuffle when the image pool itself changes, not on every render.
  }, [images.length])

  if (cards.length === 0) return null

  return (
    <div className="falling-cards" aria-hidden="true">
      {cards.map((c) => (
        <img
          key={c.id}
          src={c.src}
          alt=""
          className="falling-card"
          loading="lazy"
          style={{
            left: `${c.left}%`,
            width: `${c.size}px`,
            animationDuration: `${c.duration}s`,
            animationDelay: `${c.delay}s`,
            '--rotate': `${c.rotate}deg`,
          }}
        />
      ))}
    </div>
  )
}
