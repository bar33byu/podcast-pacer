import { buildFeed } from "@/lib/feed-builder";
import { FeedError } from "@/lib/feed-error";
import { fetchSourceFeed } from "@/lib/feed-fetcher";
import { getPodcastCollection } from "@/lib/collection-config";
import { scheduleEpisodes, type PaceSettings } from "@/lib/pacing";
import { parseRss } from "@/lib/rss-parser";
import { getPodcastSource } from "@/lib/source-config";

export async function preparePodcast(slug: string, settings: PaceSettings, now = new Date()) {
  const collection = getPodcastCollection(slug);
  if (!collection?.enabled) throw new FeedError("Collection not found.", 404);
  const source = getPodcastSource(collection.sourceKey);
  if (!source?.enabled) throw new FeedError("Podcast source is unavailable.", 503);
  const parsed = parseRss(await fetchSourceFeed(source));
  const episodes = parsed.episodes
    .filter((episode) => !collection.publicationWindowStart || episode.originalCalendarDate >= collection.publicationWindowStart)
    .filter((episode) => !collection.publicationWindowEnd || episode.originalCalendarDate < collection.publicationWindowEnd)
    .sort((a, b) => a.originalDate.getTime() - b.originalDate.getTime());
  if (!episodes.length) throw new FeedError("No episodes matched this collection.", 502);
  const scheduled = scheduleEpisodes(episodes, settings);
  return { collection, parsed, scheduled, feed: buildFeed(parsed, collection, settings, scheduled, now) };
}
