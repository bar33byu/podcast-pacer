# Personal Podcast Pacer — Rebuild Specification

Status: Proposed MVP specification  
Target platform: GitHub + Vercel Hobby  
Production hostname: `pacer.lavalane.org`  
Application stack: Match the existing Cantare TypeScript/Vercel conventions

## 1. Product summary

Personal Podcast Pacer creates separate, paced editions of curated podcast collections. A collection may represent an entire source feed or a bounded series extracted from a longer-running feed. A listener chooses a pacing start date and an episodes-per-week rate. The app returns a permanent RSS URL that publishes the collection gradually and behaves like an active podcast in Overcast and other standards-compliant podcast players.

The primary experience is a focused way to share two owner-curated collections safely and attractively:

1. The complete **Jesus the Christ** audiobook feed
2. **The Book of Mormon**, consisting only of episodes published during 2025 in the longer-running Come, Follow Me Read-along feed

Pacing another podcast remains a tertiary, advanced use case. It must not make the primary interface feel like a generic RSS utility.

## 2. Problem being solved

The existing PHP app reveals the first `N` old episodes while preserving their original publication dates and identifiers. This causes several user-facing problems:

- A newly created paced feed can appear dormant because its newest visible episode is years old.
- The original and paced subscriptions look nearly identical side by side.
- Reused episode GUIDs may cause confusing identity or deduplication behavior in podcast clients.
- The current show artwork may be delivered over HTTP, which can fail or be suppressed in modern clients.
- The generated response has no conditional-request or explicit caching support.
- The public endpoint accepts an arbitrary upstream URL without sufficient controls, creating server-side request forgery and abuse risk.

The rebuild must model the paced edition as a distinct show that actively publishes archive episodes on a deterministic schedule.

## 3. Goals

- Make a freshly created paced feed look active in Overcast.
- Give the paced edition a clear visual and metadata identity distinct from the original show.
- Present “Jesus the Christ” and “The Book of Mormon” as intentional, curated listening experiences rather than technical filters.
- Guarantee that the Book of Mormon collection never includes episodes outside its configured 2025 publication window.
- Generate stable feed URLs and stable episode GUIDs.
- Publish archive episodes according to predictable scheduled dates.
- Provide a polished, mobile-first setup and preview experience.
- Deploy automatically from GitHub using the same workflow and conventions as Cantare.
- Run within Vercel Hobby limits without a database or scheduled job.
- Keep the service portable by using `pacer.lavalane.org`, not a deployment-specific URL.
- Meet common RSS 2.0 and Apple Podcasts technical expectations.

## 4. Non-goals for MVP

- Making arbitrary user-supplied RSS feeds as prominent as the two curated collections.
- User accounts, saved feeds, or a database.
- Rehosting or proxying podcast audio.
- Submitting every personalized feed to a public podcast directory.
- Synchronizing listening progress between the original and paced subscriptions.
- Guaranteeing perfect side-by-side deduplication behavior in every podcast client. The same audio enclosure may appear in both subscriptions.
- Analytics beyond ordinary Vercel request logs.

## 5. Sources and curated collections

Model source feeds separately from the listener-facing collections derived from them. Store both in typed server-side configuration, not in user-editable query parameters.

### 5.1 Source feeds

1. **Jesus the Christ source**
   - Source feed: `https://feeds.feedburner.com/JesusTheChrist`
   - Stable source key: `jesus-the-christ-source`

2. **Come, Follow Me Read-along source**
   - Source feed: `https://anchor.fm/s/a1a1c88/podcast/rss`
   - Stable source key: `come-follow-me-read-along-source`

### 5.2 Curated collections

1. **Jesus the Christ — Complete Book**
   - Stable collection slug: `jesus-the-christ`
   - Source: `jesus-the-christ-source`
   - Episode window: entire valid source feed
   - Default rate: 3 episodes per week
   - Dedicated paced-edition title, description, and artwork required

