import { parsePaceSettings } from "@/lib/pacing";
import { preparePodcast } from "@/lib/podcast-service";
import { errorResponse, etag } from "@/lib/route-utils";

export const runtime = "nodejs";

export async function GET(request: Request, context: RouteContext<"/feed/v1/[collection]">) {
  try {
    const { collection: segment } = await context.params;
    const slug = segment.endsWith(".xml") ? segment.slice(0, -4) : segment;
    const settings = parsePaceSettings(new URL(request.url).searchParams);
    const { feed } = await preparePodcast(slug, settings);
    const tag = etag(feed);
    if (request.headers.get("if-none-match") === tag) return new Response(null, { status: 304, headers: { etag: tag } });
    return new Response(feed, {
      headers: {
        "content-type": "application/rss+xml; charset=utf-8",
        "cache-control": "public, s-maxage=900, stale-while-revalidate=3600",
        etag: tag,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
