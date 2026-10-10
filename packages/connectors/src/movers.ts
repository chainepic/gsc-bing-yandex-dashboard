import type { KeywordRow } from "./types.js";

type Agg = { key: string; clicks: number; impressions: number; posWeight: number };

export function aggregateKeyed(
  rows: Array<{ key: string; clicks: number; impressions: number; position?: number | null }>
): Map<string, Agg> {
  const map = new Map<string, Agg>();
  for (const row of rows) {
    if (!row.key) continue;
    const current = map.get(row.key) || { key: row.key, clicks: 0, impressions: 0, posWeight: 0 };
    const impressions = row.impressions || 0;
    current.clicks += row.clicks || 0;
    current.impressions += impressions;
    if (row.position && row.position > 0 && impressions > 0) {
      current.posWeight += row.position * impressions;
    }
    map.set(row.key, current);
  }
  return map;
}

export function moversFromMaps(
  current: Map<string, Agg>,
  previous: Map<string, Agg>,
  limit = 5
): { gains: KeywordRow[]; losses: KeywordRow[] } {
  const keys = new Set([...current.keys(), ...previous.keys()]);
  const rows: KeywordRow[] = [];
  for (const key of keys) {
    const now = current.get(key) || { key, clicks: 0, impressions: 0, posWeight: 0 };
    const then = previous.get(key) || { key, clicks: 0, impressions: 0, posWeight: 0 };
    const clickDelta = now.clicks - then.clicks;
    const impressionDelta = now.impressions - then.impressions;
    if (clickDelta === 0 && impressionDelta === 0) continue;
    rows.push({
      key,
      clicks: now.clicks,
      impressions: now.impressions,
      clickDelta,
      impressionDelta,
      position: now.impressions > 0 ? now.posWeight / now.impressions : null,
    });
  }
  const gains = rows
    .filter((r) => r.clickDelta > 0 || (r.clickDelta === 0 && r.impressionDelta > 0))
    .sort((a, b) => b.clickDelta - a.clickDelta || b.impressionDelta - a.impressionDelta)
    .slice(0, limit);
  const losses = rows
    .filter((r) => r.clickDelta < 0 || (r.clickDelta === 0 && r.impressionDelta < 0))
    .sort((a, b) => a.clickDelta - b.clickDelta || a.impressionDelta - b.impressionDelta)
    .slice(0, limit);
  return { gains, losses };
}
