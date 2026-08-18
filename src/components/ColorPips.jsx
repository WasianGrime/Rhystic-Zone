import ManaSymbol from './ManaSymbol'

export default function ColorPips({ colors, size }) {
  const list = colors && colors.length > 0 ? colors : ['C']
  return (
    <span className="mana-row">
      {list.map((c) => (
        <ManaSymbol key={c} symbol={c} size={size} />
      ))}
    </span>
  )
}
