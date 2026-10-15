import { cardImage } from '../../api/scryfall'

export function instanceImage(inst, size = 'normal') {
  const { card, flipped } = inst
  if (flipped && card.card_faces?.[1]?.image_uris) return card.card_faces[1].image_uris[size]
  return cardImage(card, size)
}

export default function PlaytestCard({ inst, className = '', ...rest }) {
  const src = instanceImage(inst)
  const showBack = inst.faceDown || !src
  return (
    <div className={`pt-card ${inst.tapped ? 'tapped' : ''} ${className}`} {...rest}>
      {showBack ? (
        <div className="pt-card-back">{!inst.faceDown && <span>{inst.card.name}</span>}</div>
      ) : (
        <img src={src} alt={inst.card.name} draggable={false} />
      )}
      {inst.faceDown && <span className="pt-facedown-tag">Face down</span>}
      {inst.counters > 0 && <span className="pt-counter">{inst.counters}</span>}
      {inst.isToken && <span className="pt-token-tag">Token</span>}
    </div>
  )
}
