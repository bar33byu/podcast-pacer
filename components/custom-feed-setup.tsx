"use client";

import { useCallback, useEffect, useState } from "react";
import { customFeedSamples } from "@/lib/custom-feed-samples";
import type { CustomFeedInspection } from "@/lib/custom-feed-types";
import { MAX_EPISODES_PER_WEEK } from "@/lib/pacing-constants";
import { WebEpisodePlayer, type WebPlayerEpisode } from "@/components/web-episode-player";

type CustomPreview = {
  feedUrl: string;
  collection: { title: string; episodeCount: number };
  availableCount: number;
  endDate: string;
  episodes: Array<{ title: string; originalDate: string; date: string; available: boolean }>;
  previewEpisodes: WebPlayerEpisode[];
};

function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function CustomFeedSetup() {
  const [input, setInput] = useState("");
  const [inspection, setInspection] = useState<CustomFeedInspection>();
  const [start, setStart] = useState("");
  const [rate, setRate] = useState(3);
  const [timezone, setTimezone] = useState("America/Denver");
  const [after, setAfter] = useState("");
  const [before, setBefore] = useState("");
  const [resumeAfter, setResumeAfter] = useState("");
  const [preview, setPreview] = useState<CustomPreview>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  const inspectSource = useCallback(async (value: string) => {
    setLoading(true);
    setError("");
    setStatus("");
    setInspection(undefined);
    setPreview(undefined);
    try {
      const response = await fetch("/api/custom-feed/inspect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ input: value }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "That podcast could not be inspected.");
      const result = data as CustomFeedInspection;
      setInspection(result);
      setInput(value);
      setAdjusting(Boolean(result.existingSettings));
      setAfter(result.existingSettings?.after ?? "");
      setBefore(result.existingSettings?.before ?? "");
      setResumeAfter(result.existingSettings?.resumeAfter ?? "");
      if (result.existingSettings) {
        setStart(result.existingSettings.start);
        setRate(result.existingSettings.rate);
        setTimezone(result.existingSettings.timezone);
        setStatus("Existing settings loaded. Choose a new pace or resume point to create a replacement feed.");
      } else {
        setStatus(`${result.episodeCount} playable episodes found.`);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "That podcast could not be inspected.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setStart(localDate());
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Denver");
      const adjustUrl = new URLSearchParams(window.location.search).get("adjust");
      if (adjustUrl) {
        setInput(adjustUrl);
        void inspectSource(adjustUrl);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [inspectSource]);

  async function createFeed() {
    if (!inspection) return;
    setLoading(true);
    setError("");
    setStatus("");
    setPreview(undefined);
    try {
      const response = await fetch("/api/custom-feed/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          source: inspection.sourceUrl,
          start,
          rate,
          timezone,
          after: after || undefined,
          before: before || undefined,
          resumeAfter: resumeAfter || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The paced feed could not be created.");
      setPreview(data as CustomPreview);
      setStatus("Your permanent custom feed is ready.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The paced feed could not be created.");
    } finally {
      setLoading(false);
    }
  }

  async function copyFeed() {
    if (!preview) return;
    try {
      await navigator.clipboard.writeText(preview.feedUrl);
      setStatus("Feed address copied.");
    } catch {
      setStatus("Select and copy the feed address below.");
    }
  }

  function openPodcastApp(app: "apple" | "overcast") {
    if (!preview) return;
    void navigator.clipboard.writeText(preview.feedUrl).catch(() => undefined);
    setStatus(`Opening ${app === "apple" ? "Apple Podcasts" : "Overcast"}. The feed address is also copied.`);
    const destination = app === "apple"
      ? preview.feedUrl.replace(/^https:\/\//, "podcast://")
      : `overcast://x-callback-url/add?url=${encodeURIComponent(preview.feedUrl)}`;
    window.location.assign(destination);
  }

  return (
    <section className="custom-feed-section" id="custom-feed">
      <div className="custom-feed-intro">
        <p className="eyebrow">Beta · Pace another podcast</p>
        <h2>Bring an older series back one episode at a time.</h2>
        <p>Choose an example or paste an HTTPS RSS or Apple Podcasts show link. We create a separate, unofficial feed; the original publisher continues to host and own every episode.</p>
        <div className="unaffiliated-note">
          <strong>Unaffiliated examples</strong>
          <span>These public podcasts demonstrate the pacing tool. Podcast Pacer and Bradley Ross do not produce, own, endorse, or have a relationship with them.</span>
        </div>
      </div>

      <div className="custom-feed-panel">
        <div className="sample-feed-grid" aria-label="Example podcast feeds">
          {customFeedSamples.map((sample) => (
            <button type="button" key={sample.id} onClick={() => void inspectSource(sample.feedUrl)} disabled={loading}>
              <span>{sample.title}</span>
              <small>{sample.publisher} · Unaffiliated sample</small>
            </button>
          ))}
        </div>

        <div className="custom-source-field">
          <label htmlFor="custom-source">Podcast link or existing Podcast Pacer feed</label>
          <div>
            <input id="custom-source" type="url" value={input} placeholder="https://podcasts.apple.com/… or https://…/feed.xml" onChange={(event) => setInput(event.target.value)} />
            <button type="button" onClick={() => void inspectSource(input)} disabled={!input || loading}>{loading && !inspection ? "Checking…" : "Inspect feed"}</button>
          </div>
          <small>Paste one of our custom feed URLs here later to load and adjust its settings.</small>
        </div>

        {error && <p className="form-error" role="alert">{error}</p>}
        {status && <p className="custom-status" aria-live="polite">{status}</p>}

        {inspection && (
          <div className="custom-inspection">
            <div className="detected-show">
              {inspection.artworkUrl && (
                // User-selected remote artwork is displayed directly and is never fetched by our server.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={inspection.artworkUrl} alt="" referrerPolicy="no-referrer" />
              )}
              <div>
                <span>Detected source</span>
                <h3>{inspection.title}</h3>
                <p>{inspection.author} · {inspection.episodeCount} playable episodes</p>
                <small>{formatDate(inspection.firstPublished)}–{formatDate(inspection.lastPublished)}</small>
              </div>
            </div>

            <div className="custom-settings">
              <label>Begin paced releases on<input type="date" max={localDate()} value={start} onChange={(event) => setStart(event.target.value)} /></label>
              <label>Episodes each week<select value={rate} onChange={(event) => setRate(Number(event.target.value))}>{Array.from({ length: MAX_EPISODES_PER_WEEK }, (_, index) => index + 1).map((number) => <option key={number} value={number}>{number}</option>)}</select></label>
              <label>Your time zone<input value={timezone} onChange={(event) => setTimezone(event.target.value)} /></label>
              <label>Original episodes from <span>Optional</span><input type="date" value={after} min={inspection.firstPublished} max={inspection.lastPublished} onChange={(event) => { setAfter(event.target.value); setResumeAfter(""); }} /></label>
              <label>Original episodes before <span>Optional</span><input type="date" value={before} min={inspection.firstPublished} onChange={(event) => { setBefore(event.target.value); setResumeAfter(""); }} /></label>
              <label>Continue after <span>Optional</span><select value={resumeAfter} onChange={(event) => { setResumeAfter(event.target.value); if (event.target.value) setStart(localDate()); }}><option value="">Start with the first selected episode</option>{inspection.episodes.filter((episode) => (!after || episode.originalDate >= after) && (!before || episode.originalDate < before)).map((episode) => <option key={episode.identity} value={episode.identity}>{episode.title} · {formatDate(episode.originalDate)}</option>)}</select></label>
            </div>

            <p className="custom-context-note">Each episode description will show its original publication date and clearly identify this as an unofficial feed. Audio remains on the publisher’s servers.</p>
            <button className="custom-create-button" type="button" onClick={() => void createFeed()} disabled={!start || loading}>{loading ? "Preparing the archive…" : adjusting ? "Create replacement feed" : "Preview and create feed"}</button>
          </div>
        )}

        {preview && (
          <div className="custom-result" aria-live="polite">
            <div className="preview-heading"><div><span>{preview.availableCount} ready now</span><h3>{preview.collection.title}</h3></div><span>{preview.collection.episodeCount} total</span></div>
            <ol>{preview.episodes.map((episode) => <li key={`${episode.title}-${episode.date}`}><span><strong>{episode.title}</strong><small>Originally {formatDate(episode.originalDate)}</small></span><time dateTime={episode.date}>{formatDate(episode.date)}</time></li>)}</ol>
            <p className="preview-end">Based on the episodes currently available, the final episode will arrive on <strong><time dateTime={preview.endDate}>{formatDate(preview.endDate)}</time></strong>.</p>
            <WebEpisodePlayer key={preview.feedUrl} episodes={preview.previewEpisodes} />
            {adjusting && <p className="replacement-warning">Subscribe to this replacement, then remove the old paced subscription. The old stateless URL will continue to work.</p>}
            <div className="subscribe-panel">
              <span className="subscribe-label">Listen in your podcast app</span>
              <div className="subscribe-options">
                <button className="subscribe-option apple" type="button" onClick={() => openPodcastApp("apple")}><span className="app-mark" aria-hidden="true">A</span><span><strong>Apple Podcasts</strong><small>Open and follow</small></span></button>
                <button className="subscribe-option overcast" type="button" onClick={() => openPodcastApp("overcast")}><span className="app-mark" aria-hidden="true">O</span><span><strong>Overcast</strong><small>Open and add</small></span></button>
                <button className="subscribe-option feed" type="button" onClick={() => void copyFeed()}><span className="app-mark" aria-hidden="true">RSS</span><span><strong>Feed URL</strong><small>Copy for another app</small></span></button>
              </div>
              <div className="feed-address"><span>Your permanent feed address</span><code>{preview.feedUrl}</code></div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
