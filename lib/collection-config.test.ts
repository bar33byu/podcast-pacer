import { describe, expect, it } from "vitest";

import {
  getPodcastCollection,
  listEnabledCollections,
  podcastCollections,
} from "@/lib/collection-config";
import { getPodcastSource } from "@/lib/source-config";

describe("podcast collection configuration", () => {
  it("defines the two primary listening collections", () => {
    expect(listEnabledCollections().map((collection) => collection.slug)).toEqual(
      ["jesus-the-christ", "book-of-mormon-2025"],
    );
  });

  it("keeps the complete Jesus the Christ feed unbounded", () => {
    const collection = podcastCollections["jesus-the-christ"];

    expect(collection).not.toHaveProperty("publicationWindowStart");
    expect(collection).not.toHaveProperty("publicationWindowEnd");
  });

  it("locks the Book of Mormon collection to the 2025 run through Moroni 10", () => {
    const collection = podcastCollections["book-of-mormon-2025"];

    expect(collection.publicationWindowStart).toBe("2025-01-01");
    expect(collection.publicationWindowEnd).toBe("2025-12-21");
  });

  it("references an enabled source for every enabled collection", () => {
    for (const collection of listEnabledCollections()) {
      expect(getPodcastSource(collection.sourceKey)?.enabled).toBe(true);
    }
  });

  it("returns undefined for an unknown collection", () => {
    expect(getPodcastCollection("unknown")).toBeUndefined();
  });
});
