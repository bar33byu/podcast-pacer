import { describe, expect, it } from "vitest";

import { webPlaybackUrl } from "@/lib/web-playback";

describe("web playback URL", () => {
  it("accepts HTTPS audio and upgrades Internet Archive audio", () => {
    expect(webPlaybackUrl("https://cdn.example/episode.mp3")).toBe(
      "https://cdn.example/episode.mp3",
    );
    expect(webPlaybackUrl("http://www.archive.org/download/book/one.mp3")).toBe(
      "https://www.archive.org/download/book/one.mp3",
    );
  });

  it("rejects malformed, unsafe, and mixed-content URLs", () => {
    expect(webPlaybackUrl("javascript:alert(1)")).toBeUndefined();
    expect(webPlaybackUrl("http://cdn.example/episode.mp3")).toBeUndefined();
    expect(webPlaybackUrl("not a URL")).toBeUndefined();
    expect(webPlaybackUrl(undefined)).toBeUndefined();
  });
});
