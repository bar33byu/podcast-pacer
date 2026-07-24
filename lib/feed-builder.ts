import { createHash } from "node:crypto";
import { XMLSerializer } from "@xmldom/xmldom";
import type { Element as XmlElement } from "@xmldom/xmldom";
import type { PodcastCollection } from "@/lib/podcast-types";
import type { PaceSettings, ScheduledEpisode } from "@/lib/pacing";
import type { ParsedEpisode, ParsedFeed } from "@/lib/rss-parser";
import { directChild, directChildren } from "@/lib/rss-parser";

export const CANONICAL_ORIGIN = process.env.PODCAST_PACER_ORIGIN ?? "https://pacer.lavalane.org";

export function stableGuid(collection: PodcastCollection, settings: PaceSettings, sourceGuid: string): string {
  const hash = (value: string) => createHash("sha256").update(value).digest("hex").slice(0, 24);
  return `urn:lavalane:podcast-pacer:v1:${collection.slug}:${hash(JSON.stringify(settings))}:${hash(sourceGuid)}`;
}

export function buildFeed(
  parsed: ParsedFeed,
  collection: PodcastCollection,
  settings: PaceSettings,
  scheduled: ScheduledEpisode<ParsedEpisode>[],
  now = new Date(),
): string {
  const document = parsed.document.cloneNode(true) as ParsedFeed["document"];
  const channel = document.getElementsByTagName("channel")[0];
  const root = document.documentElement!;
  root.setAttribute("xmlns:atom", "http://www.w3.org/2005/Atom");
  root.setAttribute("xmlns:itunes", "http://www.itunes.com/dtds/podcast-1.0.dtd");

  for (const item of directChildren(channel, "item")) channel.removeChild(item);
  setText(document, channel, "title", collection.pacedTitle);
  setText(document, channel, "description", `${collection.description} Episodes appear at ${settings.rate} per week.`);
  const artwork = `${CANONICAL_ORIGIN}${collection.artworkPath}`;
  const image = directChild(channel, "image") ?? channel.appendChild(document.createElement("image")) as XmlElement;
  setText(document, image, "url", artwork);
  setText(document, image, "title", collection.pacedTitle);
  setText(document, image, "link", CANONICAL_ORIGIN);
  setAttributeElement(document, channel, "itunes:image", "href", artwork);
  setAttributeElement(document, channel, "atom:link", "href", canonicalFeedUrl(collection.slug, settings), { rel: "self", type: "application/rss+xml" });

  const available = scheduled.filter((episode) => episode.scheduledInstant <= now);
  const buildDate = available.at(-1)?.scheduledInstant ?? now;
  setText(document, channel, "lastBuildDate", buildDate.toUTCString());
  setText(document, channel, "pubDate", buildDate.toUTCString());

  // Podcast feeds conventionally list the newest release first.
  for (const episode of [...available].reverse()) {
    const item = episode.element.cloneNode(true) as XmlElement;
    setText(document, item, "pubDate", episode.scheduledInstant.toUTCString());
    const guid = directChild(item, "guid") ?? item.appendChild(document.createElement("guid")) as XmlElement;
    guid.setAttribute("isPermaLink", "false");
    guid.textContent = stableGuid(collection, settings, episode.sourceGuid);
    const enclosure = directChild(item, "enclosure");
    const enclosureUrl = enclosure?.getAttribute("url");
    if (enclosure && enclosureUrl?.startsWith("http://www.archive.org/")) {
      enclosure.setAttribute("url", enclosureUrl.replace("http://", "https://"));
    }
    setAttributeElement(document, item, "itunes:image", "href", artwork);
    channel.appendChild(item);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(root, { requireWellFormed: true })}`;
}

export function canonicalFeedUrl(slug: string, settings: PaceSettings): string {
  const params = new URLSearchParams({ start: settings.start, rate: String(settings.rate), tz: settings.timezone });
  return `${CANONICAL_ORIGIN}/feed/v1/${slug}.xml?${params}`;
}

function setText(document: ParsedFeed["document"], parent: XmlElement, tag: string, text: string) {
  const element = directChild(parent, tag) ?? parent.appendChild(document.createElement(tag)) as XmlElement;
  element.textContent = text;
}

function setAttributeElement(
  document: ParsedFeed["document"], parent: XmlElement, tag: string, name: string, value: string,
  extra: Record<string, string> = {},
) {
  const element = directChild(parent, tag) ?? parent.appendChild(document.createElement(tag)) as XmlElement;
  element.setAttribute(name, value);
  for (const [key, attribute] of Object.entries(extra)) element.setAttribute(key, attribute);
}
