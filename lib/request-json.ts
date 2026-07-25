import { FeedError } from "@/lib/feed-error";

export async function readLimitedJson<T>(request: Request, maxBytes: number): Promise<T> {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > maxBytes) throw new FeedError("Request is too large.", 413);
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) throw new FeedError("Request is too large.", 413);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new FeedError("Request body must be valid JSON.", 400);
  }
}
