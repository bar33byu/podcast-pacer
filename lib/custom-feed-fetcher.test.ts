import { describe, expect, it } from "vitest";

import { isPublicAddress, validateCustomUrlShape } from "@/lib/custom-feed-fetcher";

describe("custom feed URL security", () => {
  it("accepts ordinary HTTPS feed URLs", () => {
    expect(validateCustomUrlShape("https://feeds.example.com/show.rss").hostname).toBe("feeds.example.com");
  });

  it.each([
    "http://example.com/feed.xml",
    "https://user:pass@example.com/feed.xml",
    "https://example.com:8443/feed.xml",
    "https://example.com/feed.xml#fragment",
    "https://127.0.0.1/feed.xml",
    "https://[::1]/feed.xml",
  ])("rejects unsafe URL shape %s", (url) => {
    expect(() => validateCustomUrlShape(url)).toThrow();
  });

  it.each([
    "0.0.0.0",
    "10.0.0.1",
    "100.64.0.1",
    "127.0.0.1",
    "169.254.1.2",
    "172.16.0.1",
    "192.168.1.1",
    "198.51.100.8",
    "203.0.113.8",
    "::1",
    "fc00::1",
    "fe80::1",
    "2001:db8::1",
    "::ffff:127.0.0.1",
    "64:ff9b::127.0.0.1",
  ])("rejects non-public address %s", (address) => {
    expect(isPublicAddress(address)).toBe(false);
  });

  it.each(["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111"])("accepts public address %s", (address) => {
    expect(isPublicAddress(address)).toBe(true);
  });
});
