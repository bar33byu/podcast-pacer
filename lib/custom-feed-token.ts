import { createHmac, timingSafeEqual } from "node:crypto";

import { FeedError } from "@/lib/feed-error";
import type { CustomFeedPayloadV1 } from "@/lib/custom-feed-types";

const MAX_TOKEN_LENGTH = 4096;
const MIN_SECRET_LENGTH = 32;

function configuredSecret(): string {
  const secret = process.env.CUSTOM_FEED_SIGNING_SECRET;
  if (!secret || Buffer.byteLength(secret) < MIN_SECRET_LENGTH) {
    throw new FeedError("Custom feeds are not configured yet.", 503);
  }
  return secret;
}

export function assertCustomFeedsConfigured() {
  configuredSecret();
}

function canonicalPayload(payload: CustomFeedPayloadV1): CustomFeedPayloadV1 {
  return {
    v: 1,
    source: payload.source,
    start: payload.start,
    rate: payload.rate,
    timezone: payload.timezone,
    ...(payload.after ? { after: payload.after } : {}),
    ...(payload.before ? { before: payload.before } : {}),
    ...(payload.resumeAfter ? { resumeAfter: payload.resumeAfter } : {}),
  };
}

function signature(encodedPayload: string, secret: string) {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

export function signCustomFeedToken(payload: CustomFeedPayloadV1, secret = configuredSecret()) {
  const encoded = Buffer.from(JSON.stringify(canonicalPayload(payload))).toString("base64url");
  return `${encoded}.${signature(encoded, secret)}`;
}

export function verifyCustomFeedToken(token: string, secret = configuredSecret()): CustomFeedPayloadV1 {
  if (!token || token.length > MAX_TOKEN_LENGTH) throw new FeedError("Custom feed link is invalid.", 400);
  const parts = token.split(".");
  if (parts.length !== 2) throw new FeedError("Custom feed link is invalid.", 400);
  const [encoded, suppliedSignature] = parts;
  const expected = Buffer.from(signature(encoded, secret));
  const supplied = Buffer.from(suppliedSignature);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    throw new FeedError("Custom feed link has been modified or is invalid.", 400);
  }

  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    throw new FeedError("Custom feed link is malformed.", 400);
  }
  if (!isPayloadV1(value)) throw new FeedError("Custom feed version is unsupported or invalid.", 400);
  return canonicalPayload(value);
}

function isPayloadV1(value: unknown): value is CustomFeedPayloadV1 {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  const allowed = new Set(["v", "source", "start", "rate", "timezone", "after", "before", "resumeAfter"]);
  if (Object.keys(payload).some((key) => !allowed.has(key))) return false;
  return payload.v === 1
    && typeof payload.source === "string"
    && typeof payload.start === "string"
    && Number.isInteger(payload.rate)
    && typeof payload.timezone === "string"
    && (payload.after === undefined || typeof payload.after === "string")
    && (payload.before === undefined || typeof payload.before === "string")
    && (payload.resumeAfter === undefined || typeof payload.resumeAfter === "string");
}
