const SYMBOL_LABELS = {
  W: 'White',
  U: 'Blue',
  B: 'Black',
  R: 'Red',
  G: 'Green',
  C: 'Colorless',
}

// Scryfall hosts the official mana/card symbol SVGs it documents via its
// symbology endpoint, addressable directly by symbol text (hybrid/Phyrexian
// symbols use a dash where the card text has a slash, e.g. {W/U} -> W-U.svg).
export function manaSymbolUrl(symbol) {
  return `https://svgs.scryfall.io/card-symbols/${symbol.replace('/', '-')}.svg`
}

export default function ManaSymbol({ symbol, size = 20 }) {
  const label = SYMBOL_LABELS[symbol] || symbol
  return (
    <img
      className="mana-symbol"
      src={manaSymbolUrl(symbol)}
      alt={label}
      title={label}
      width={size}
      height={size}
      loading="lazy"
    />
  )
}
