"use client";

import { useEffect, useMemo, useState } from "react";
import { PUBLIC_ORIGIN } from "@/lib/site-config";
import type { CollectionSlug } from "@/lib/podcast-types";
import { MAX_EPISODES_PER_WEEK } from "@/lib/pacing-constants";
import { WebEpisodePlayer, type WebPlayerEpisode } from "@/components/web-episode-player";

type Preview = {
  collection: { title: string; episodeCount: number };
  availableCount: number;
  endDate: string;
  episodes: { title: string; date: string; available: boolean }[];
  previewEpisodes: WebPlayerEpisode[];
};

type PacerSetupProps = {
  slug: CollectionSlug;
  displayName: string;
  defaultEpisodesPerWeek: number;
};

function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function PacerSetup({ slug, displayName, defaultEpisodesPerWeek }: PacerSetupProps) {
  const [start, setStart] = useState("");
  const [rate, setRate] = useState(defaultEpisodesPerWeek);
  const [timezone, setTimezone] = useState("America/Denver");
  const [preview, setPreview] = useState<Preview>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [subscribeStatus, setSubscribeStatus] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setStart(localDate());
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Denver");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const query = useMemo(() => new URLSearchParams({ start, rate: String(rate), tz: timezone }).toString(), [start, rate, timezone]);
  const feedUrl = `${PUBLIC_ORIGIN}/feed/v1/${slug}.xml?${query}`;

  async function makePreview() {
    setLoading(true);
    setError("");
    setPreview(undefined);
    try {
      const response = await fetch(`/api/preview/v1/${slug}?${query}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Preview unavailable.");
      setPreview(data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Preview unavailable.");
    } finally {
      setLoading(false);
    }
  }

  async function copyFeed() {
    await navigator.clipboard.writeText(feedUrl);
    setCopied(true);
    setSubscribeStatus("Feed address copied.");
    window.setTimeout(() => setCopied(false), 2000);
  }

  function openPodcastApp(app: "apple" | "overcast") {
    void navigator.clipboard.writeText(feedUrl).catch(() => undefined);
    setSubscribeStatus(`Opening ${app === "apple" ? "Apple Podcasts" : "Overcast"}. The feed address is also copied.`);
    const destination = app === "apple"
      ? feedUrl.replace(/^https:\/\//, "podcast://")
      : `overcast://x-callback-url/add?url=${encodeURIComponent(feedUrl)}`;
    window.location.assign(destination);
  }

  return (
    <section className={`setup-section setup-${slug}`} id={`setup-${slug}`}>
      <div className="setup-intro">
        <p className="eyebrow">Set your pace</p>
        <h2>Make {displayName} arrive on your schedule.</h2>
        {slug === "jesus-the-christ" ? (
          <>
            <p className="setup-attribution">
              This podcast is a recording of the book <cite>Jesus the Christ</cite>
              {" "}by Elder James E. Talmage, who served in the Quorum of the Twelve
              Apostles of The Church of Jesus Christ of Latter-day Saints.
            </p>
            <p className="setup-context">
              First published more than 100 years ago, some of its scholarship is
              now dated. Its testimony of the Savior, however, remains beautiful.
            </p>
            <p className="setup-pacing-note">
              The complete 42-chapter archive stays out of your queue until each
              chapter’s scheduled day.
            </p>
          </>
        ) : slug === "book-of-mormon-2025" ? (
          <>
            <p className="setup-attribution">
              This podcast is based on the public-domain text of <cite>The Book
              of Mormon</cite> and is read by Bradley Ross.
            </p>
            <p className="setup-context">
              An AI voice changer is used to distinguish the different speakers
              in the text while preserving Bradley’s reading as the performance.
            </p>
            <p className="setup-pacing-note">
              This edition isolates the 2025 Book of Mormon read-along from the
              surrounding years of the original podcast.
            </p>
          </>
        ) : (
          <>
            <p className="setup-attribution">
              This podcast is a recording of <cite>The Old Testament</cite> in
              the New English Translation, read by Bradley Ross.
            </p>
            <p className="setup-context">
              It combines the 94 numbered full-text recordings with seven
              scripture-only episodes that complete Daniel through Malachi.
            </p>
            <p className="setup-pacing-note">
              One source recording combines Hosea 1–6 and 10–14 with Joel, so
              Hosea 7–9 follows it in the original publication order.
            </p>
          </>
        )}
      </div>
      <div className="setup-panel">
        <div className="setup-fields">
          <label>Begin on<input type="date" max={localDate()} value={start} onChange={(event) => setStart(event.target.value)} /></label>
          <label>Episodes each week<select value={rate} onChange={(event) => setRate(Number(event.target.value))}>
            {Array.from({ length: MAX_EPISODES_PER_WEEK }, (_, index) => index + 1).map((number) => <option key={number} value={number}>{number}</option>)}
          </select></label>
          <label>Your time zone<input value={timezone} onChange={(event) => setTimezone(event.target.value)} /></label>
        </div>
        <button className="preview-button" type="button" onClick={makePreview} disabled={!start || loading}>
          {loading ? "Reading the archive…" : "Preview my schedule"}
        </button>
        {error && <p className="form-error" role="alert">{error}</p>}
        {preview && (
          <div className="schedule-preview" aria-live="polite">
            <div className="preview-heading"><div><span>{preview.availableCount} ready now</span><h3>Your first episodes</h3></div><span>{preview.collection.episodeCount} total</span></div>
            <ol>{preview.episodes.map((episode) => <li key={`${episode.title}-${episode.date}`}><span>{episode.title}</span><time dateTime={episode.date}>{formatDate(episode.date)}</time></li>)}</ol>
            <p className="preview-end">
              Based on the {preview.collection.episodeCount} episodes currently
              available, your final episode will arrive on{" "}
              <strong><time dateTime={preview.endDate}>{formatDate(preview.endDate)}</time></strong>.
            </p>
            <WebEpisodePlayer key={feedUrl} episodes={preview.previewEpisodes} />
            <div className="subscribe-panel">
              <span className="subscribe-label">Listen in your podcast app</span>
              <div className="subscribe-options">
                <button className="subscribe-option apple" type="button" onClick={() => openPodcastApp("apple")}>
                  <span className="app-mark" aria-hidden="true">A</span>
                  <span><strong>Apple Podcasts</strong><small>Open and follow</small></span>
                </button>
                <button className="subscribe-option overcast" type="button" onClick={() => openPodcastApp("overcast")}>
                  <span className="app-mark" aria-hidden="true">O</span>
                  <span><strong>Overcast</strong><small>Open and add</small></span>
                </button>
                <button className="subscribe-option feed" type="button" onClick={copyFeed}>
                  <span className="app-mark" aria-hidden="true">RSS</span>
                  <span><strong>{copied ? "Copied" : "Feed URL"}</strong><small>Use in another app</small></span>
                </button>
              </div>
              <div className="feed-address"><span>Your feed address</span><code>{feedUrl}</code></div>
              <p className="subscribe-status" aria-live="polite">{subscribeStatus}</p>
            </div>
            <p className="feed-help">If an app does not open automatically, use its “Add by URL” option and paste the copied address. Keep it private: the URL contains your schedule.</p>
          </div>
        )}
      </div>
    </section>
  );
}
