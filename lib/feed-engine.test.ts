import { describe, expect, it } from "vitest";
import { Temporal } from "@js-temporal/polyfill";
import { podcastCollections } from "@/lib/collection-config";
import { buildFeed, canonicalFeedUrl, stableGuid } from "@/lib/feed-builder";
import { parsePaceSettings, scheduleEpisodes } from "@/lib/pacing";
import { parseRss } from "@/lib/rss-parser";
import { PUBLIC_ORIGIN } from "@/lib/site-config";

const fixture = `<?xml version="1.0"?><rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"><channel><title>Original</title><description>Old</description><link>https://example.com</link><item><title>Chapter 2</title><guid>two</guid><pubDate>Mon, 08 Jan 2024 12:00:00 -0700</pubDate><enclosure url="http://www.archive.org/download/book/two.mp3" type="audio/mpeg" length="0" /></item><item><title>Chapter 1</title><guid>one</guid><pubDate>Mon, 01 Jan 2024 12:00:00 -0700</pubDate><enclosure url="http://www.archive.org/download/book/one.mp3" type="audio/mpeg" length="0" /></item></channel></rss>`;

describe("feed engine", () => {
  it("rejects entity-bearing XML", () => {
    expect(() => parseRss(`<!DOCTYPE rss [<!ENTITY x "bad">]><rss/>`)).toThrow("Unsafe XML");
  });

  it("paces episodes at local midnight across daylight saving time", () => {
    const scheduled = scheduleEpisodes(["one", "two", "three"], {
      start: "2026-03-07",
      rate: 7,
      timezone: "America/Denver",
    });
    expect(scheduled.map((episode) => episode.scheduledDate)).toEqual(["2026-03-07", "2026-03-08", "2026-03-09"]);
    expect(scheduled[0].scheduledInstant.toISOString()).toBe("2026-03-07T07:00:00.000Z");
    expect(scheduled[2].scheduledInstant.toISOString()).toBe("2026-03-09T06:00:00.000Z");
  });

  it("validates schedule input", () => {
    const params = new URLSearchParams({ start: "2026-07-20", rate: "3", tz: "America/Denver" });
    expect(parsePaceSettings(params, Temporal.Instant.from("2026-07-24T12:00:00Z"))).toEqual({
      start: "2026-07-20",
      rate: 3,
      timezone: "America/Denver",
    });
  });

  it("allows up to ten episodes per week", () => {
    const now = Temporal.Instant.from("2026-07-24T12:00:00Z");
    const valid = new URLSearchParams({ start: "2026-07-20", rate: "10", tz: "America/Denver" });
    const invalid = new URLSearchParams({ start: "2026-07-20", rate: "11", tz: "America/Denver" });

    expect(parsePaceSettings(valid, now).rate).toBe(10);
    expect(() => parsePaceSettings(invalid, now)).toThrow("between 1 and 10");
  });

  it("generates stable identities and only publishes episodes whose date has arrived", () => {
    const parsed = parseRss(fixture);
    const episodes = parsed.episodes.sort((a, b) => a.originalDate.getTime() - b.originalDate.getTime());
    const settings = { start: "2026-01-01", rate: 1, timezone: "America/Denver" };
    const scheduled = scheduleEpisodes(episodes, settings);
    const collection = podcastCollections["jesus-the-christ"];
    const feed = buildFeed(parsed, collection, settings, scheduled, new Date("2026-01-02T12:00:00Z"));
    expect(feed).toContain("Jesus the Christ — A Paced Reading");
    expect(feed).toContain("https://www.archive.org/download/book/one.mp3");
    expect(feed).not.toContain("Chapter 2");
    expect(feed).toContain(stableGuid(collection, settings, "one"));
    expect(feed).toContain(`${PUBLIC_ORIGIN}${collection.artworkPath}`);
    expect(stableGuid(collection, settings, "one")).toBe(stableGuid(collection, settings, "one"));
    expect(parseRss(feed).episodes).toHaveLength(1);
  });

  it("locks the v1 URL, schedule, and episode identity contract", () => {
    const settings = {
      start: "2026-07-24",
      rate: 3,
      timezone: "America/Denver",
    };
    const collection = podcastCollections["jesus-the-christ"];

    expect(canonicalFeedUrl(collection.slug, settings)).toBe(
      `${PUBLIC_ORIGIN}/feed/v1/jesus-the-christ.xml?start=2026-07-24&rate=3&tz=America%2FDenver`,
    );
    expect(scheduleEpisodes([0, 1, 2, 3, 4, 5], settings).map(
      (episode) => episode.scheduledDate,
    )).toEqual([
      "2026-07-24",
      "2026-07-26",
      "2026-07-28",
      "2026-07-31",
      "2026-08-02",
      "2026-08-04",
    ]);
    expect(stableGuid(collection, settings, "source-guid-123")).toBe(
      "urn:lavalane:podcast-pacer:v1:jesus-the-christ:ebe147cface90ce9807f4915:934517b3e11565dfe4757283",
    );
  });
});