2. **The Book of Mormon — 2025 Read-along**
   - Stable collection slug: `book-of-mormon-2025`
   - Source: `come-follow-me-read-along-source`
   - Original-publication calendar-date start: `2025-01-01`, inclusive
   - Original-publication calendar-date end: `2026-01-01`, exclusive
   - Default rate: 3 episodes per week
   - Dedicated title, description, and artwork identifying this as The Book of Mormon collection
   - The collection must not inherit unrelated years of Come, Follow Me episodes, even if a listener supplies additional query parameters

The 2025 date window is part of the collection definition and feed identity. It is not merely a UI default. Determine the original publication calendar date using the date and offset expressed in the source episode's valid RFC 2822 `<pubDate>`. Do not first convert the instant to UTC when deciding whether its source calendar year is 2025.

Each source configuration must include:

- Stable source key
- Source feed URL
- Enabled/disabled flag

Each collection configuration must include:

- Stable collection slug
- Stable source key
- Display name and paced-edition title
- Description shown in the web app
- HTTPS channel artwork URL
- Optional HTTPS episode-art fallback URL
- Inclusive original-publication calendar-date window start, optional
- Exclusive original-publication calendar-date window end, optional
- Default rate
- Enabled/disabled flag

Changing a display name or source URL must not change stable keys, slugs, or existing generated feed identities. Changing a collection's publication window is a breaking identity change and requires a new collection slug or feed API version.

### 5.3 Tertiary custom podcasts

The product should retain an advanced “Pace another podcast” path for finite or older series such as *Sold a Story*. This appears below the curated collections and is visually secondary.

Custom-feed behavior:

- Accept an HTTPS RSS feed URL only through the advanced flow.
- Let the listener preview the parsed show and episodes before generating a subscription URL.
- Let the listener optionally bound the collection by original publication dates.
- Use the same pacing, identity, artwork fallback, and validation pipeline as curated collections.
- Label the feature “Beta” until it passes the same client acceptance testing as curated feeds.
- Do not include a raw upstream URL directly in the permanent subscription URL. Use a versioned, signed, stateless configuration token as described in section 7.
- A custom feed is a convenience for individual listeners, not an owner-endorsed collection.

## 6. User experience

### 6.1 Landing page

The landing page introduces the idea in plain language: choose a listening collection, choose a pace, and add a personal paced edition to a podcast app.

Display one polished card per curated collection with:

- Artwork
- Show title
- One-sentence description
- “Create paced feed” primary action
- Optional link to the normal/original podcast

Do not lead with a raw RSS URL field.

Below the two primary cards, provide a quieter “Pace another podcast” action. It opens the advanced custom-feed flow and must not compete visually with the curated collections.

### 6.2 Feed setup flow

The setup UI contains:

1. Curated collection selection, or validated custom feed in the advanced flow
2. Pacing start date, defaulting to the listener's current local date
3. Episodes per week
4. A short explanation of the resulting schedule

For curated collections, do not expose the underlying source-feed date window as a routine control. An advanced “Start later in this collection” control may exclude early collection episodes, but it can never expand beyond the configured collection window.

For custom feeds, offer optional inclusive start and exclusive end dates based on original episode publication dates. The episode preview must make the selected range obvious before the feed is generated.

Allowed MVP rates: 1 through 7 episodes per week. Use a friendly selector with common choices rather than an unrestricted numeric input.

The browser's IANA timezone is detected automatically and stored in the generated URL. It may be shown under an advanced disclosure but does not need to be a prominent control. The pacing start date cannot be later than “today” in that timezone, ensuring the generated podcast always contains at least its first episode.

Before generating the feed, show examples such as:

> Your first episode will appear July 24. At 3 per week, the next episodes will appear July 26 and July 28.

### 6.3 Result screen

After generation, display:

- Distinct paced-edition artwork and title
- Permanent RSS URL in a read-only field
- Copy button with accessible success feedback
- Clear instructions for adding a URL manually in Overcast
- Preview of at least the next 10 source episodes, separated into “Available now” and “Coming next”
- Scheduled paced publication date for every previewed episode
- A warning that users should normally subscribe to either the original or paced edition, not both

