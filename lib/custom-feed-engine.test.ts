import { describe, expect, it } from "vitest";

import { buildCustomFeed, customAdjustUrl, customFeedUrl, customStableGuid } from "@/lib/custom-feed-builder";
import type { CustomFeedPayloadV1 } from "@/lib/custom-feed-types";
import { customEpisodeIdentity, selectCustomEpisodes } from "@/lib/custom-podcast-service";
import { scheduleEpisodes } from "@/lib/pacing";
import { directChild, parseRss } from "@/lib/rss-parser";

const fixture = `<?xml version="1.0"?><rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>Independent Show</title><description>Original show</description><link>https://publisher.example/show</link><itunes:author>Original Publisher</itunes:author><itunes:complete>yes</itunes:complete><item><title>One</title><guid>one</guid><pubDate>Wed, 01 Jan 2020 08:00:00 -0700</pubDate><description><![CDATA[<p>Original one</p>]]></description><content:encoded><![CDATA[<p>Long one</p>]]></content:encoded><enclosure url="https://cdn.example/one.mp3" type="audio/mpeg" /></item><item><title>Two</title><guid>two</guid><pubDate>Thu, 02 Jan 2020 08:00:00 -0700</pubDate><description>Original two</description><enclosure url="https://cdn.example/two.mp3" type="audio/mpeg" /></item><item><title>Three</title><guid>three</guid><pubDate>Fri, 03 Jan 2020 08:00:00 -0700</pubDate><description>Original three</description><enclosure url="https://cdn.example/three.mp3" type="audio/mpeg" /></item></channel></rss>`;

const payload: CustomFeedPayloadV1 = {
  v: 1,
  source: "https://publisher.example/feed.xml",
  start: "2026-07-24",
  rate: 3,
  timezone: "America/Denver",
};

describe("custom feed engine", () => {
  it("applies original-date bounds and exact resume selection", () => {
    const episodes = parseRss(fixture, { requireAudioEnclosure: true }).episodes;
    expect(selectCustomEpisodes(episodes, { ...payload, after: "2020-01-02" }).map((episode) => episode.title)).toEqual(["Two", "Three"]);
    expect(selectCustomEpisodes(episodes, { ...payload, before: "2020-01-03" }).map((episode) => episode.title)).toEqual(["One", "Two"]);
    expect(selectCustomEpisodes(episodes, { ...payload, resumeAfter: customEpisodeIdentity("one") }).map((episode) => episode.title)).toEqual(["Two", "Three"]);
  });

  it("builds an attributed unofficial feed while preserving publisher ownership", () => {
    const parsed = parseRss(fixture, { requireAudioEnclosure: true });
    const scheduled = scheduleEpisodes(parsed.episodes, {
      start: payload.start,
      rate: payload.rate,
      timezone: payload.timezone,
    });
    const token = "signed-token";
    const xml = buildCustomFeed(parsed, payload, token, scheduled, new Date("2026-07-29T12:00:00Z"));
    const output = parseRss(xml);

    expect(output.title).toBe("Independent Show — Unofficial Paced Edition");
    expect(output.author).toBe("Original Publisher");
    expect(output.link).toBe("https://publisher.example/show");
    expect(xml).toContain("Podcast Pacer is unaffiliated");
    expect(xml).toContain("Originally published January 1, 2020");
    expect(xml).toContain(customStableGuid(payload, "one"));
    expect(xml).toContain(customFeedUrl(token));
    expect(xml).toContain("Adjust this paced feed");
    expect(xml).toContain(customAdjustUrl(token).replaceAll("&", "&amp;"));
    expect(xml).not.toContain("itunes:complete");
    expect(directChild(output.episodes[0].element, "itunes:image")?.getAttribute("href")).toContain("/artwork/custom-paced.png");
  });

  it("skips malformed custom episodes instead of failing the whole feed", () => {
    const malformed = fixture.replace("<pubDate>Thu, 02 Jan 2020 08:00:00 -0700</pubDate>", "");
    expect(parseRss(malformed, { skipInvalidEpisodes: true, requireAudioEnclosure: true }).episodes).toHaveLength(2);
  });
});
