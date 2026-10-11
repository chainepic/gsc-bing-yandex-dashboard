import type { EngineId } from "./types.js";

export type UrlInspectionResult = {
  engine: EngineId;
  url: string;
  siteUrl: string;
  ok: boolean;
  /** Short index / coverage verdict */
  verdict: string;
  coverageState?: string | null;
  indexingState?: string | null;
  lastCrawlTime?: string | null;
  robotsTxtState?: string | null;
  pageFetchState?: string | null;
  httpStatus?: number | null;
  /** Human-readable bullets for the panel */
  details: string[];
  raw?: Record<string, unknown>;
  error?: string;
};

export type SitemapEntry = {
  engine: EngineId;
  path: string;
  lastSubmitted?: string | null;
  lastDownloaded?: string | null;
  isPending?: boolean;
  isSitemapsIndex?: boolean;
  warnings?: number | null;
  errors?: number | null;
  urlCount?: number | null;
  status?: string | null;
  contents?: string | null;
};
