import type { PodcastSource, SourceKey } from "@/lib/podcast-types";

export const podcastSources = {
  "jesus-the-christ-source": {
    key: "jesus-the-christ-source",
    feedUrl: "https://feeds.feedburner.com/JesusTheChrist",
    enabled: true,
  },
  "come-follow-me-read-along-source": {
    key: "come-follow-me-read-along-source",
    feedUrl: "https://anchor.fm/s/a1a1c88/podcast/rss",
    enabled: true,
  },
} as const satisfies Record<SourceKey, PodcastSource>;

export function getPodcastSource(key: SourceKey): PodcastSource | undefined {
  return podcastSources[key];
}
