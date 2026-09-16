import { useState } from 'react'
import { SHOP_BRANDS } from '../data/shopBrands'
import { SHOP_CATEGORIES } from '../data/shopCategories'
import { tcgplayerSearchUrl, ebaySearchUrl, amazonSearchUrl } from '../api/shopLinks'

export default function Shop() {
  const [brandId, setBrandId] = useState(null)
  const [categoryId, setCategoryId] = useState(null)

  const brand = SHOP_BRANDS.find((b) => b.id === brandId) || null
  const category = SHOP_CATEGORIES.find((c) => c.id === categoryId) || null

  const searchTerms = [brand?.name, category?.query || 'accessories', 'mtg'].filter(Boolean).join(' ')

  return (
    <div className="page">
      <section className="hero">
        <h1>Shop</h1>
        <p>
          Sleeves, deck boxes, playmats, and more from the brands Commander players actually use.
          Pick a brand or a category below — results open as a real, current search on TCGplayer,
          eBay, or Amazon (this site doesn&rsquo;t run its own storefront).
        </p>
      </section>

      <h2>Popular Brands</h2>
      <div className="shop-brand-grid">
        <button
          className={`shop-brand-card ${!brandId ? 'active' : ''}`}
          onClick={() => setBrandId(null)}
        >
          <span className="shop-brand-name">All Brands</span>
          <span className="shop-brand-blurb">Browse everything</span>
        </button>
        {SHOP_BRANDS.map((b) => (
          <button
            key={b.id}
            className={`shop-brand-card ${brandId === b.id ? 'active' : ''}`}
            onClick={() => setBrandId(b.id === brandId ? null : b.id)}
          >
            <img
              className="shop-brand-logo"
              src={`https://www.google.com/s2/favicons?domain=${b.domain}&sz=64`}
              alt=""
              loading="lazy"
            />
            <span className="shop-brand-name">{b.name}</span>
            <span className="shop-brand-blurb">{b.blurb}</span>
          </button>
        ))}
      </div>

      <h2>Shop by Category</h2>
      <div className="shop-category-row">
        <button
          className={`shop-category-chip ${!categoryId ? 'active' : ''}`}
          onClick={() => setCategoryId(null)}
        >
          All Categories
        </button>
        {SHOP_CATEGORIES.map((c) => (
          <button
            key={c.id}
            className={`shop-category-chip ${categoryId === c.id ? 'active' : ''}`}
            onClick={() => setCategoryId(c.id === categoryId ? null : c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <section className="shop-results">
        <h2>
          {brand ? brand.name : 'All Brands'}
          {category ? ` — ${category.label}` : ''}
        </h2>
        <p className="section-hint">Searching for &ldquo;{searchTerms}&rdquo;</p>
        <div className="shop-search-links">
          {brand && (
            <a className="primary-button" href={brand.officialUrl} target="_blank" rel="noopener noreferrer">
              Shop {brand.name}&rsquo;s official site →
            </a>
          )}
          <a
            className={brand ? 'secondary-button' : 'primary-button'}
            href={tcgplayerSearchUrl(searchTerms)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Search on TCGplayer →
          </a>
          <a
            className="secondary-button"
            href={ebaySearchUrl(searchTerms)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Search on eBay →
          </a>
          <a
            className="secondary-button"
            href={amazonSearchUrl(searchTerms)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Search on Amazon →
          </a>
        </div>
      </section>
    </div>
  )
}
