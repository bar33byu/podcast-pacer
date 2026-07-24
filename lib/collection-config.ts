import type {
  CollectionSlug,
  PodcastCollection,
} from "@/lib/podcast-types";

export const podcastCollections = {
  "jesus-the-christ": {
    slug: "jesus-the-christ",
    sourceKey: "jesus-the-christ-source",
    displayName: "Jesus the Christ",
    pacedTitle: "Jesus the Christ — A Paced Reading",
    description:
      "A complete recording of the book Jesus the Christ by Elder James E. Talmage, with chapters released at a pace you choose.",
    shortLabel: "Complete book",
    artworkPath: "/artwork/jesus-the-christ-paced-v2.png",
    defaultEpisodesPerWeek: 3,
    enabled: true,
  },
  "book-of-mormon-2025": {
    slug: "book-of-mormon-2025",
    sourceKey: "come-follow-me-read-along-source",
    displayName: "The Book of Mormon",
    pacedTitle: "The Book of Mormon — 2025 Read-along, Paced",
    description:
      "A reading based on the public-domain text of The Book of Mormon, read by Bradley Ross with an AI voice changer distinguishing speakers in the text.",
    shortLabel: "2025 read-along",
    artworkPath: "/artwork/book-of-mormon-2025-paced.jpg",
    publicationWindowStart: "2025-01-01",
    publicationWindowEnd: "2025-12-21",
    defaultEpisodesPerWeek: 3,
    enabled: true,
  },
} as const satisfies Record<CollectionSlug, PodcastCollection>;

export function getPodcastCollection(
  slug: string,
): PodcastCollection | undefined {
  return podcastCollections[slug as CollectionSlug];
}

export function listEnabledCollections(): PodcastCollection[] {
  return Object.values(podcastCollections).filter(
    (collection) => collection.enabled,
  );
}
