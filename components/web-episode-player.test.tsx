import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WebEpisodePlayer } from "@/components/web-episode-player";

const episodes = [
  {
    title: "Episode one",
    date: "2026-08-01",
    audioUrl: "https://cdn.example/one.mp3",
  },
  {
    title: "Episode two",
    date: "2026-08-03",
    originalDate: "2020-01-02",
    audioUrl: "https://cdn.example/two.mp3",
  },
];

describe("web episode player", () => {
  it("plays the first released episode and lets the listener select another", () => {
    render(<WebEpisodePlayer episodes={episodes} />);

    expect(screen.getByRole("heading", { name: "Listen here" })).toBeInTheDocument();
    expect(screen.getByLabelText("Listen to Episode one")).toHaveAttribute(
      "src",
      "https://cdn.example/one.mp3",
    );

    fireEvent.click(screen.getByRole("button", { name: /Episode two/ }));

    expect(screen.getByLabelText("Listen to Episode two")).toHaveAttribute(
      "src",
      "https://cdn.example/two.mp3",
    );
    expect(screen.getByText(/Originally Jan 2, 2020/)).toBeInTheDocument();
  });

  it("renders nothing when no released episode has playable audio", () => {
    const { container } = render(<WebEpisodePlayer episodes={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
