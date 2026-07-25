import { describe, expect, it } from "vitest";

import { readLimitedJson } from "@/lib/request-json";

describe("limited JSON request parsing", () => {
  it("parses a body within the limit", async () => {
    const request = new Request("https://example.com", { method: "POST", body: '{"ok":true}' });
    await expect(readLimitedJson(request, 64)).resolves.toEqual({ ok: true });
  });

  it("rejects oversized and malformed bodies", async () => {
    const oversized = new Request("https://example.com", { method: "POST", body: `{"value":"${"x".repeat(100)}"}` });
    await expect(readLimitedJson(oversized, 32)).rejects.toThrow("too large");
    const malformed = new Request("https://example.com", { method: "POST", body: "not-json" });
    await expect(readLimitedJson(malformed, 64)).rejects.toThrow("valid JSON");
  });
});
