# Rhystic Zone

A Magic: The Gathering Commander hub and deck builder — browse top commanders ranked by live popularity, build a deck against real Scryfall data, get card recommendations grouped by playstyle, and check your deck for infinite combos.

## Features

- **Top Commanders** - live-ranked commander grid (Scryfall's `edhrec_rank`) with infinite scroll, color-identity filtering, and a "new rankings available" refresh prompt
- **Commander detail pages** - full card text, market price, buy links (TCGplayer, Cardmarket, Cardhoarder, PriceCharting, eBay), every printing (click to switch which one you're viewing), and popular infinite combos in that color identity
- **Deck builder** - set a commander, search-add cards with singleton/color-identity enforcement, sort the list by type/name/mana value, mana curve + color distribution charts, running price total, decklist export
- **Recommendations** - a Top Picks grid plus horizontally-scrolling rows grouped by playstyle (Ramp, Removal, Card Draw, Counterspells, Tokens, Lifegain, Reanimator, Aristocrats, Stax); adding a card auto-backfills the row with the next pick
- **Infinite combo detection** - checks your current decklist against [Commander Spellbook](https://commanderspellbook.com), showing combos you've already assembled and combos one card away (with a one-click add for the missing piece)
- **Global search** - jump straight to a card, or hit Enter to see every card matching a name
- **Magic News** — snapshot of official Wizards of the Coast headlines with a staleness indicator, since the site can't be pulled in live
- **Settings** - light/dark/auto theme, five accent color palettes, saved to your browser

Decks are saved locally in your browser (`localStorage`) — there's no backend or account system.

## Tech stack

- [React](https://react.dev) + [Vite](https://vitejs.dev)
- [React Router](https://reactrouter.com)
- [Scryfall API](https://scryfall.com/docs/api) for all card data, images, and pricing
- [Commander Spellbook API](https://commanderspellbook.com) for combo detection

No backend — it's a static single-page app that talks directly to both public APIs from the browser.

## Getting started

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`.

```bash
npm run build
```

Builds a static `dist/` folder ready to deploy anywhere.

## Deploying

This is a static Vite app, so it deploys to any static host. [Vercel](https://vercel.com) or [Netlify](https://netlify.com) are the easiest — connect this repo and it auto-detects the build. Both `vercel.json` and `public/_redirects` are already included so client-side routing (e.g. `/commander/:name`, `/builder`) works correctly on refresh.

## Attribution

Card data, images, and prices are provided by [Scryfall](https://scryfall.com). Combo data is provided by [Commander Spellbook](https://commanderspellbook.com), unofficial Fan Content permitted under Wizards of the Coast's Fan Content Policy. This project is not affiliated with, endorsed by, or sponsored by Wizards of the Coast.
