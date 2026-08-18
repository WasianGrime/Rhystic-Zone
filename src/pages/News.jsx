import { NEWS_ARTICLES, NEWS_CATEGORIES, NEWS_SNAPSHOT_DATE } from '../data/newsArticles'

const STALE_AFTER_DAYS = 3

function daysSince(dateString) {
  const then = new Date(`${dateString}T00:00:00`)
  const now = new Date()
  return Math.max(0, Math.floor((now - then) / (1000 * 60 * 60 * 24)))
}

export default function News() {
  const age = daysSince(NEWS_SNAPSHOT_DATE)
  const isStale = age >= STALE_AFTER_DAYS
  const ageLabel = age === 0 ? 'today' : `${age} day${age === 1 ? '' : 's'} ago`

  return (
    <div className="page">
      <section className="hero">
        <h1>Magic News</h1>
        <p>
          Straight from Wizards of the Coast&rsquo;s official Daily MTG news hub. Browsers block
          this site from pulling their articles in live, so this is a snapshot of recent
          headlines — every card links out to the real article on wizards.com.
        </p>
        <a
          className="primary-button"
          href="https://magic.wizards.com/en/news"
          target="_blank"
          rel="noopener noreferrer"
        >
          View all official news →
        </a>
      </section>

      <p className={`freshness-note ${isStale ? 'stale' : ''}`}>
        {isStale ? (
          <>
            This snapshot is {ageLabel} old and may be missing newer articles — visit the{' '}
            <a href="https://magic.wizards.com/en/news" target="_blank" rel="noopener noreferrer">
              official news hub
            </a>{' '}
            for anything more recent.
          </>
        ) : (
          <>Snapshot captured {NEWS_SNAPSHOT_DATE} ({ageLabel}).</>
        )}
      </p>

      <div className="news-categories">
        {NEWS_CATEGORIES.map((c) => (
          <a key={c.href} className="news-category-chip" href={c.href} target="_blank" rel="noopener noreferrer">
            {c.label}
          </a>
        ))}
      </div>

      <div className="news-grid">
        {NEWS_ARTICLES.map((a) => (
          <a key={a.href} className="news-card" href={a.href} target="_blank" rel="noopener noreferrer">
            <span className="news-card-tag">{a.category}</span>
            <h3>{a.title}</h3>
            <p>{a.blurb}</p>
          </a>
        ))}
      </div>
    </div>
  )
}
