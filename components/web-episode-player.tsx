"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent, type SyntheticEvent } from "react";

const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 1.75, 2] as const;

export type WebPlayerEpisode = {
  title: string;
  date: string;
  audioUrl: string;
  originalDate?: string;
  available?: boolean;
};

type WebEpisodePlayerProps = {
  episodes: WebPlayerEpisode[];
  eyebrow?: string;
  heading?: string;
  description?: string;
  countLabel?: string;
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

export function WebEpisodePlayer({
  episodes,
  eyebrow = "Browser listening",
  heading = "Listen here",
  description = "Preview any episode here. Your paced feed will still release episodes on schedule.",
  countLabel,
}: WebEpisodePlayerProps) {
  const headingId = useId();
  const speedId = useId();
  const audioRef = useRef<HTMLAudioElement>(null);
  const playAfterSelection = useRef(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [selectedUrl, setSelectedUrl] = useState(episodes[0]?.audioUrl ?? "");
  const selected = episodes.find((episode) => episode.audioUrl === selectedUrl) ?? episodes[0];

  useEffect(() => {
    if (!playAfterSelection.current) return;
    playAfterSelection.current = false;
    const playRequest = audioRef.current?.play();
    void playRequest?.catch(() => undefined);
  }, [selectedUrl]);

  function playEpisode(audioUrl: string) {
    if (audioUrl === selectedUrl) {
      const playRequest = audioRef.current?.play();
      void playRequest?.catch(() => undefined);
      return;
    }

    playAfterSelection.current = true;
    setSelectedUrl(audioUrl);
  }

  if (!selected) return null;

  return (
    <section className="web-player" aria-labelledby={headingId}>
      <div className="web-player-heading">
        <div>
          <span>{eyebrow}</span>
          <h4 id={headingId}>{heading}</h4>
        </div>
        <span>{countLabel ?? `${episodes.length} episodes`}</span>
      </div>
      <p className="web-player-description">{description}</p>
      <div className="web-player-current">
        <span>Selected episode</span>
        <strong>{selected.title}</strong>
        <div className="web-player-dates">
          <time dateTime={selected.date}>Scheduled {formatDate(selected.date)}</time>
          {selected.originalDate && (
            <time dateTime={selected.originalDate}>Originally {formatDate(selected.originalDate)}</time>
          )}
        </div>
        <div className="web-player-controls">
          <audio
            key={selected.audioUrl}
            ref={audioRef}
            controls
            data-web-episode-player
            onLoadedMetadata={(event) => {
              event.currentTarget.playbackRate = playbackRate;
            }}
            onPlay={pauseOtherPlayers}
            preload="none"
            src={selected.audioUrl}
            aria-label={`Listen to ${selected.title}`}
          />
          <label className="web-player-speed" htmlFor={speedId}>
            Playback speed
            <select
              id={speedId}
              value={playbackRate}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                const rate = Number(event.target.value);
                setPlaybackRate(rate);
                if (audioRef.current) audioRef.current.playbackRate = rate;
              }}
            >
              {PLAYBACK_RATES.map((rate) => (
                <option key={rate} value={rate}>{rate}x</option>
              ))}
            </select>
          </label>
        </div>
      </div>
      {episodes.length > 1 && (
        <div className="web-player-queue" role="group" aria-label="Podcast episodes">
          {episodes.map((episode) => (
            <button
              type="button"
              key={`${episode.audioUrl}-${episode.date}`}
              aria-pressed={episode.audioUrl === selected.audioUrl}
              aria-label={`Play ${episode.title}, delivered ${formatDate(episode.date)}`}
              onClick={() => playEpisode(episode.audioUrl)}
            >
              <span className="web-player-episode">
                <span className="web-player-play" aria-hidden="true">
                  {episode.audioUrl === selected.audioUrl ? "▶" : "▷"}
                </span>
                <span>
                  <strong>{episode.title}</strong>
                  <small>{episode.available ? "Ready in your paced feed" : "Listen now in browser"}</small>
                </span>
              </span>
              <span className="web-player-delivery">
                <small>Delivers</small>
                <time dateTime={episode.date}>{formatDate(episode.date)}</time>
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
