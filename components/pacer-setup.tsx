"use client";

import { useEffect, useMemo, useState } from "react";

type Preview = {
  collection: { title: string; episodeCount: number };
  availableCount: number;
  episodes: { title: string; date: string; available: boolean }[];
};

function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function PacerSetup() {
  const [start, setStart] = useState("");
  const [rate, setRate] = useState(3);
  const [timezone, setTimezone] = useState("America/Denver");
  const [preview, setPreview] = useState<Preview>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setStart(localDate());
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Denver");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const query = useMemo(() => new URLSearchParams({ start, rate: String(rate), tz: timezone }).toString(), [start, rate, timezone]);
  const feedUrl = `https://pacer.lavalane.org/feed/v1/jesus-the-christ.xml?${query}`;

  async function makePreview() {
    setLoading(true);
    setError("");
    setPreview(undefined);
    try {
      const response = await fetch(`/api/preview/v1/jesus-the-christ?${query}`);
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
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="setup-section" id="setup">
      <div className="setup-intro">
        <p className="eyebrow">Set your pace</p>
        <h2>Make Jesus the Christ arrive on your schedule.</h2>
        <p>The complete 42-chapter archive stays out of your queue until each chapter’s scheduled day.</p>
      </div>
      <div className="setup-panel">
        <div className="setup-fields">
          <label>Begin on<input type="date" max={localDate()} value={start} onChange={(event) => setStart(event.target.value)} /></label>
          <label>Episodes each week<select value={rate} onChange={(event) => setRate(Number(event.target.value))}>
            {[1, 2, 3, 4, 5, 6, 7].map((number) => <option key={number} value={number}>{number}</option>)}
          </select></label>
          <label>Your time zone<input value={timezone} onChange={(event) => setTimezone(event.target.value)} /></label>
        </div>
        <button className="preview-button" type="button" onClick={makePreview} disabled={!start || loading}>
          {loading ? "Reading the archive…" : "Preview my schedule"}
        </button>
        {error && <p className="form-error" role="alert">{error}</p>}
        {preview && (
          <div className="schedule-preview" aria-live="polite">
            <div className="preview-heading"><div><span>{preview.availableCount} ready now</span><h3>Your first chapters</h3></div><span>{preview.collection.episodeCount} total</span></div>
            <ol>{preview.episodes.map((episode) => <li key={`${episode.title}-${episode.date}`}><span>{episode.title}</span><time dateTime={episode.date}>{new Date(`${episode.date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</time></li>)}</ol>
            <div className="feed-result"><span>Your permanent feed address</span><code>{feedUrl}</code><button type="button" onClick={copyFeed}>{copied ? "Copied" : "Copy feed URL"}</button></div>
            <p className="feed-help">In Overcast, choose Add URL and paste this address. Keep it private: the URL contains your schedule.</p>
          </div>
        )}
      </div>
    </section>
  );
}
