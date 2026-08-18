import { cardImage, cardPrice, formatPrice } from '../api/scryfall'

export default function CardTile({ card, onClick, actionLabel, onAction, small }) {
  const img = cardImage(card, small ? 'small' : 'normal')
  const price = formatPrice(cardPrice(card))
  return (
    <div className={`card-tile ${small ? 'small' : ''}`}>
      <button className="card-tile-image" onClick={onClick} title={card.name}>
        {img ? (
          <img src={img} alt={card.name} loading="lazy" />
        ) : (
          <div className="card-tile-placeholder">{card.name}</div>
        )}
        {price && <span className="card-tile-price">{price}</span>}
      </button>
      {actionLabel && (
        <button className="card-tile-action" onClick={() => onAction?.(card)}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}
