import { createHash } from "node:crypto";
import { XMLSerializer } from "@xmldom/xmldom";
import type { Element as XmlElement } from "@xmldom/xmldom";

import type { CustomFeedPayloadV1 } from "@/lib/custom-feed-types";
import type { ScheduledEpisode } from "@/lib/pacing";
import { directChild, directChildren, type ParsedEpisode, type ParsedFeed } from "@/lib/rss-parser";
import { PUBLIC_ORIGIN } from "@/lib/site-config";

const CUSTOM_ARTWORK_PATH = "/artwork/custom-paced.png";

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}

export function customFeedUrl(token: string) {
  return `${PUBLIC_ORIGIN}/feed/custom/v1/${token}.xml`;
}

export function customAdjustUrl(token: string) {
  return `${PUBLIC_ORIGIN}/?adjust=${encodeURIComponent(customFeedUrl(token))}#custom-feed`;
}

export function customStableGuid(payload: CustomFeedPayloadV1, sourceGuid: string) {
  const sourceIdentity = hash(payload.source);
  const configuration = hash(JSON.stringify(payload));
  return `urn:lavalane:podcast-pacer:custom:v1:${sourceIdentity}:${configuration}:${hash(sourceGuid)}`;
}

export function buildCustomFeed(
  parsed: ParsedFeed,
  payload: CustomFeedPayloadV1,
  token: string,
  scheduled: ScheduledEpisode<ParsedEpisode>[],
  now = new Date(),
) {
  const document = parsed.document.cloneNode(true) as ParsedFeed["document"];
  const channel = document.getElementsByTagName("channel")[0];
  const root = document.documentElement!;
  root.setAttribute("xmlns:atom", "http://www.w3.org/2005/Atom");
  root.setAttribute("xmlns:itunes", "http://www.itunes.com/dtds/podcast-1.0.dtd");
  for (const item of directChildren(channel, "item")) channel.removeChild(item);

  const pacedTitle = `${parsed.title} — Unofficial Paced Edition`;
  const disclaimer = `An unofficial paced feed of ${parsed.title}. Podcast Pacer and Bradley Ross do not produce, own, endorse, or have a relationship with this show. Episodes remain hosted by the original publisher, ${parsed.author}.`;
  const adjustUrl = customAdjustUrl(token);
  setText(document, channel, "title", pacedTitle);
  setText(document, channel, "description", `${disclaimer} Episodes appear at ${payload.rate} per week. Change this schedule at ${adjustUrl}`);
  const artwork = `${PUBLIC_ORIGIN}${CUSTOM_ARTWORK_PATH}`;
  const image = directChild(channel, "image") ?? channel.appendChild(document.createElement("image")) as XmlElement;
  setText(document, image, "url", artwork);
  setText(document, image, "title", pacedTitle);
  setText(document, image, "link", parsed.link || PUBLIC_ORIGIN);
  setAttributeElement(document, channel, "itunes:image", "href", artwork);
  setAttributeElement(document, channel, "atom:link", "href", customFeedUrl(token), {
    rel: "self",
    type: "application/rss+xml",
  });
  const sourceRedirect = directChild(channel, "itunes:new-feed-url");
  if (sourceRedirect) channel.removeChild(sourceRedirect);
  const sourceComplete = directChild(channel, "itunes:complete");
  if (sourceComplete) channel.removeChild(sourceComplete);

  const available = scheduled.filter((episode) => episode.scheduledInstant <= now);
  const buildDate = available.at(-1)?.scheduledInstant ?? now;
  setText(document, channel, "lastBuildDate", buildDate.toUTCString());
  setText(document, channel, "pubDate", buildDate.toUTCString());

  for (const episode of [...available].reverse()) {
    const item = episode.element.cloneNode(true) as XmlElement;
    setText(document, item, "pubDate", episode.scheduledInstant.toUTCString());
    const guid = directChild(item, "guid") ?? item.appendChild(document.createElement("guid")) as XmlElement;
    guid.setAttribute("isPermaLink", "false");
    guid.textContent = customStableGuid(payload, episode.sourceGuid);
    setAttributeElement(document, item, "itunes:image", "href", artwork);
    prependOriginalContext(document, item, episode.originalCalendarDate, parsed.title, adjustUrl);
    channel.appendChild(item);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(root, { requireWellFormed: true })}`;
}

function prependOriginalContext(
  document: ParsedFeed["document"],
  item: XmlElement,
  originalDate: string,
  showTitle: string,
  adjustUrl: string,
) {
  const date = new Date(`${originalDate}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const context = `<p><strong>Originally published ${escapeHtml(date)}.</strong> This episode is from <em>${escapeHtml(showTitle)}</em>. Podcast Pacer is unaffiliated with and does not own or produce this show. <a href="${escapeHtml(adjustUrl)}">Adjust this paced feed</a>.</p><hr />`;
  for (const tag of ["description", "content:encoded"]) {
    const element = directChild(item, tag);
    if (element) element.textContent = `${context}${element.textContent ?? ""}`;
    else if (tag === "description") setText(document, item, tag, context);
  }
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function setText(document: ParsedFeed["document"], parent: XmlElement, tag: string, value: string) {
  const element = directChild(parent, tag) ?? parent.appendChild(document.createElement(tag)) as XmlElement;
  element.textContent = value;
}

function setAttributeElement(
  document: ParsedFeed["document"],
  parent: XmlElement,
  tag: string,
  name: string,
  value: string,
  extra: Record<string, string> = {},
) {
  const element = directChild(parent, tag) ?? parent.appendChild(document.createElement(tag)) as XmlElement;
  element.setAttribute(name, value);
  for (const [key, attribute] of Object.entries(extra)) element.setAttribute(key, attribute);
}
