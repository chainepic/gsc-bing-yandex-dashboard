/** Shared anomaly presets for Keywords / Sites / movers UI (rule-engine ready). */

export type AnomalyPresetId =
  | "all"
  | "click_plunge"
  | "impressions_up_clicks_down"
  | "impression_plunge"
  | "gains";

export type AnomalyPreset = {
  id: AnomalyPresetId;
  label: string;
  description: string;
};

export const ANOMALY_PRESETS: AnomalyPreset[] = [
  { id: "all", label: "All", description: "No anomaly filter" },
  {
    id: "click_plunge",
    label: "Click plunge",
    description: "Clicks down ≥10 week-over-week",
  },
  {
    id: "impressions_up_clicks_down",
    label: "Impr. ↑ clicks ↓",
    description: "Impressions up while clicks down (CTR risk)",
  },
  {
    id: "impression_plunge",
    label: "Impr. plunge",
    description: "Impressions down ≥500 week-over-week",
  },
  { id: "gains", label: "Gains", description: "Clicks or impressions up" },
];

export type MoverLike = {
  clicks: number;
  impressions: number;
  clickDelta: number;
  impressionDelta: number;
  position?: number | null;
};

export function ctrOf(row: { clicks: number; impressions: number }): number {
  return row.impressions > 0 ? row.clicks / row.impressions : 0;
}

export function matchesAnomalyPreset(row: MoverLike, preset: AnomalyPresetId): boolean {
  switch (preset) {
    case "all":
      return true;
    case "click_plunge":
      return row.clickDelta <= -10;
    case "impressions_up_clicks_down":
      return row.impressionDelta > 0 && row.clickDelta < 0;
    case "impression_plunge":
      return row.impressionDelta <= -500;
    case "gains":
      return row.clickDelta > 0 || (row.clickDelta === 0 && row.impressionDelta > 0);
    default:
      return true;
  }
}

export type CoverageStatus = "has_traffic" | "no_data" | "big_drop" | "flat";

export function coverageStatusForEngine(row: {
  connected: boolean;
  weekClicks: number;
  weekImpressions: number;
  clickDelta: number;
  impressionDelta: number;
} | null): CoverageStatus {
  if (!row || !row.connected) return "no_data";
  if (row.clickDelta <= -10 || row.impressionDelta <= -500) return "big_drop";
  if (row.weekClicks > 0 || row.weekImpressions > 0) return "has_traffic";
  return "flat";
}

export const COVERAGE_STATUS_LABEL: Record<CoverageStatus, string> = {
  has_traffic: "Has traffic",
  no_data: "No data",
  big_drop: "Big drop",
  flat: "Flat / quiet",
};

/** Engine chip filter for multi-engine tables / panels. */
export type EngineFilterId = "all" | "gsc" | "bing" | "yandex";

export type EngineFilter = {
  id: EngineFilterId;
  label: string;
};

export const ENGINE_FILTERS: EngineFilter[] = [
  { id: "all", label: "All engines" },
  { id: "gsc", label: "Google" },
  { id: "bing", label: "Bing" },
  { id: "yandex", label: "Yandex" },
];

export function matchesEngineFilter(engine: string, filter: EngineFilterId): boolean {
  if (filter === "all") return true;
  return engine === filter;
}

/** True if any listed engine matches the filter (recommendations / multi-engine cards). */
export function matchesAnyEngineFilter(engines: string[], filter: EngineFilterId): boolean {
  if (filter === "all") return true;
  return engines.includes(filter);
}
