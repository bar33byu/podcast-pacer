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
      ["jesus-the-christ", "book-of-mormon-2025", "old-testament-full-text"],
    );
  });

  it("selects the numbered Old Testament run and its seven completion episodes", () => {
    const collection = podcastCollections["old-testament-full-text"];
    const matches = (title: string) => collection.titleIncludePatterns.some(
      (pattern) => new RegExp(pattern).test(title),
    );

    expect(matches("OT.001 - Genesis 1-8")).toBe(true);
    expect(matches("OT.094 - Hosea 7-9")).toBe(true);
    expect(matches("OTCFM.45 - Daniel 1-6")).toBe(true);
    expect(matches("OTCFM.51 - Malachi")).toBe(true);
    expect(matches("OTCFM.44 - Ezekiel selections")).toBe(false);
    expect(matches("CFM OT 01 - The Everlasting Covenant")).toBe(false);
  });

  it("keeps the complete Jesus the Christ feed unbounded", () => {
    const collection = podcastCollections["jesus-the-christ"];

    expect(collection).not.toHaveProperty("publicationWindowStart");
    expect(collection).not.toHaveProperty("publicationWindowEnd");
  });

  it("locks the Book of Mormon collection to the 2025 run through Moroni 10", () => {
    const collection = podcastCollections["book-of-mormon-2025"];

    expect(collection.publicationWindowStart).toBe("2025-01-05");
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
