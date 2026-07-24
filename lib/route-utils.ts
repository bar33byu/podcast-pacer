import { createHash } from "node:crypto";
import { FeedError } from "@/lib/feed-error";

export function errorResponse(error: unknown): Response {
  const status = error instanceof FeedError ? error.status : 500;
  const message = error instanceof FeedError ? error.message : "The podcast feed could not be prepared.";
  return Response.json({ error: message }, { status });
}

export function etag(body: string): string {
  return `"${createHash("sha256").update(body).digest("hex")}"`;
}
