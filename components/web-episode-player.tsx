"use client";

import { useId, useState, type SyntheticEvent } from "react";

export type WebPlayerEpisode = {
  title: string;
  date: string;
  audioUrl: string;
  originalDate?: string;
};

type WebEpisodePlayerProps = {
  episodes: WebPlayerEpisode[];
};

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function pauseOtherPlayers(event: SyntheticEvent<HTMLAudioElement>) {
  document.querySelectorAll<HTMLAudioElement>("[data-web-episode-player]").forEach((player) => {
    if (player !== event.currentTarget) player.pause();
  });
}

export function WebEpisodePlayer({ episodes }: WebEpisodePlayerProps) {
  const headingId = useId();
  const [selectedUrl, setSelectedUrl] = useState(episodes[0]?.audioUrl ?? "");
  const selected = episodes.find((episode) => episode.audioUrl === selectedUrl) ?? episodes[0];

  if (!selected) return null;

  return (
    <section className="web-player" aria-labelledby={headingId}>
      <div className="web-player-heading">
        <div>
          <span>Browser listening</span>
          <h4 id={headingId}>Listen here</h4>
        </div>
        <span>{episodes.length} released</span>
      </div>
      <div className="web-player-current">
        <span>Selected episode</span>
        <strong>{selected.title}</strong>
        <div className="web-player-dates">
          <time dateTime={selected.date}>Released {formatDate(selected.date)}</time>
          {selected.originalDate && (
            <time dateTime={selected.originalDate}>Originally {formatDate(selected.originalDate)}</time>
          )}
        </div>
        <audio
          key={selected.audioUrl}
          controls
          data-web-episode-player
          onPlay={pauseOtherPlayers}
          preload="none"
          src={selected.audioUrl}
          aria-label={`Listen to ${selected.title}`}
        />
      </div>
      {episodes.length > 1 && (
        <div className="web-player-queue" role="group" aria-label="Released episodes">
          {episodes.map((episode) => (
            <button
              type="button"
              key={`${episode.audioUrl}-${episode.date}`}
              aria-pressed={episode.audioUrl === selected.audioUrl}
              onClick={() => setSelectedUrl(episode.audioUrl)}
            >
              <span>{episode.title}</span>
              <time dateTime={episode.date}>{formatDate(episode.date)}</time>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
