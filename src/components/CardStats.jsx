import ManaCost from './ManaCost'
import ManaSymbol from './ManaSymbol'
import ColorPips from './ColorPips'

const LEGALITY_LABELS = {
  legal: 'Legal',
  not_legal: 'Not legal',
  banned: 'Banned',
  restricted: 'Restricted',
}

function OracleText({ text }) {
  return text.split('\n').map((line, i) => (
    <p key={i} className="card-stats-oracle-line">
      {line.split(/(\{[^}]+\})/).map((part, j) => {
        const symbol = part.match(/^\{([^}]+)\}$/)
        return symbol ? <ManaSymbol key={j} symbol={symbol[1]} size={15} /> : part
      })}
    </p>
  ))
}

function Face({ face, showName }) {
  const stat = face.power != null ? `${face.power}/${face.toughness}` : null
  return (
    <div className="card-stats-face">
      {showName && (
        <div className="card-stats-face-head">
          <strong>{face.name}</strong>
          <ManaCost cost={face.mana_cost} size={16} />
        </div>
      )}
      {face.type_line && <p className="card-stats-type">{face.type_line}</p>}
      {face.oracle_text && <OracleText text={face.oracle_text} />}
      <p className="card-stats-numbers">
        {stat && <span>Power/Toughness {stat}</span>}
        {face.loyalty != null && <span>Loyalty {face.loyalty}</span>}
        {face.defense != null && <span>Defense {face.defense}</span>}
      </p>
      {face.flavor_text && <p className="card-stats-flavor">{face.flavor_text}</p>}
    </div>
  )
}

function money(value, prefix) {
  return value ? `${prefix}${Number(value).toFixed(2)}` : null
}

export default function CardStats({ card }) {
  const faces = card.card_faces?.[0]?.oracle_text !== undefined ? card.card_faces : null
  const multiFace = Boolean(faces && faces.length > 1)
  const prices = card.prices || {}
  const rows = [
    ['Mana value', card.cmc != null ? String(card.cmc) : null],
    ['Rarity', card.rarity ? card.rarity[0].toUpperCase() + card.rarity.slice(1) : null],
    ['Set', card.set_name ? `${card.set_name} (${card.set.toUpperCase()}) #${card.collector_number}` : null],
    ['Released', card.released_at],
    ['Artist', card.artist],
    ['Keywords', card.keywords?.length ? card.keywords.join(', ') : null],
    ['Commander', card.legalities?.commander ? LEGALITY_LABELS[card.legalities.commander] || card.legalities.commander : null],
    ['Game Changer', card.game_changer ? 'Yes' : null],
    ['EDHREC rank', card.edhrec_rank ? `#${card.edhrec_rank.toLocaleString()}` : null],
    ['Price (USD)', money(prices.usd, '$')],
    ['Price (foil)', money(prices.usd_foil, '$')],
    ['Price (etched)', money(prices.usd_etched, '$')],
    ['Price (EUR)', money(prices.eur, '€')],
    ['MTGO (tix)', prices.tix || null],
  ].filter(([, value]) => value)

  return (
    <div className="card-stats">
      <div className="card-stats-top">
        {!multiFace && card.mana_cost && <ManaCost cost={card.mana_cost} size={20} />}
        <span className="card-stats-colors">
          <span className="card-stats-colors-label">Color identity</span>
          <ColorPips colors={card.color_identity} size={18} />
        </span>
      </div>

      {faces ? (
        faces.map((face, i) => <Face key={i} face={face} showName={multiFace} />)
      ) : (
        <Face face={card} showName={false} />
      )}

      <dl className="card-stats-grid">
        {rows.map(([label, value]) => (
          <div key={label} className="card-stats-row">
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
