// Well-known TCG accessory brands. There's no public product API for this
// space (unlike Scryfall for cards), so "shopping" here means building a
// real, current search on a real marketplace — not a storefront of our own.
// `domain` is each brand's real official site, verified directly, used both
// for a favicon-based logo and as the "shop official site" link.
export const SHOP_BRANDS = [
  {
    id: 'ultra-pro',
    name: 'Ultra Pro',
    blurb: 'Sleeves, deck boxes, binders, and playmats',
    domain: 'ultrapro.com',
    officialUrl: 'https://www.ultrapro.com/collections/gaming-accessories-magic-the-gathering',
  },
  {
    id: 'dragon-shield',
    name: 'Dragon Shield',
    blurb: 'Matte & Perfect Fit sleeves, deck boxes',
    domain: 'dragonshield.com',
    officialUrl: 'https://dragonshield.com/collections/all',
  },
  {
    id: 'ultimate-guard',
    name: 'Ultimate Guard',
    blurb: 'Sleeves, deck boxes, and storage',
    domain: 'ultimateguard.com',
    officialUrl: 'https://www.ultimateguard.com/en/',
  },
  {
    id: 'gamegenic',
    name: 'Gamegenic',
    blurb: 'Modern deck boxes, sleeves, and playmats',
    domain: 'gamegenic.com',
    officialUrl: 'https://www.gamegenic.com',
  },
  {
    id: 'kmc',
    name: 'KMC',
    blurb: 'Perfect Fit and Hyper Mat sleeves',
    domain: 'kmcsleeves.com',
    officialUrl: 'https://www.kmcsleeves.com',
  },
  {
    id: 'bcw',
    name: 'BCW Supplies',
    blurb: 'Storage boxes, sleeves, and toploaders',
    domain: 'bcwsupplies.com',
    officialUrl: 'https://www.bcwsupplies.com',
  },
  {
    id: 'legion',
    name: 'Legion Supplies',
    blurb: 'Now part of Ultra PRO — sleeves, deck boxes, and playmats',
    domain: 'ultrapro.com',
    officialUrl: 'https://www.ultrapro.com/collections/legion-supplies',
  },
  {
    id: 'inked-gaming',
    name: 'Inked Gaming',
    blurb: 'Custom playmats and accessories',
    domain: 'inkedgaming.com',
    officialUrl: 'https://www.inkedgaming.com',
  },
]
