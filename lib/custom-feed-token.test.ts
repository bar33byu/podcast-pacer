import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";

import { signCustomFeedToken, verifyCustomFeedToken } from "@/lib/custom-feed-token";
import type { CustomFeedPayloadV1 } from "@/lib/custom-feed-types";

const secret = "a-test-secret-that-is-at-least-thirty-two-bytes";
const payload: CustomFeedPayloadV1 = {
  v: 1,
  source: "https://example.com/podcast.xml",
  start: "2026-07-24",
  rate: 3,
  timezone: "America/Denver",
  after: "2020-01-01",
  resumeAfter: "0123456789abcdef01234567",
};

describe("custom feed tokens", () => {
  it("round-trips a canonical v1 payload deterministically", () => {
    const token = signCustomFeedToken(payload, secret);
    expect(signCustomFeedToken(payload, secret)).toBe(token);
    expect(verifyCustomFeedToken(token, secret)).toEqual(payload);
  });

  it("rejects a modified token", () => {
    const token = signCustomFeedToken(payload, secret);
    const modified = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;
    expect(() => verifyCustomFeedToken(modified, secret)).toThrow("modified or is invalid");
  });

  it("rejects unsupported token versions even with a valid signature", () => {
    const encoded = Buffer.from(JSON.stringify({ ...payload, v: 2 })).toString("base64url");
    const signature = createHmac("sha256", secret).update(encoded).digest("base64url");
    expect(() => verifyCustomFeedToken(`${encoded}.${signature}`, secret)).toThrow("unsupported or invalid");
  });
});
