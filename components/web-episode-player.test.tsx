import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

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
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
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

  it("explains slow Internet Archive playback and offers recovery controls", () => {
    render(
      <WebEpisodePlayer
        episodes={[{
          title: "Chapter one",
          date: "2026-08-01",
          audioUrl: "https://archive.org/download/book/chapter-one.mp3",
        }]}
      />,
    );

    fireEvent.play(screen.getByLabelText("Listen to Chapter one"));

    expect(screen.getByRole("status")).toHaveTextContent("Archive.org is taking longer than usual");
    expect(screen.getByRole("link", { name: "Open audio directly" })).toHaveAttribute(
      "href",
      "https://archive.org/download/book/chapter-one.mp3",
    );

    fireEvent.error(screen.getByLabelText("Listen to Chapter one"));
    expect(screen.getByRole("alert")).toHaveTextContent("Archive.org couldn’t load this episode");

    fireEvent.click(screen.getByRole("button", { name: "Retry playback" }));
    expect(HTMLMediaElement.prototype.load).toHaveBeenCalled();
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });

  it("renders nothing when no episode has playable audio", () => {
    const { container } = render(<WebEpisodePlayer episodes={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
