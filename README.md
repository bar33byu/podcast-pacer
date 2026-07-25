# Podcast Pacer

Podcast Pacer turns completed or archived podcast series into personal feeds that release episodes on a new schedule. A listener chooses a start date and a pace from 1 to 10 episodes per week, then subscribes to the resulting permanent RSS URL in Apple Podcasts, Overcast, or another app that accepts custom feeds.

Production: [pacer.lavalane.org](https://pacer.lavalane.org)

## Curated collections

- **Jesus the Christ** — the complete 42-chapter recording of James E. Talmage's book.
- **The Book of Mormon** — Bradley Ross's 2025 read-along based on the public-domain text, beginning with 1 Nephi 1 and excluding the introductory episode.
- **The Old Testament** — Bradley Ross's complete New English Translation reading, assembled from the numbered full-text recordings and seven completion episodes.

The service is intentionally stateless. It has no user accounts or database: the collection slug and query parameters in a feed URL completely define that listener's schedule.

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

## Local development

Requirements: a current Node.js installation and npm.

```bash
npm install
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

## Current scope

Podcast Pacer supports the owner-curated collections above. Arbitrary user-provided feeds are not currently accepted. A future “pace another podcast” feature would require signed stateless configuration tokens and strict protection against private-network and malicious upstream URLs.

The original PHP application should remain available only during migration of any existing subscribers. New subscriptions should be created at `pacer.lavalane.org`.