An “Add to Overcast” deep link may be added only after its URL scheme is verified on a physical iPhone. Copying the feed URL remains the reliable primary path.

### 6.4 Visual design

- Mobile-first and comfortable on iPhone Safari
- Reuse Cantare's design tokens, typography, components, and light/dark theme behavior where appropriate
- Meet WCAG AA color contrast
- All controls have visible labels and keyboard focus states
- Do not use transient toast messages as the only form of important feedback
- Artwork must make the paced edition visibly different from the original show

## 7. Permanent URL contract

Production web app:

`https://pacer.lavalane.org/`

Versioned curated-collection feed endpoint:

`https://pacer.lavalane.org/feed/v1/{collectionSlug}.xml?start=YYYY-MM-DD&rate=N&tz=Area%2FCity&after=YYYY-MM-DD`

Versioned custom-feed endpoint:

`https://pacer.lavalane.org/feed/custom/v1/{signedConfigToken}.xml`

Parameters:

- `start`: required pacing start date
- `rate`: required integer from 1 through 7
- `tz`: required valid IANA timezone, normally detected by the browser
- `after`: optional inclusive original-publication-date filter

Rules:

- Parameter meanings under `/feed/v1/` are immutable.
- Normalize parameter order when the UI generates a URL: `start`, `rate`, `tz`, then `after`.
- Reject unknown parameters only if they could change feed behavior; harmless tracking parameters may be ignored.
- Never put Vercel preview, branch, commit, or `VERCEL_URL` hostnames into a generated feed URL.
- Construct the canonical URL from the configured production origin.
- If future behavior must break compatibility, add `/feed/v2/`; do not silently change `v1` scheduling or identity rules.
- The app is stateless. The URL completely defines the personalized feed.

Curated collection rules:

- `{collectionSlug}` resolves only a configured, enabled collection.
- `after` may narrow a curated collection but may never expand its configured publication window.
- The Book of Mormon endpoint always applies the inclusive 2025 start and exclusive 2026 start boundary before any listener-selected narrowing.

Custom token rules:

- The token contains a versioned canonical payload with source URL, pacing start, rate, timezone, optional original-date bounds, and a stable custom-feed title discriminator.
- Encode the payload using base64url and authenticate it with HMAC-SHA-256 using a Vercel server-only secret.
- Reject modified, malformed, oversized, expired-version, or unsupported tokens before any network request.
- Tokens do not need to expire; permanence is required for podcast subscriptions. Token format versioning provides migration control.
- The token prevents casual editing and keeps raw source URLs out of subscription URLs, but it is not encryption and must not contain secrets.
- Rotating the signing secret would break existing custom feeds. Store and back it up as durable production configuration.

## 8. Pacing algorithm

### 8.1 Source episode selection

1. Resolve the configured source feed for a curated collection, or validate the signed custom-feed configuration.
2. Fetch the resolved source feed using the controls in section 11.4.
3. Parse RSS XML while preserving namespaces and episode metadata.
4. Select channel `<item>` elements having a valid publication date and audio enclosure.
5. Apply the collection's configured inclusive start and exclusive end original-publication calendar-date bounds, if any. Compare the calendar date expressed by the source `<pubDate>` and its declared offset, not its UTC-converted date.
6. Apply any listener-selected bounds as additional narrowing filters. Listener input can never widen configured collection bounds.
7. Sort remaining episodes by original publication instant ascending. Use the stable source GUID as a tie-breaker, followed by enclosure URL.
8. Assign zero-based sequence index `i` to the sorted result.

Malformed episodes without a usable date or enclosure must be skipped and logged. They must not be silently assigned the current date. A missing source GUID uses the enclosure URL as its stable identity fallback.

### 8.2 Scheduled publication dates

For rate `r`, sequence index `i`, pacing start calendar date `S`, and IANA timezone `Z`:

