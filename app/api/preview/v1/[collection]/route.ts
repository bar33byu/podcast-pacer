import { parsePaceSettings } from "@/lib/pacing";
import { preparePodcast } from "@/lib/podcast-service";
import { errorResponse } from "@/lib/route-utils";

export const runtime = "nodejs";

export async function GET(request: Request, context: RouteContext<"/api/preview/v1/[collection]">) {
  try {
    const { collection } = await context.params;
    const settings = parsePaceSettings(new URL(request.url).searchParams);
    const now = new Date();
    const result = await preparePodcast(collection, settings, now);
    const availableCount = result.scheduled.filter((episode) => episode.scheduledInstant <= now).length;
    return Response.json({
      collection: { title: result.collection.pacedTitle, episodeCount: result.scheduled.length },
      availableCount,
      episodes: result.scheduled.slice(0, 10).map((episode) => ({
        title: episode.title,
        date: episode.scheduledDate,
        available: episode.scheduledInstant <= now,
      })),
    }, { headers: { "cache-control": "public, s-maxage=900, stale-while-revalidate=3600" } });
  } catch (error) {
    return errorResponse(error);
  }
}
