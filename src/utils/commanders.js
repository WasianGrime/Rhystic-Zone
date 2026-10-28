// Rules for decks with two commanders (Partner, Partner with, Friends forever,
// Choose a Background, Doctor's companion).

function typeLine(card) {
  return card.type_line || card.card_faces?.[0]?.type_line || ''
}

function oracleText(card) {
  return card.oracle_text ?? (card.card_faces || []).map((f) => f.oracle_text || '').join('\n')
}

function keywordSet(card) {
  return new Set((card.keywords || []).map((k) => k.toLowerCase()))
}

function partnerWithName(card) {
  const match = oracleText(card).match(/Partner with ([^\n(]+)/i)
  return match ? match[1].trim().toLowerCase() : null
}

function isBackground(card) {
  return /\bBackground\b/.test(typeLine(card)) && /Enchantment/.test(typeLine(card))
}

// True when the card can be the other half of a two-commander pair.
export function hasPartnerAbility(card) {
  const kw = keywordSet(card)
  return (
    kw.has('partner') ||
    kw.has('partner with') ||
    kw.has('friends forever') ||
    kw.has('choose a background') ||
    kw.has("doctor's companion")
  )
}

export function canPartner(a, b) {
  if (!a || !b || a.name === b.name) return false
  const ka = keywordSet(a)
  const kb = keywordSet(b)

  // "Partner with X" only works with X (it still carries the plain Partner
  // keyword, so check it before the generic rule).
  const wa = partnerWithName(a)
  const wb = partnerWithName(b)
  if (wa || wb) return wa === b.name.toLowerCase() || wb === a.name.toLowerCase()

  if (ka.has('partner') && kb.has('partner')) return true
  if (ka.has('friends forever') && kb.has('friends forever')) return true
  if (ka.has('choose a background') && isBackground(b)) return true
  if (kb.has('choose a background') && isBackground(a)) return true
  if (ka.has("doctor's companion") && /Time Lord Doctor/.test(typeLine(b))) return true
  if (kb.has("doctor's companion") && /Time Lord Doctor/.test(typeLine(a))) return true
  return false
}

export function combinedIdentity(commander, partner) {
  return [...new Set([...(commander?.color_identity || []), ...(partner?.color_identity || [])])]
}