`dayOffset = floor(i * 7 / r)`

`scheduledDate = local midnight on S + dayOffset calendar days in Z, converted to an instant`

Examples:

- 1/week: offsets 0, 7, 14, 21
- 2/week: offsets 0, 3, 7, 10
- 3/week: offsets 0, 2, 4, 7, 9, 11
- 7/week: offsets 0, 1, 2, 3, 4, 5, 6

Only include episodes whose scheduled instant is less than or equal to the current server instant. Because future start dates are rejected, the first episode is available immediately when a feed is generated.

Calendar-day arithmetic must happen in `Z`, including across daylight-saving transitions, and then be converted to an absolute instant. All calculations must be covered by boundary tests and must not depend on the Vercel function region's local timezone.

### 8.3 No background job required

The feed is calculated when requested. Podcast clients discover newly eligible episodes during normal refreshes. Vercel Cron is not required.

## 9. Feed identity and metadata rules

### 9.1 Channel identity

The output is a distinct paced edition, not merely a truncated copy.

Required channel changes:

- Set the configured paced-edition title.
- For custom feeds, derive a stable title such as “{Original title} — Paced Edition” and allow the setup preview to show it before token generation.
- Set a paced-edition description explaining that archive episodes are released on a personal schedule.
- Use dedicated HTTPS `<itunes:image href="...">` artwork.
- Provide a matching RSS `<image>` block over HTTPS.
- Add `<atom:link rel="self" type="application/rss+xml" href="{canonicalFeedUrl}">`.
- Set `<lastBuildDate>` to the most recent scheduled publication date represented by the feed.
- Set channel `<pubDate>` to the most recent scheduled publication date when the tag is included.
- Preserve appropriate author, language, explicit-rating, category, copyright, and funding metadata from the source.
- Remove source feed tags that incorrectly claim the source URL is the canonical URL of this paced edition.

### 9.2 Episode identity

Every output episode receives a deterministic paced-edition GUID:

`urn:lavalane:podcast-pacer:v1:{collectionIdentity}:{configHash}:{episodeHash}`

Where:

- `collectionIdentity` is the stable curated collection slug or a stable hash of the custom source identity and custom collection bounds.
- `configHash` is a stable lowercase hex SHA-256 prefix computed from canonical `start`, `rate`, `tz`, and listener-selected narrowing values. Curated collection bounds are included indirectly through the immutable collection identity.
- `episodeHash` is a stable lowercase hex SHA-256 prefix computed from the source GUID. If the source has no GUID, use its enclosure URL as the identity input.
- Use enough hash characters to make collisions impractical; minimum 24 hexadecimal characters per hash.
- Serialize as `<guid isPermaLink="false">`.

The same canonical paced-feed configuration and source episode must always produce the same GUID across requests, builds, and hosting migrations. Different pacing configurations intentionally produce different GUIDs.

### 9.3 Episode publication metadata

- Replace episode `<pubDate>` with its scheduled paced publication instant formatted as RFC 2822.
- Preserve the original title, enclosure, description/content, duration, episode number, season number, explicit rating, chapters, transcript links, and HTTPS episode artwork when valid.
- If episode artwork is missing or uses HTTP, replace it with the configured HTTPS paced-edition fallback artwork.
- Do not modify or proxy the enclosure URL in MVP.
- Audit source audio hosts before launch. Enclosure URLs must be publicly reachable and support the methods and byte-range behavior expected by podcast clients.
- The original publication instant may be retained in an internal preview model, but do not add a nonstandard RSS tag unless its namespace and purpose are documented.

### 9.4 Duplicate-subscription caveat

The original and paced shows reference the same audio files. Stable distinct GUIDs and artwork should distinguish them, but some clients may still deduplicate identical enclosure URLs. The UI must recommend choosing one edition. Rehosting audio solely to defeat deduplication is outside MVP scope.

## 10. HTTP behavior

Successful feed responses:

