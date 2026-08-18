import { useEffect, useRef, useState } from 'react'
import { autocomplete, getCardByName } from '../api/scryfall'

export default function CardSearchBox({ placeholder, onSelect, autoFocus, onSearchAll }) {
  const [term, setTerm] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const boxRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  useEffect(() => {
    if (!term) {
      setSuggestions([])
      return
    }
    let cancelled = false
    const t = setTimeout(async () => {
      try {
        const results = await autocomplete(term)
        if (!cancelled) setSuggestions(results.slice(0, 8))
      } catch {
        if (!cancelled) setSuggestions([])
      }
    }, 200)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [term])

  useEffect(() => {
    function onClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  async function handlePick(name, { fuzzy = false } = {}) {
    setLoading(true)
    setOpen(false)
    setTerm('')
    try {
      const card = await getCardByName(name, { fuzzy })
      onSelect(card)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card-search-box" ref={boxRef}>
      <input
        ref={inputRef}
        type="text"
        value={term}
        placeholder={placeholder || 'Search for a card…'}
        onChange={(e) => {
          setTerm(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' || !term.trim()) return
          if (onSearchAll) {
            const query = term.trim()
            setOpen(false)
            setTerm('')
            onSearchAll(query)
          } else {
            handlePick(term.trim(), { fuzzy: true })
          }
        }}
      />
      {loading && <span className="card-search-loading">Loading…</span>}
      {open && suggestions.length > 0 && (
        <ul className="card-search-suggestions">
          {suggestions.map((name) => (
            <li key={name}>
              <button onClick={() => handlePick(name)}>{name}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
