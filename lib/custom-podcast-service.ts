import { createHash } from "node:crypto";
import { Temporal } from "@js-temporal/polyfill";

import { fetchCustomFeed, resolveSourceInput, validateCustomUrlShape } from "@/lib/custom-feed-fetcher";
import { verifyCustomFeedToken } from "@/lib/custom-feed-token";
import type { CustomFeedInspection, CustomFeedPayloadV1 } from "@/lib/custom-feed-types";
import { FeedError } from "@/lib/feed-error";
import { parsePaceSettings, scheduleEpisodes } from "@/lib/pacing";
import { parseRss, type ParsedEpisode, type ParsedFeed } from "@/lib/rss-parser";
import { PUBLIC_ORIGIN } from "@/lib/site-config";

export function customEpisodeIdentity(sourceGuid: string) {
  return createHash("sha256").update(sourceGuid).digest("hex").slice(0, 24);
}

function sortedEpisodes(parsed: ParsedFeed) {
  return [...parsed.episodes].sort((a, b) =>
    a.originalDate.getTime() - b.originalDate.getTime()
    || a.sourceGuid.localeCompare(b.sourceGuid),
  );
}

function parseExistingCustomUrl(input: string): CustomFeedPayloadV1 | undefined {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return undefined;
  }
  if (url.origin !== PUBLIC_ORIGIN) return undefined;
  const match = url.pathname.match(/^\/feed\/custom\/v1\/([^/]+)\.xml$/);
  if (!match) return undefined;
  return verifyCustomFeedToken(match[1]);
}

export function validateCustomPayload(payload: CustomFeedPayloadV1, now?: Temporal.Instant): CustomFeedPayloadV1 {
  if (payload.v !== 1) throw new FeedError("Custom feed version is unsupported.", 400);
  const source = validateCustomUrlShape(payload.source).toString();
  const settings = parsePaceSettings(new URLSearchParams({
    start: payload.start,
    rate: String(payload.rate),
    tz: payload.timezone,
  }), now);
  let after: string | undefined;
  let before: string | undefined;
  try {
    after = payload.after ? Temporal.PlainDate.from(payload.after).toString() : undefined;
    before = payload.before ? Temporal.PlainDate.from(payload.before).toString() : undefined;
  } catch {
    throw new FeedError("Choose valid original-publication date bounds.", 400);
  }
  if (after && before && Temporal.PlainDate.compare(after, before) >= 0) {
    throw new FeedError("The original-publication end date must be after the start date.", 400);
  }
  if (payload.resumeAfter && !/^[a-f0-9]{24}$/.test(payload.resumeAfter)) {
    throw new FeedError("The resume episode is invalid.", 400);
  }
  return {
    v: 1,
    source,
    ...settings,
    ...(after ? { after } : {}),
    ...(before ? { before } : {}),
    ...(payload.resumeAfter ? { resumeAfter: payload.resumeAfter } : {}),
  };
}

async function loadCustomSource(source: string) {
  const fetched = await fetchCustomFeed(source);
  const parsed = parseRss(fetched.xml, { skipInvalidEpisodes: true, requireAudioEnclosure: true });
  const episodes = sortedEpisodes(parsed);
  if (!episodes.length) throw new FeedError("No playable episodes were found in that feed.", 502);
  return { sourceUrl: fetched.sourceUrl, parsed, episodes };
}

export async function inspectCustomFeedInput(input: string): Promise<CustomFeedInspection> {
  const existing = parseExistingCustomUrl(input.trim());
  const resolvedSource = existing?.source ?? await resolveSourceInput(input);
  const { sourceUrl, parsed, episodes } = await loadCustomSource(resolvedSource);
  return {
    sourceUrl,
    title: parsed.title,
    author: parsed.author,
    artworkUrl: parsed.artworkUrl,
    episodeCount: episodes.length,
    firstPublished: episodes[0].originalCalendarDate,
    lastPublished: episodes.at(-1)!.originalCalendarDate,
    episodes: episodes.slice(0, 500).map((episode) => ({
      identity: customEpisodeIdentity(episode.sourceGuid),
      title: episode.title,
      originalDate: episode.originalCalendarDate,
    })),
    ...(existing ? {
      existingSettings: {
        start: existing.start,
        rate: existing.rate,
        timezone: existing.timezone,
        ...(existing.after ? { after: existing.after } : {}),
        ...(existing.before ? { before: existing.before } : {}),
        ...(existing.resumeAfter ? { resumeAfter: existing.resumeAfter } : {}),
      },
    } : {}),
  };
}

export function selectCustomEpisodes(episodes: ParsedEpisode[], payload: CustomFeedPayloadV1) {
  let selected = episodes.filter((episode) =>
    (!payload.after || episode.originalCalendarDate >= payload.after)
    && (!payload.before || episode.originalCalendarDate < payload.before),
  );
  if (payload.resumeAfter) {
    const index = selected.findIndex((episode) => customEpisodeIdentity(episode.sourceGuid) === payload.resumeAfter);
    if (index < 0) throw new FeedError("The selected resume episode is no longer available in the source feed.", 400);
    selected = selected.slice(index + 1);
  }
  if (!selected.length) throw new FeedError("No episodes remain within those selections.", 400);
  return selected;
}

export async function prepareCustomPodcast(payloadInput: CustomFeedPayloadV1, now = new Date()) {
  const payload = validateCustomPayload(payloadInput, Temporal.Instant.fromEpochMilliseconds(now.getTime()));
  const { parsed, episodes } = await loadCustomSource(payload.source);
  const selected = selectCustomEpisodes(episodes, payload);
  const scheduled = scheduleEpisodes(selected, {
    start: payload.start,
    rate: payload.rate,
    timezone: payload.timezone,
  });
  return { payload, parsed, scheduled };
}