- Status `200`
- `Content-Type: application/rss+xml; charset=utf-8`
- `X-Content-Type-Options: nosniff`
- `Cache-Control: public, max-age=0, s-maxage=3600, stale-while-revalidate=86400`
- Strong `ETag` computed from the serialized response body
- `Last-Modified` equal to the most recent scheduled publication instant, or a deterministic source-refresh instant if no release has occurred

Conditional requests:

- Return `304 Not Modified` without a body when `If-None-Match` matches.
- Support `If-Modified-Since` when it can be implemented consistently.

Error responses:

- Use a small XML or plain-text error body for feed routes, not an HTML application error page.
- `400` for invalid configuration
- `404` for unknown/disabled podcast slug
- `502` when the configured source feed cannot be fetched or parsed
- `504` on upstream timeout
- Do not cache error responses for long periods

The preview API may return structured JSON with equivalent error codes.

## 11. Architecture

### 11.1 Framework

- Next.js App Router with strict TypeScript
- Match Cantare's supported Node.js and Next.js versions rather than independently pinning a second stack
- Use the Node.js Vercel runtime for XML parsing and cryptographic hashing, not Edge runtime
- Match Cantare's package manager, formatting, linting, test runner, component conventions, and CI checks
- Prefer server components for static/read-only content and client components only where interaction requires them

### 11.2 Suggested project organization

```text
app/
  page.tsx
  feed/v1/[collectionSlug]/route.ts
  feed/custom/v1/[signedConfigToken]/route.ts
  api/preview/v1/[collectionSlug]/route.ts
  api/custom-feed/inspect/route.ts
components/
  CollectionCard.tsx
  PacerForm.tsx
  CustomFeedForm.tsx
  FeedResult.tsx
  EpisodePreview.tsx
lib/
  source-config.ts
  collection-config.ts
  custom-feed-token.ts
  feed-fetcher.ts
  rss-parser.ts
  pacing.ts
  feed-identity.ts
  feed-builder.ts
  validation.ts
  http-cache.ts
public/
  artwork/
tests/
  fixtures/
```

Exact filenames may follow Cantare conventions, but feed fetching, pacing, identity, and serialization must remain independently testable modules.

The curated dynamic route receives a final segment such as `jesus-the-christ.xml`; it must require and remove the `.xml` suffix before resolving the configured collection slug. The custom route similarly removes `.xml` before verifying its token. A framework rewrite to suffix-free internal routes is also acceptable if the public URLs remain unchanged.

### 11.3 XML handling

- Use a maintained XML library that preserves RSS namespaces, CDATA/text content, and namespaced episode children.
- Disable external entity and DTD resolution.
- Do not transform RSS through an ordinary JSON representation if doing so loses ordering, namespaces, CDATA, or repeated elements.
- Serialize valid UTF-8 XML with an XML declaration.
- Never concatenate unescaped source strings into XML.

### 11.4 Upstream fetching

- Curated routes may fetch only URLs stored in the server-side source configuration.
- Custom routes may fetch only the HTTPS URL recovered from a valid signed token, and only after the public-network validation below succeeds.
- Use an explicit podcast-pacer User-Agent identifying `pacer.lavalane.org`.
- Abort upstream requests after 10 seconds.
- Follow at most three redirects and validate every redirect target before connecting.
- Enforce a reasonable maximum RSS response size, initially 10 MB.
- Verify the final response is successful and XML-like before parsing.
- Cache upstream fetches to reduce repeated origin traffic, while ensuring newly published source episodes appear within a reasonable period.

For custom source URLs:

- Require HTTPS and the default HTTPS port.
- Reject credentials, fragments, ambiguous host syntax, IP-literal hosts, and overlong URLs.
- Resolve DNS and reject loopback, private, link-local, carrier-grade NAT, multicast, documentation, reserved, and otherwise non-global IPv4/IPv6 targets.
- Prevent DNS rebinding by ensuring the actual outbound connection uses an address from the validated resolution result rather than performing an unrelated second lookup.
- Repeat validation for every redirect destination.
- Do not forward user cookies, authorization headers, or arbitrary request headers upstream.
- Keep this network-validation code isolated and security-tested. If the selected Vercel/Node HTTP stack cannot reliably pin validated DNS results, do not ship public custom feeds; fall back to owner-approved custom sources in server configuration.

