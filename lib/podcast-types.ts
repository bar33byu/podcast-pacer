export type SourceKey =
  | "jesus-the-christ-source"
  | "come-follow-me-read-along-source";

export type CollectionSlug =
  | "jesus-the-christ"
  | "book-of-mormon-2025"
  | "old-testament-full-text";

export type PodcastSource = {
  key: SourceKey;
  feedUrl: string;
  enabled: boolean;
};

export type PodcastCollection = {
  slug: CollectionSlug;
  sourceKey: SourceKey;
  displayName: string;
  pacedTitle: string;
  description: string;
  shortLabel: string;
  artworkPath: string;
  publicationWindowStart?: string;
  publicationWindowEnd?: string;
  titleIncludePatterns?: readonly string[];
  defaultEpisodesPerWeek: number;
  enabled: boolean;
};
