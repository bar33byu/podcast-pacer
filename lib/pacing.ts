import { Temporal } from "@js-temporal/polyfill";
import { FeedError } from "@/lib/feed-error";
import { MAX_EPISODES_PER_WEEK, MIN_EPISODES_PER_WEEK } from "@/lib/pacing-constants";

export type PaceSettings = { start: string; rate: number; timezone: string };
export type ScheduledEpisode<T> = T & { scheduledDate: string; scheduledInstant: Date };

export function parsePaceSettings(params: URLSearchParams, now = Temporal.Now.instant()): PaceSettings {
  const start = params.get("start") ?? "";
  const timezone = params.get("tz") ?? "";
  const rate = Number(params.get("rate"));
  let startDate: Temporal.PlainDate;
  try {
    startDate = Temporal.PlainDate.from(start);
    now.toZonedDateTimeISO(timezone);
  } catch {
    throw new FeedError("Choose a valid start date and time zone.", 400);
  }
  if (!Number.isInteger(rate) || rate < MIN_EPISODES_PER_WEEK || rate > MAX_EPISODES_PER_WEEK) {
    throw new FeedError(`Rate must be between ${MIN_EPISODES_PER_WEEK} and ${MAX_EPISODES_PER_WEEK} episodes per week.`, 400);
  }
  const today = now.toZonedDateTimeISO(timezone).toPlainDate();
  if (Temporal.PlainDate.compare(startDate, today) > 0) throw new FeedError("Start date cannot be in the future.", 400);
  return { start, rate, timezone };
}

export function scheduleEpisodes<T>(episodes: T[], settings: PaceSettings): ScheduledEpisode<T>[] {
  const start = Temporal.PlainDate.from(settings.start);
  return episodes.map((episode, index) => {
    const date = start.add({ days: Math.floor((index * 7) / settings.rate) });
    const instant = date.toZonedDateTime({ timeZone: settings.timezone, plainTime: "00:00" }).toInstant();
    return { ...episode, scheduledDate: date.toString(), scheduledInstant: new Date(instant.epochMilliseconds) };
  });
}
