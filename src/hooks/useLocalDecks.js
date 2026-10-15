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

  // Writes go to localStorage immediately (not just via the effect above):
  // callers like the deck builder navigate away right after saving, which
  // unmounts this hook's component before a re-render could persist anything.
  const commit = useCallback((next) => {
    saveDecks(next)
    setDecks(next)
  }, [])

  const upsertDeck = useCallback(
    (deck) => {
      const prev = loadDecks()
      const idx = prev.findIndex((d) => d.id === deck.id)
      if (idx === -1) return commit([...prev, deck])
      const next = [...prev]
      next[idx] = deck
      commit(next)
    },
    [commit]
  )

  const deleteDeck = useCallback(
    (id) => commit(loadDecks().filter((d) => d.id !== id)),
    [commit]
  )

  const getDeck = useCallback((id) => decks.find((d) => d.id === id), [decks])

  const clearAll = useCallback(() => commit([]), [commit])

  return { decks, upsertDeck, deleteDeck, getDeck, clearAll }
}
