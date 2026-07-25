export type CustomFeedPayloadV1 = {
  v: 1;
  source: string;
  start: string;
  rate: number;
  timezone: string;
  after?: string;
  before?: string;
  resumeAfter?: string;
};

export type CustomFeedEpisodeSummary = {
  identity: string;
  title: string;
  originalDate: string;
};

export type CustomFeedInspection = {
  sourceUrl: string;
  title: string;
  author: string;
  artworkUrl?: string;
  episodeCount: number;
  firstPublished: string;
  lastPublished: string;
  episodes: CustomFeedEpisodeSummary[];
  existingSettings?: Omit<CustomFeedPayloadV1, "v" | "source">;
};
