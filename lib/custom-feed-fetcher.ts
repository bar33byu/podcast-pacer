import { lookup } from "node:dns/promises";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";

import { FeedError } from "@/lib/feed-error";
import { PUBLIC_ORIGIN } from "@/lib/site-config";

const MAX_FEED_BYTES = 10 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const MAX_URL_LENGTH = 2048;
const REQUEST_TIMEOUT_MS = 10_000;

type ResolvedAddress = { address: string; family: 4 | 6 };

export function validateCustomUrlShape(input: string): URL {
  if (!input || input.length > MAX_URL_LENGTH) throw new FeedError("Enter a valid HTTPS podcast URL.", 400);
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new FeedError("Enter a valid HTTPS podcast URL.", 400);
  }
  if (url.protocol !== "https:" || (url.port && url.port !== "443")) {
    throw new FeedError("Custom podcast URLs must use HTTPS on the standard port.", 400);
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  if (url.username || url.password || url.hash || !hostname || isIP(hostname)) {
    throw new FeedError("That podcast URL format is not supported.", 400);
  }
  return url;
}

export function isPublicAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    const parts = address.split(".").map(Number);
    const [a, b, c] = parts;
    return !(
      a === 0
      || a === 10
      || a === 127
      || (a === 100 && b >= 64 && b <= 127)
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 0)
      || (a === 192 && b === 168)
      || (a === 198 && (b === 18 || b === 19))
      || (a === 198 && b === 51 && c === 100)
      || (a === 203 && b === 0 && c === 113)
      || a >= 224
    );
  }
  if (version === 6) {
    const normalized = address.toLowerCase();
    return !(
      normalized === "::"
      || normalized === "::1"
      || normalized.startsWith("::ffff:")
      || normalized.startsWith("64:ff9b:")
      || normalized.startsWith("fc")
      || normalized.startsWith("fd")
      || /^fe[89ab]/.test(normalized)
      || normalized.startsWith("ff")
      || normalized.startsWith("2001:db8:")
      || normalized.startsWith("100:")
    );
  }
  return false;
}

async function resolvePublicAddress(url: URL): Promise<ResolvedAddress> {
  let addresses: Array<{ address: string; family: number }>;
  try {
    addresses = await lookup(url.hostname, { all: true, verbatim: true });
  } catch {
    throw new FeedError("The podcast host could not be found.", 502);
  }
  if (!addresses.length || addresses.some((entry) => !isPublicAddress(entry.address))) {
    throw new FeedError("Custom feeds may only use public internet hosts.", 400);
  }
  const selected = addresses[0];
  return { address: selected.address, family: selected.family as 4 | 6 };
}

function requestPinned(url: URL, resolved: ResolvedAddress): Promise<{ status: number; headers: Headers; body: string }> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const fail = (error: Error) => {
      if (!settled) {
        settled = true;
        reject(error);
      }
    };
    const request = httpsRequest(url, {
      method: "GET",
      headers: {
        accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.1",
        "user-agent": `PodcastPacer/1.0 (+${PUBLIC_ORIGIN})`,
      },
      lookup: ((
        _: string,
        optionsOrCallback: { all?: boolean } | ((error: Error | null, address: string, family: number) => void),
        maybeCallback?: (error: Error | null, address: string | Array<ResolvedAddress>, family?: number) => void,
      ) => {
        if (typeof optionsOrCallback === "function") {
          optionsOrCallback(null, resolved.address, resolved.family);
        } else if (optionsOrCallback.all) {
          maybeCallback?.(null, [resolved]);
        } else {
          maybeCallback?.(null, resolved.address, resolved.family);
        }
      }) as never,
      timeout: REQUEST_TIMEOUT_MS,
    }, (response) => {
      const status = response.statusCode ?? 502;
      const headers = new Headers();
      for (const [name, value] of Object.entries(response.headers)) {
        if (Array.isArray(value)) value.forEach((item) => headers.append(name, item));
        else if (value !== undefined) headers.set(name, String(value));
      }
      const declaredLength = Number(headers.get("content-length") ?? 0);
      if (declaredLength > MAX_FEED_BYTES) {
        response.destroy();
        fail(new FeedError("The podcast feed is too large.", 502));
        return;
      }
      const chunks: Buffer[] = [];
      let size = 0;
      response.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > MAX_FEED_BYTES) {
          response.destroy();
          fail(new FeedError("The podcast feed is too large.", 502));
          return;
        }
        chunks.push(chunk);
      });
      response.on("error", fail);
      response.on("end", () => {
        if (!settled) {
          settled = true;
          resolve({ status, headers, body: Buffer.concat(chunks).toString("utf8") });
        }
      });
    });
    request.on("timeout", () => request.destroy(new FeedError("The podcast host took too long to respond.", 504)));
    request.on("error", (error) => {
      if (!(error instanceof FeedError)) {
        console.error("custom_feed_fetch_failed", {
          host: url.hostname,
          code: "code" in error ? error.code : undefined,
          message: error.message,
        });
      }
      fail(error instanceof FeedError ? error : new FeedError("The podcast feed could not be downloaded.", 502));
    });
    request.end();
  });
}

export async function fetchCustomFeed(sourceUrl: string): Promise<{ sourceUrl: string; xml: string }> {
  let url = validateCustomUrlShape(sourceUrl);
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    const resolved = await resolvePublicAddress(url);
    const response = await requestPinned(url, resolved);
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirect === MAX_REDIRECTS) throw new FeedError("The podcast feed redirected too many times.", 502);
      url = validateCustomUrlShape(new URL(location, url).toString());
      continue;
    }
    if (response.status < 200 || response.status >= 300) {
      throw new FeedError(`The podcast feed returned ${response.status}.`, 502);
    }
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    if (!contentType.includes("xml") && !/^\s*(?:<\?xml[^>]*>\s*)?<rss\b/i.test(response.body)) {
      throw new FeedError("That URL did not return an RSS feed.", 502);
    }
    return { sourceUrl: url.toString(), xml: response.body };
  }
  throw new FeedError("The podcast feed could not be downloaded.", 502);
}

export async function resolveSourceInput(input: string): Promise<string> {
  const url = validateCustomUrlShape(input.trim());
  if (url.hostname.toLowerCase() !== "podcasts.apple.com") return url.toString();
  const match = url.pathname.match(/\/id(\d+)(?:\/|$)/);
  if (!match) throw new FeedError("That Apple Podcasts URL does not contain a show ID.", 400);
  const response = await fetch(`https://itunes.apple.com/lookup?id=${encodeURIComponent(match[1])}&entity=podcast`, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: { "user-agent": `PodcastPacer/1.0 (+${PUBLIC_ORIGIN})` },
  });
  if (!response.ok) throw new FeedError("Apple Podcasts could not resolve that show.", 502);
  const data = await response.json() as { results?: Array<{ kind?: string; feedUrl?: string }> };
  const feedUrl = data.results?.find((entry) => entry.kind === "podcast" && entry.feedUrl)?.feedUrl;
  if (!feedUrl) throw new FeedError("Apple Podcasts did not provide an RSS feed for that show.", 400);
  return validateCustomUrlShape(feedUrl).toString();
}
