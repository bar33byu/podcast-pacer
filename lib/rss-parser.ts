import { DOMParser } from "@xmldom/xmldom";
import type { Document as XmlDocument, Element as XmlElement } from "@xmldom/xmldom";
import { FeedError } from "@/lib/feed-error";

export type ParsedEpisode = {
  element: XmlElement;
  title: string;
  sourceGuid: string;
  originalDate: Date;
  originalCalendarDate: string;
  originalPubDate: string;
  enclosureUrl?: string;
};

export type ParsedFeed = {
  document: XmlDocument;
  channel: XmlElement;
  episodes: ParsedEpisode[];
  title: string;
  description: string;
  author: string;
  link: string;
  artworkUrl?: string;
};

type ParseRssOptions = {
  skipInvalidEpisodes?: boolean;
  requireAudioEnclosure?: boolean;
};

export function directChildren(parent: XmlElement, name: string): XmlElement[] {
  const result: XmlElement[] = [];
  for (let node = parent.firstChild; node; node = node.nextSibling) {
    if (node.nodeType === 1 && (node as XmlElement).tagName === name) result.push(node as XmlElement);
  }
  return result;
}

export function directChild(parent: XmlElement, name: string): XmlElement | undefined {
  return directChildren(parent, name)[0];
}

export function parseRss(xml: string, options: ParseRssOptions = {}): ParsedFeed {
  if (/<!\s*(DOCTYPE|ENTITY)/i.test(xml)) throw new FeedError("Unsafe XML declaration in source feed.", 502);
  const errors: string[] = [];
  const document = new DOMParser({
    onError(level, message) {
      if (level === "error" || level === "fatalError") errors.push(message);
    },
  }).parseFromString(xml, "application/xml");
  if (errors.length) throw new FeedError("Source feed contains invalid XML.", 502);

  const channel = document.getElementsByTagName("channel")[0];
  if (!channel) throw new FeedError("Source is not an RSS feed.", 502);
  const episodes: ParsedEpisode[] = [];
  for (const [index, element] of directChildren(channel, "item").entries()) {
    const title = directChild(element, "title")?.textContent?.trim() || `Episode ${index + 1}`;
    const guid = directChild(element, "guid")?.textContent?.trim();
    const enclosureUrl = directChild(element, "enclosure")?.getAttribute("url")?.trim() || undefined;
    const pubDate = directChild(element, "pubDate")?.textContent?.trim();
    if (!pubDate || (options.requireAudioEnclosure && !enclosureUrl)) {
      if (options.skipInvalidEpisodes) continue;
      throw new FeedError(`Episode “${title}” has no usable publication date or audio enclosure.`, 502);
    }
    const originalDate = new Date(pubDate);
    if (Number.isNaN(originalDate.getTime())) {
      if (options.skipInvalidEpisodes) continue;
      throw new FeedError(`Episode “${title}” has an invalid date.`, 502);
    }
    episodes.push({
      element,
      title,
      sourceGuid: guid || enclosureUrl || `${title}:${pubDate}`,
      originalDate,
      originalCalendarDate: rfc2822CalendarDate(pubDate),
      originalPubDate: pubDate,
      enclosureUrl,
    });
  }

  const image = directChild(channel, "image");
  const rssImage = image ? directChild(image, "url")?.textContent?.trim() : undefined;
  const itunesImage = directChild(channel, "itunes:image")?.getAttribute("href")?.trim();
  return {
    document,
    channel,
    episodes,
    title: directChild(channel, "title")?.textContent?.trim() || "Untitled podcast",
    description: directChild(channel, "description")?.textContent?.trim() || "",
    author: directChild(channel, "itunes:author")?.textContent?.trim()
      || directChild(channel, "author")?.textContent?.trim()
      || "Original podcast publisher",
    link: directChild(channel, "link")?.textContent?.trim() || "",
    artworkUrl: itunesImage || rssImage || undefined,
  };
}

function rfc2822CalendarDate(value: string): string {
  const match = value.match(/(?:^[A-Za-z]{3},\s*)?(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/);
  if (!match) return new Date(value).toISOString().slice(0, 10);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months.indexOf(match[2]) + 1;
  return `${match[3]}-${String(month).padStart(2, "0")}-${match[1].padStart(2, "0")}`;
}
