import { buildCustomFeed } from "@/lib/custom-feed-builder";
import { verifyCustomFeedToken } from "@/lib/custom-feed-token";
import { FeedError } from "@/lib/feed-error";
import { prepareCustomPodcast } from "@/lib/custom-podcast-service";
import { etag } from "@/lib/route-utils";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token: segment } = await context.params;
    if (!segment.endsWith(".xml")) throw new FeedError("Custom feed not found.", 404);
    const token = segment.slice(0, -4);
    const payload = verifyCustomFeedToken(token);
    const now = new Date();
    const prepared = await prepareCustomPodcast(payload, now);
    const feed = buildCustomFeed(prepared.parsed, prepared.payload, token, prepared.scheduled, now);
    const tag = etag(feed);
    if (request.headers.get("if-none-match") === tag) {
      return new Response(null, { status: 304, headers: { etag: tag } });
    }
    return new Response(feed, {
      headers: {
        "content-type": "application/rss+xml; charset=utf-8",
        "cache-control": "public, max-age=0, s-maxage=900, stale-while-revalidate=3600",
        "x-content-type-options": "nosniff",
        etag: tag,
      },
    });
  } catch (error) {
    const status = error instanceof FeedError ? error.status : 500;
    const message = error instanceof FeedError ? error.message : "The custom podcast feed could not be prepared.";
    return new Response(message, {
      status,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      },
    });
  }
}
