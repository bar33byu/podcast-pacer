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
  it("previews every episode and lets the listener select another", () => {
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

  it("changes playback speed and keeps it when another episode is selected", () => {
    render(<WebEpisodePlayer episodes={episodes} />);

    const speed = screen.getByLabelText("Playback speed");
    fireEvent.change(speed, { target: { value: "1.5" } });
    expect(screen.getByLabelText("Listen to Episode one")).toHaveProperty("playbackRate", 1.5);

    fireEvent.click(screen.getByRole("button", { name: /Episode two/ }));
    const nextAudio = screen.getByLabelText("Listen to Episode two");
    fireEvent.loadedMetadata(nextAudio);

    expect(nextAudio).toHaveProperty("playbackRate", 1.5);
    expect(speed).toHaveValue("1.5");
  });

  it("renders nothing when no episode has playable audio", () => {
    const { container } = render(<WebEpisodePlayer episodes={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
