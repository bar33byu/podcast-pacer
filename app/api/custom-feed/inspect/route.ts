import { inspectCustomFeedInput } from "@/lib/custom-podcast-service";
import { assertCustomFeedsConfigured } from "@/lib/custom-feed-token";
import { FeedError } from "@/lib/feed-error";
import { errorResponse } from "@/lib/route-utils";
import { readLimitedJson } from "@/lib/request-json";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertCustomFeedsConfigured();
    const body = await readLimitedJson<{ input?: unknown }>(request, 8192);
    if (typeof body.input !== "string") throw new FeedError("Enter a podcast RSS or Apple Podcasts URL.", 400);
    return Response.json(await inspectCustomFeedInput(body.input), {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