## 12. Security and privacy

- Curated routes never accept user-controlled source URLs.
- The tertiary custom-feed flow accepts only HTTPS sources and must satisfy all signed-token and public-network validation requirements in sections 7 and 11.4.
- Do not expose an open proxy endpoint.
- Do not fetch user-controlled artwork or media server-side.
- Reject malformed dates, rates, and slugs before fetching upstream content.
- Parse XML with external entities disabled.
- Apply standard security headers to web pages.
- Store no listener data and use no cookies unless a future feature clearly requires them.
- If product analytics are added, disclose them and avoid putting full personalized feed query strings into analytics events.
- Treat feed URLs as shareable rather than secret; they contain preferences but no credentials.
- Apply rate limits to custom-feed inspection and generation endpoints if public traffic or abuse warrants it.

## 13. Testing requirements

### 13.1 Unit tests

- Pacing offsets for every allowed rate
- Before, exactly at, and after a scheduled release instant
- Month/year/leap-day boundaries
- Start dates in the past, present, and future
- IANA timezone validation and daylight-saving boundaries
- Inclusive `after` filtering
- Inclusive-start/exclusive-end collection-window filtering
- Book of Mormon results at both 2025 boundaries
- Proof that listener filters cannot widen a curated collection window
- Stable ordering when original dates match
- Deterministic GUIDs across repeated executions
- Different configurations produce different GUIDs
- RFC 2822 date formatting
- Query parsing and canonicalization
- Artwork fallback behavior
- Conditional ETag behavior
- Custom-token signing, verification, tamper rejection, and version rejection
- Custom URL and DNS-address validation, including IPv4 and IPv6 blocked ranges
- Redirect-chain validation and redirect limit

### 13.2 Fixture-based feed tests

Maintain sanitized XML fixtures covering:

- Both real source feed shapes
- A multi-year source fixture proving that only 2025 Book of Mormon collection episodes are selected
- iTunes, content, Atom, Podcasting 2.0, and other namespaced tags
- CDATA descriptions
- Channel and episode artwork
- Missing GUID fallback
- Missing/invalid date rejection
- Multiple enclosures or malformed enclosure
- HTTP episode artwork fallback
- Special XML characters and non-ASCII titles

Generated feed tests must parse the result back as XML and assert structure; snapshots alone are insufficient.

### 13.3 Route/integration tests

- Valid RSS response and headers
- Preview JSON matches feed eligibility and schedule
- Invalid rate/date/slug responses
- Custom token tampering and unsupported token versions
- Rejection of custom URLs resolving to non-public networks
- Upstream timeout and parse failure
- `304` response for matching ETag
- Canonical self-link contains the production hostname and normalized query
- No preview or deployment hostname leaks into generated XML

### 13.4 Browser tests

- Complete setup on an iPhone-sized viewport
- Generated URL updates correctly
- Copy action works with a fallback for restricted clipboard access
- Keyboard navigation and focus behavior
- Light/dark presentation if retained

### 13.5 Manual podcast-client acceptance

Before public launch, test clean subscriptions—not previously cached test feeds—in:

1. Overcast on a physical iPhone
2. Apple Podcasts
3. At least one independent client such as Pocket Casts

Verify:

- Channel artwork appears
- The paced title is distinct from the original
- Available episodes appear in expected order
- Dates show the paced schedule rather than original archive dates
- A newly scheduled episode appears after refresh without resubscribing
- Audio streams, seeks, and downloads successfully
- Removing and re-adding the same feed does not create unstable episode identities
- Subscribing to original and paced versions is tested and any remaining client-specific oddity is documented

Also validate representative output with at least one established podcast feed validator.

## 14. Deployment and domain

