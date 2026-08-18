import ManaSymbol from './ManaSymbol'

export default function ManaCost({ cost, size }) {
  if (!cost) return null
  const symbols = [...cost.matchAll(/\{([^}]+)\}/g)].map((m) => m[1])
  if (symbols.length === 0) return null
  return (
    <span className="mana-row">
      {symbols.map((s, i) => (
        <ManaSymbol key={i} symbol={s} size={size} />
      ))}
    </span>
  )
}
