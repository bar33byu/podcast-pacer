import { listEnabledCollections } from "@/lib/collection-config";
import { PacerSetup } from "@/components/pacer-setup";
import { CustomFeedSetup } from "@/components/custom-feed-setup";
import Image from "next/image";

export default function Home() {
  const collections = listEnabledCollections();

  return (
    <main>
      <section className="hero">
        <nav className="nav-shell" aria-label="Primary navigation">
          <a className="brand" href="#top" aria-label="Podcast Pacer home">
            <span className="brand-mark" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </span>
            <span>Podcast Pacer</span>
          </a>
          <a className="nav-link" href="#how-it-works">
            How it works
          </a>
        </nav>

        <div className="hero-content" id="top">
          <p className="eyebrow">Listen now or set your pace</p>
          <h1>Great books, ready when you are.</h1>
          <p className="hero-copy">
            Play any episode in your browser, or create a personal feed that
            delivers the series a few episodes at a time.
          </p>
          <a className="primary-link" href="#collections">
            Choose a podcast
            <span aria-hidden="true">↓</span>
          </a>
        </div>
      </section>

      <section className="collections-section" id="collections">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Curated collections</p>
            <h2>Where would you like to begin?</h2>
          </div>
          <p>
            Every episode is ready to play here. Choose a series to listen now
            or have it delivered on a schedule designed around you.
          </p>
        </div>

        <div className="collection-grid">
          {collections.map((collection) => (
            <a
              className="collection-card"
              href={`#setup-${collection.slug}`}
              key={collection.slug}
              aria-label={`Explore ${collection.displayName}, listen to episodes, and set a pace`}
            >
              <div className="collection-cover collection-cover-artwork">
                <Image
                  className="collection-cover-image"
                  src={collection.artworkPath}
                  alt={`${collection.displayName} podcast cover`}
                  fill
                  sizes="(max-width: 620px) 100vw, (max-width: 900px) 40vw, 236px"
                />
              </div>
              <div className="collection-content">
                <p className="collection-label">{collection.shortLabel}</p>
                <h3>{collection.displayName}</h3>
                <p>{collection.description}</p>
                <div className="collection-footer">
                  <span>{collection.defaultEpisodesPerWeek}/week suggested</span>
                  <span className="setup-link">Listen &amp; set your pace →</span>
                </div>
              </div>
            </a>
          ))}
        </div>

        <div className="custom-podcast-note">
          <div>
            <span className="beta-label">Beta</span>
            <h3>Have another finished series in mind?</h3>
            <p>
              Try an unaffiliated example or bring an HTTPS RSS or Apple Podcasts
              link, then preview the source before creating a feed.
            </p>
            <a className="setup-link" href="#custom-feed">Pace another podcast →</a>
          </div>
        </div>
      </section>

      {collections.map((collection) => (
        <PacerSetup
          key={collection.slug}
          slug={collection.slug}
          displayName={collection.displayName}
          defaultEpisodesPerWeek={collection.defaultEpisodesPerWeek}
        />
      ))}

      <CustomFeedSetup />

      <section className="how-section" id="how-it-works">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">How it works</p>
            <h2>Your archive becomes an active feed.</h2>
          </div>
        </div>
        <ol className="step-grid">
          <li>
            <span>1</span>
            <h3>Pick a collection</h3>
            <p>Choose a complete book, a focused 2025 read-along, or the Old Testament archive.</p>
          </li>
          <li>
            <span>2</span>
            <h3>Choose your pace</h3>
            <p>Decide how many episodes should arrive each week.</p>
          </li>
          <li>
            <span>3</span>
            <h3>Add one feed</h3>
            <p>Subscribe in Overcast and let new episodes appear on schedule.</p>
          </li>
        </ol>
      </section>

      <footer>
        <span>Podcast Pacer</span>
        <span>Built for thoughtful listening.</span>
      </footer>
    </main>
  );
}
