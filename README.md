# Podcast Pacer

Podcast Pacer turns completed or archived podcast series into personal feeds that release episodes on a new schedule. A listener chooses a start date and a pace from 1 to 10 episodes per week, then subscribes to the resulting permanent RSS URL in Apple Podcasts, Overcast, or another app that accepts custom feeds.

Production: [pacer.lavalane.org](https://pacer.lavalane.org)

## Curated collections

- **Jesus the Christ** — the complete 42-chapter recording of James E. Talmage's book.
- **The Book of Mormon** — Bradley Ross's 2025 read-along based on the public-domain text, beginning with 1 Nephi 1 and excluding the introductory episode.
- **The Old Testament** — Bradley Ross's complete New English Translation reading, assembled from the numbered full-text recordings and seven completion episodes.

The service is intentionally stateless. It has no user accounts or database: curated URL parameters or a signed custom-feed token completely define that listener's schedule.

## Custom feeds

The beta “Pace another podcast” flow accepts either an HTTPS RSS URL or an Apple Podcasts show URL. It includes three explicitly unaffiliated examples:

- Exploring Mormon Thought
- Sold a Story
- The Miracle Files — True Miracle Stories

The app inspects the source before generating a feed and displays its publisher, playable episode count, and original publication range. Listeners may narrow the source by original publication dates or continue after an exact episode.

Custom feeds use a permanent signed URL:

```text
https://pacer.lavalane.org/feed/custom/v1/{signedToken}.xml
```

The token contains the source URL, pacing settings, optional date bounds, and optional resume point. HMAC-SHA-256 prevents modification without requiring accounts or a database. Tokens are authenticated, not encrypted, and must not contain secrets.

Generated channel and episode metadata labels the result as an unofficial paced edition. The original publisher's author, copyright, show link, descriptions, and audio enclosure URLs remain intact. Podcast Pacer does not proxy or rehost audio. Each displayed episode description begins with its original publication date and an unaffiliated-source notice.

To change a custom feed later, follow the “Adjust this paced feed” link added to its channel and episode descriptions, or paste its Podcast Pacer URL into the form. The adjustment link returns to the custom-feed interface with the existing URL already loaded. The app verifies and decodes the token, restores its settings, and creates a replacement URL. Choose the last completed episode to resume without replaying the archive, subscribe to the replacement, and remove the old subscription. Keeping the exact same URL while changing settings would require durable server-side state and is intentionally unsupported.

## How pacing works

A curated feed URL has this form:

```text
https://pacer.lavalane.org/feed/v1/{collection}.xml?start=YYYY-MM-DD&rate=N&tz=Area%2FCity
```

Episodes are sorted in original publication order and assigned a deterministic scheduled date. For episode index `i` and weekly rate `r`, the day offset is `floor(i * 7 / r)`. Only episodes whose scheduled instant has arrived appear in the RSS response.

Each paced episode receives a deterministic GUID derived from the feed version, collection slug, pacing settings, and source episode identity. The same feed URL therefore produces the same episode identities after refreshes and deployments.

No scheduled job is required. Podcast clients discover newly eligible episodes when they refresh the feed.

## RSS compatibility and versioning

The public `/feed/v1/` path and the `v1` component of episode GUIDs define the first compatibility contract. Existing v1 subscriptions must keep the following behavior:

- Query parameter meanings and canonical order
- Curated collection membership and ordering
- Time-zone interpretation and pacing-date calculation
- Scheduled episode publication dates
- Episode GUID inputs, hashing, and format

Backward-compatible fixes may be made within v1, including security fixes, metadata preservation, caching improvements, accessibility changes, and UI changes that do not alter an existing feed's episode identity or schedule.

A change that would reorder episodes, alter collection boundaries, reinterpret a parameter, change scheduled dates, or generate different GUIDs is breaking. It must be implemented at a new endpoint such as `/feed/v2/`, with `urn:lavalane:podcast-pacer:v2:...` GUIDs. The v1 route must remain deployed for existing subscribers; the website may offer v2 to newly generated subscriptions without migrating old URLs silently.

Custom feeds have an independent `/feed/custom/v1/` contract and `urn:lavalane:podcast-pacer:custom:v1:` GUID namespace. A breaking custom-token, selection, scheduling, or identity change requires `/feed/custom/v2/`. The v1 token verifier, route, and behavior must remain available because podcast clients retain the original URL.

Golden regression coverage in `lib/feed-engine.test.ts` locks representative v1 URLs, schedule offsets, and GUID output. Do not update those expectations to accommodate a new algorithm—add a versioned implementation and new tests instead.

## Architecture

- Next.js App Router and strict TypeScript
- React client component for schedule setup and subscription actions
- Node.js route handlers for preview JSON and RSS generation
- `@js-temporal/polyfill` for calendar and time-zone-safe scheduling
- `@xmldom/xmldom` for namespace-preserving RSS parsing and serialization
- Vercel Hobby hosting with `main` as production and `develop` as preview
- Canonical subscription origin fixed to `https://pacer.lavalane.org`

Important modules:

- `lib/source-config.ts` — approved upstream podcast feeds
- `lib/collection-config.ts` — curated collections and episode boundaries
- `lib/pacing.ts` — validation and deterministic scheduling
- `lib/rss-parser.ts` — safe RSS parsing and source metadata extraction
- `lib/feed-builder.ts` — paced feed metadata, dates, artwork, and GUIDs
- `lib/podcast-service.ts` — source selection, filtering, sorting, and feed preparation
- `lib/custom-feed-fetcher.ts` — Apple resolution, URL validation, DNS checks, pinned HTTPS fetching, redirects, timeouts, and size limits
- `lib/custom-feed-token.ts` — canonical HMAC-signed custom v1 tokens
- `lib/custom-podcast-service.ts` — custom inspection, bounds, resume selection, and scheduling
- `lib/custom-feed-builder.ts` — unofficial metadata, original-date context, artwork, and custom GUIDs

## Local development

Requirements: a current Node.js installation and npm.

```bash
npm install
npm run dev
```

The custom-feed beta requires a durable signing secret of at least 32 bytes. Inspection is disabled too when the secret is missing, so an incomplete deployment cannot become an unsigned public fetch service:

```bash
# PowerShell example for the current terminal
$env:CUSTOM_FEED_SIGNING_SECRET="replace-with-a-long-random-secret"
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Generated subscription links still use the canonical production hostname unless `NEXT_PUBLIC_PODCAST_PACER_ORIGIN` is intentionally overridden.

Validation commands:

```bash
npm run test:run
npm run lint
npm run build
```

## Deployment workflow

- Work and preview deployments use `develop`.
- Production deployments use `main`.
- Merge tested `develop` changes into `main` to deploy them at `pacer.lavalane.org`.
- Never place a Vercel preview hostname into a permanent subscription URL.
- Configure the same durable `CUSTOM_FEED_SIGNING_SECRET` for Preview and Production in Vercel and keep a secure backup. Rotating or losing it invalidates existing custom feed URLs.

## Current scope

Podcast Pacer supports the owner-curated collections above and beta custom HTTPS feeds. Custom requests reject credentials, fragments, nonstandard ports, IP-literal hosts, non-public DNS results, unsafe redirect destinations, responses over 10 MB, and requests exceeding 10 seconds. The validated public address is pinned for the outbound connection to prevent DNS rebinding.

The original PHP application should remain available only during migration of any existing subscribers. New subscriptions should be created at `pacer.lavalane.org`.
