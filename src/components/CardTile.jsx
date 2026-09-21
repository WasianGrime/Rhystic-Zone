import { cardImage, cardPrice, formatPrice } from '../api/scryfall'

export default function CardTile({ card, onClick, actionLabel, onAction, small }) {
  // Always request Scryfall's 'normal' (488px) source even for the small
  // display size — the browser downscales it, which stays crisp on retina
  // screens, whereas Scryfall's own 'small' (146px) source visibly softens
  // once CSS stretches or a high-DPI screen scales it up.
  const img = cardImage(card, 'normal')
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
