import { listEnabledCollections } from "@/lib/collection-config";
import { PacerSetup } from "@/components/pacer-setup";
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
          <p className="eyebrow">A calmer way through a great series</p>
          <h1>Listen from the beginning. Let the next episode come to you.</h1>
          <p className="hero-copy">
            Create a personal podcast feed that releases an archive at your
            pace—without hunting for the next episode or filling your queue all
            at once.
          </p>
          <a className="primary-link" href="#collections">
            Choose a collection
            <span aria-hidden="true">↓</span>
          </a>
        </div>

        <div className="pace-visual" aria-hidden="true">
          <span className="pace-line" />
          {["Now", "Next", "Later"].map((label, index) => (
            <span className="pace-stop" key={label}>
              <i style={{ animationDelay: `${index * 180}ms` }} />
              <small>{label}</small>
            </span>
          ))}
        </div>
      </section>

      <section className="collections-section" id="collections">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Curated collections</p>
            <h2>Where would you like to begin?</h2>
          </div>
          <p>
            Each paced edition is separate from the original podcast, with a
            schedule designed around you.
          </p>
        </div>

        <div className="collection-grid">
          {collections.map((collection) => (
            <article className="collection-card" key={collection.slug}>
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
                  <a className="setup-link" href={`#setup-${collection.slug}`}>Set your pace →</a>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="custom-podcast-note">
          <div>
            <span className="beta-label">Later</span>
            <h3>Have another finished series in mind?</h3>
            <p>
              A beta tool for pacing another podcast—such as a limited series
              you missed—is planned after these collections are ready.
            </p>
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
