import { customFeedUrl } from "@/lib/custom-feed-builder";
import { assertCustomFeedsConfigured, signCustomFeedToken } from "@/lib/custom-feed-token";
import type { CustomFeedPayloadV1 } from "@/lib/custom-feed-types";
import { prepareCustomPodcast } from "@/lib/custom-podcast-service";
import { errorResponse } from "@/lib/route-utils";
import { readLimitedJson } from "@/lib/request-json";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertCustomFeedsConfigured();
    const body = await readLimitedJson<Partial<CustomFeedPayloadV1>>(request, 16384);
    const payload: CustomFeedPayloadV1 = {
      v: 1,
      source: typeof body.source === "string" ? body.source : "",
      start: typeof body.start === "string" ? body.start : "",
      rate: typeof body.rate === "number" ? body.rate : Number.NaN,
      timezone: typeof body.timezone === "string" ? body.timezone : "",
      ...(typeof body.after === "string" && body.after ? { after: body.after } : {}),
      ...(typeof body.before === "string" && body.before ? { before: body.before } : {}),
      ...(typeof body.resumeAfter === "string" && body.resumeAfter ? { resumeAfter: body.resumeAfter } : {}),
    };
    const now = new Date();
    const prepared = await prepareCustomPodcast(payload, now);
    const token = signCustomFeedToken(prepared.payload);
    const finalEpisode = prepared.scheduled.at(-1)!;
    return Response.json({
      feedUrl: customFeedUrl(token),
      collection: {
        title: `${prepared.parsed.title} — Unofficial Paced Edition`,
        episodeCount: prepared.scheduled.length,
      },
      availableCount: prepared.scheduled.filter((episode) => episode.scheduledInstant <= now).length,
      endDate: finalEpisode.scheduledDate,
      episodes: prepared.scheduled.slice(0, 10).map((episode) => ({
        title: episode.title,
        originalDate: episode.originalCalendarDate,
        date: episode.scheduledDate,
        available: episode.scheduledInstant <= now,
      })),
    }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
