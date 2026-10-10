export type EngineId = "gsc" | "bing" | "yandex";

export type DailyMetric = {
  date: string;
  clicks: number;
  impressions: number;
  ctr?: number;
  position?: number | null;
};

export type KeywordRow = {
  key: string;
  clicks: number;
  impressions: number;
  position: number | null;
  clickDelta: number;
  impressionDelta: number;
};

export type SiteRef = {
  engine: EngineId;
  host: string;
  siteUrl: string;
  label?: string;
};

export type SiteWindowStats = {
  host: string;
  siteUrl: string;
  engine: EngineId;
  asOf: string;
  week: { clicks: number; impressions: number };
  prior: { clicks: number; impressions: number };
  clickDelta: number;
  impressionDelta: number;
  daily: DailyMetric[];
  queryGains: KeywordRow[];
  queryLosses: KeywordRow[];
  pageGains: KeywordRow[];
  pageLosses: KeywordRow[];
  meta?: Record<string, unknown>;
};
