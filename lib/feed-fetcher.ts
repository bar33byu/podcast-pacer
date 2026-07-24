import { FeedError } from "@/lib/feed-error";
import type { PodcastSource } from "@/lib/podcast-types";
import { PUBLIC_ORIGIN } from "@/lib/site-config";

const MAX_FEED_BYTES = 10 * 1024 * 1024;
const MAX_REDIRECTS = 3;

export async function fetchSourceFeed(source: PodcastSource): Promise<string> {
  let url = new URL(source.feedUrl);
  if (url.protocol !== "https:") throw new FeedError("Source feed must use HTTPS.");

  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    const response = await fetch(url, {
      headers: { "user-agent": `PodcastPacer/1.0 (+${PUBLIC_ORIGIN})` },
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
      next: { revalidate: 3600 },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirect === MAX_REDIRECTS) {
        throw new FeedError("Source feed redirected too many times.", 502);
      }
      url = new URL(location, url);
      if (url.protocol !== "https:") throw new FeedError("Source redirected to an insecure URL.", 502);
      continue;
    }

    if (!response.ok) throw new FeedError(`Source feed returned ${response.status}.`, 502);
    const length = Number(response.headers.get("content-length") ?? 0);
    if (length > MAX_FEED_BYTES) throw new FeedError("Source feed is too large.", 502);
    const body = await response.text();
    if (new TextEncoder().encode(body).byteLength > MAX_FEED_BYTES) {
      throw new FeedError("Source feed is too large.", 502);
    }
    return body;
  }

  throw new FeedError("Unable to fetch source feed.", 502);
}