- Create a dedicated GitHub repository or migrate this repository after archiving the PHP implementation.
- Connect the production branch to a Vercel Hobby project.
- Every pull request receives a preview deployment.
- Only the production branch may update the production domain.
- Add `pacer.lavalane.org` to the Vercel project.
- Configure the required DNS CNAME with the existing DNS provider for `lavalane.org`.
- Keep the canonical origin in server-only configuration, with production set to `https://pacer.lavalane.org`.
- Vercel preview deployments must remain usable for UI and feed testing, but their generated pages should clearly indicate preview status and must not issue permanent subscription URLs pointing at themselves.

## 15. Migration from the PHP app

The existing URL is `https://lavalane.org/ppp/process_feed.php?...`.

Migration plan:

1. Build and validate the Vercel application without changing the current PHP installation.
2. Launch `pacer.lavalane.org` and test newly generated feeds in clean podcast-client subscriptions.
3. Replace the old PHP landing page with a permanent link or redirect to the new web app.
4. Keep `process_feed.php` available during a transition period.
5. For the two known source feeds, optionally translate old parameters to the closest `/feed/v1/` URL and issue a permanent redirect while preserving pacing settings.
6. Do not automatically translate arbitrary legacy custom-feed requests. Users must recreate those feeds through the new validation and signed-token flow.
7. Because the new pacing algorithm rewrites dates and identities, treat it as a new feed edition. Do not silently switch existing subscribed users unless client behavior has been tested.
8. Retain a small static migration notice at the old location for at least 90 days after launch.

## 16. Observability and operations

- Log structured upstream errors, parse errors, podcast slug, and response timing.
- Do not log unnecessary full query strings or client IP addresses in application logs.
- Include a lightweight health endpoint that checks application availability without fetching both upstream feeds.
- Provide a development-only diagnostic view showing calculated schedule, source identity, generated GUID, selected artwork, and validation warnings.
- Document how to disable a source show in configuration if its upstream feed becomes invalid.
- Document DNS and Vercel recovery steps so the hostname can be moved to another provider without changing subscriber URLs.

## 17. MVP acceptance criteria

The rebuild is ready to share when all of the following are true:

- Both curated collections can generate a permanent `pacer.lavalane.org` feed URL.
- The Book of Mormon collection contains only source episodes originally published from January 1 through December 31, 2025.
- The URL contains no arbitrary upstream source parameter.
- A feed created today displays recent paced dates in Overcast rather than appearing dormant.
- Channel and fallback episode artwork load over HTTPS in all three test clients.
- The original and paced subscriptions are clearly distinguishable by title and artwork.
- Episode GUIDs remain identical across repeated requests and redeployments for the same configuration.
- The next scheduled episode appears automatically after its release instant.
- XML, headers, enclosure playback, seeking, and downloads pass validation and manual tests.
- Upstream failures produce bounded, useful errors without leaking internals.
- Unit, fixture, route, and browser tests pass in CI.
- GitHub production deployments update the custom domain without changing feed URLs.
- The old PHP landing page directs users to the new application.
- If custom feeds ship in MVP, a validated older finite-series feed can be paced successfully while private, local, malformed, and redirect-based unsafe targets are rejected.

## 18. Deferred enhancements

- More owner-curated collections
- Custom pacing weekdays and release time
- Friendly opaque feed IDs backed by durable storage
- QR code for transferring a feed to a phone
- Verified one-tap podcast-client deep links
- Optional email reminder or setup handoff
- Admin UI for source and collection configuration
- Privacy-conscious aggregate usage metrics
- Additional languages
- Exportable OPML

## 19. Decisions to confirm before implementation

1. Final hostname: `pacer.lavalane.org` versus `feeds.lavalane.org`.
2. Final paced-edition names and descriptions for both shows.
3. Final dedicated artwork for both paced editions.
4. Whether the public UI should expose all integer rates from 1–7 or a smaller curated set.
5. Whether the old PHP endpoint has outside subscribers who require a longer compatibility window.

