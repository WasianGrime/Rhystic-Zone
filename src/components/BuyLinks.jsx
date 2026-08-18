import { getBuyLinks } from '../api/scryfall'

export default function BuyLinks({ card }) {
  const links = getBuyLinks(card)
  if (links.length === 0) return null

  return (
    <div className="buy-links">
      {links.map((link) => (
        <a
          key={link.id}
          className={`buy-link buy-link-${link.id}`}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          Buy on {link.label}
        </a>
      ))}
    </div>
  )
}
