import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PacerSetup } from "@/components/pacer-setup";

describe("paced collection setup", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads the default schedule and listening list automatically", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        collection: { title: "Jesus the Christ", episodeCount: 2 },
        availableCount: 1,
        endDate: "2026-08-22",
        previewEpisodes: [
          {
            title: "Chapter 1",
            date: "2026-08-19",
            audioUrl: "https://cdn.example/chapter-1.mp3",
            available: true,
          },
          {
            title: "Chapter 2",
            date: "2026-08-22",
            audioUrl: "https://cdn.example/chapter-2.mp3",
            available: false,
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <PacerSetup
        slug="jesus-the-christ"
        displayName="Jesus the Christ"
        defaultEpisodesPerWeek={3}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Building your default schedule");
    expect(await screen.findByRole("heading", { name: "Episodes & delivery dates" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Play Chapter 1, delivered/ })).toBeInTheDocument();
    expect(screen.getByText("Ready in your paced feed")).toBeInTheDocument();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0][0]).toContain("/api/preview/v1/jesus-the-christ?");
    expect(fetchMock.mock.calls[0][0]).toContain("rate=3");
  });
});
