import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'command-zone-decks'

function loadDecks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveDecks(decks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(decks))
}

export function useLocalDecks() {
  const [decks, setDecks] = useState(loadDecks)

  useEffect(() => {
    saveDecks(decks)
  }, [decks])

  const upsertDeck = useCallback((deck) => {
    setDecks((prev) => {
      const idx = prev.findIndex((d) => d.id === deck.id)
      if (idx === -1) return [...prev, deck]
      const next = [...prev]
      next[idx] = deck
      return next
    })
  }, [])

  const deleteDeck = useCallback((id) => {
    setDecks((prev) => prev.filter((d) => d.id !== id))
  }, [])

  const getDeck = useCallback((id) => decks.find((d) => d.id === id), [decks])

  const clearAll = useCallback(() => setDecks([]), [])

  return { decks, upsertDeck, deleteDeck, getDeck, clearAll }
}
