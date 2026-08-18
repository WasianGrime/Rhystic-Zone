// A React app running in the browser can't pull magic.wizards.com's own
// articles in live (they don't expose a public API, and their page content
// blocks cross-origin fetches), so this is a hand-captured snapshot of real
// headlines with their real, verified article URLs, refreshed periodically.
// Every card links out to the official article on wizards.com.
export const NEWS_SNAPSHOT_DATE = '2026-08-14'

const BASE = 'https://magic.wizards.com'

export const NEWS_CATEGORIES = [
  { label: 'Latest News', href: `${BASE}/en/news` },
  { label: 'Announcements', href: `${BASE}/en/news/announcements` },
  { label: 'Behind the Scenes', href: `${BASE}/en/news/feature` },
  { label: 'Making Magic', href: `${BASE}/en/news/making-magic` },
  { label: 'MTG Arena News', href: `${BASE}/en/news/mtg-arena` },
  { label: 'Card Previews', href: `${BASE}/en/news/card-preview` },
]

export const NEWS_ARTICLES = [
  {
    category: 'Announcements',
    title: 'Banned and Restricted Announcement – August 10, 2026',
    blurb: 'Statements regarding Standard, Legacy, and Vintage. Changes effective August 10, 2026.',
    href: `${BASE}/en/news/announcements/banned-and-restricted-august-10-2026`,
  },
  {
    category: 'Announcements',
    title: 'Pauper Format Check-In – August 10, 2026',
    blurb: 'Gavin discusses the state of Pauper and the results of recent major Pauper events.',
    href: `${BASE}/en/news/announcements/pauper-format-check-in-august-10-2026`,
  },
  {
    category: 'Announcements',
    title: 'Magic: The Gathering | The Hobbit Update Bulletin',
    blurb: 'Rules changes and updates arriving with Magic: The Gathering | The Hobbit.',
    href: `${BASE}/en/news/announcements/the-hobbit-update-bulletin`,
  },
  {
    category: 'Making Magic',
    title: 'Playtesting',
    blurb: 'A behind-the-scenes look at how designers draft, revise, and hone new mechanics.',
    href: `${BASE}/en/news/making-magic/playtesting`,
  },
  {
    category: 'Announcements',
    title: 'Secret Lair: A Marvelous Mathoms Superdrop',
    blurb: 'The Hobbit comes to Secret Lair on August 17, 2026.',
    href: `${BASE}/en/news/announcements/secret-lair-a-marvelous-mathom-superdrop`,
  },
  {
    category: 'Feature',
    title: 'Magic: The Gathering | The Hobbit Prerelease Guide',
    blurb: 'Goblins, Dragons, and Bears — Prerelease events start August 7.',
    href: `${BASE}/en/news/feature/the-hobbit-prerelease-guide`,
  },
  {
    category: 'Feature',
    title: "Designing All the Dwarves of Magic: The Gathering | The Hobbit",
    blurb: 'Annie Sardelis on uniting the legendary Dwarves in one Commander deck.',
    href: `${BASE}/en/news/feature/designing-all-the-dwarves-of-the-hobbit`,
  },
  {
    category: 'Feature',
    title: "What's Inside Mystery Booster Commander Edition?",
    blurb: 'What do Joven and Chandler, Jeweled Amulet, and Overcooked have in common?',
    href: `${BASE}/en/news/feature/whats-inside-mystery-booster-commander-edition`,
  },
  {
    category: 'Announcements',
    title: 'Everything Announced for the Magic Multiverse in 2027',
    blurb: 'A new plane, a fan-favorite crossover, and everything revealed at MagicCon: Amsterdam.',
    href: `${BASE}/en/news/announcements/everything-announced-for-the-magic-multiverse-in-2027`,
  },
  {
    category: 'MTG Arena',
    title: 'MTG Arena Announcements – August 10, 2026',
    blurb: 'Catch up with the latest info and events on MTG Arena.',
    href: `${BASE}/en/news/mtg-arena/announcements-august-10-2026`,
  },
]
