import { describe, expect, it } from "vitest";

import { podcastCollections } from "@/lib/collection-config";
import { episodeMatchesCollection } from "@/lib/podcast-service";

describe("episode collection filtering", () => {
  it("excludes the 2025 intro while retaining the first Book of Mormon reading", () => {
    const collection = podcastCollections["book-of-mormon-2025"];

    expect(episodeMatchesCollection({
      title: "2025 Intro",
      originalCalendarDate: "2025-01-04",
    }, collection)).toBe(false);
    expect(episodeMatchesCollection({
      title: "1 Nephi 1",
      originalCalendarDate: "2025-01-05",
    }, collection)).toBe(true);
  });
});
