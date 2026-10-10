import { addDays, normalizeHost, pickAsOf, todayInTz } from "./dates.js";
import { aggregateKeyed, moversFromMaps } from "./movers.js";
import type { DailyMetric, SiteRef, SiteWindowStats } from "./types.js";

const API = "https://ssl.bing.com/webmaster/api.svc/json";

function bingDateToIso(value: unknown): string | null {
  const match = String(value || "").match(/\/Date\((-?\d+)([+-]\d{4})?\)\//);
  if (!match) return null;
  const ms = Number(match[1]);
  let offsetMin = 0;
  if (match[2]) {
    const sign = match[2][0] === "-" ? -1 : 1;
    offsetMin = sign * (Number(match[2].slice(1, 3)) * 60 + Number(match[2].slice(3, 5)));
  }
  return new Date(ms + offsetMin * 60 * 1000).toISOString().slice(0, 10);
}

async function bingCall(apiKey: string, endpoint: string, params: Record<string, string> = {}) {
  const query = new URLSearchParams({ apikey: apiKey, ...params });
  const response = await fetch(`${API}/${endpoint}?${query}`);
  const text = await response.text();
  if (!response.ok) throw new Error(`Bing ${endpoint} HTTP ${response.status}: ${text.slice(0, 200)}`);
  const json = JSON.parse(text);
  return json.d ?? json;
}

export async function listBingSites(apiKey: string): Promise<SiteRef[]> {
  const sites = await bingCall(apiKey, "GetUserSites");
  if (!Array.isArray(sites)) return [];
  return sites
    .filter((s: { IsVerified?: boolean; Url?: string }) => s.IsVerified !== false && s.Url)
    .map((s: { Url: string }) => ({
      engine: "bing" as const,
      host: normalizeHost(s.Url),
      siteUrl: s.Url,
    }));
}

function sumBetween(
  rows: Array<{ Date?: unknown; Clicks?: number; Impressions?: number }>,
  start: string,
  end: string
) {
  let clicks = 0;
  let impressions = 0;
  for (const row of rows) {
    const day = bingDateToIso(row.Date);
    if (!day || day < start || day > end) continue;
    clicks += row.Clicks || 0;
    impressions += row.Impressions || 0;
  }
  return { clicks, impressions };
}

function toDaily(rows: Array<{ Date?: unknown; Clicks?: number; Impressions?: number }>): DailyMetric[] {
  const map = new Map<string, DailyMetric>();
  for (const row of rows) {
    const day = bingDateToIso(row.Date);
    if (!day) continue;
    const cur = map.get(day) || { date: day, clicks: 0, impressions: 0 };
    cur.clicks += row.Clicks || 0;
    cur.impressions += row.Impressions || 0;
    map.set(day, cur);
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function aggBing(
  rows: Array<{ Date?: unknown; Query?: string; Clicks?: number; Impressions?: number; AvgImpressionPosition?: number }>,
  start: string,
  end: string
) {
  return aggregateKeyed(
    rows
      .map((row) => {
        const day = bingDateToIso(row.Date);
        if (!day || !row.Query || day < start || day > end) return null;
        return {
          key: row.Query,
          clicks: row.Clicks || 0,
          impressions: row.Impressions || 0,
          position: row.AvgImpressionPosition || null,
        };
      })
      .filter(Boolean) as Array<{ key: string; clicks: number; impressions: number; position: number | null }>
  );
}

export async function fetchBingSiteStats(
  apiKey: string,
  siteUrl: string,
  timeZone = "Asia/Shanghai"
): Promise<SiteWindowStats> {
  const today = todayInTz(timeZone);
  const [rank, queries, pages] = await Promise.all([
    bingCall(apiKey, "GetRankAndTrafficStats", { siteUrl }),
    bingCall(apiKey, "GetQueryStats", { siteUrl }).catch(() => []),
    bingCall(apiKey, "GetPageStats", { siteUrl }).catch(() => []),
  ]);
  const rankRows = Array.isArray(rank) ? rank : [];
  const queryRows = Array.isArray(queries) ? queries : [];
  const pageRows = Array.isArray(pages) ? pages : [];
  const daily = toDaily(rankRows);
  const totals = new Map(daily.map((d) => [d.date, d]));
  const asOf = pickAsOf(
    daily.map((d) => d.date),
    totals,
    today
  );
  if (!asOf) throw new Error(`Bing has no date series for ${siteUrl}`);
  const weekStart = addDays(asOf, -6);
  const priorStart = addDays(asOf, -13);
  const priorEnd = addDays(asOf, -7);
  const week = sumBetween(rankRows, weekStart, asOf);
  const prior = sumBetween(rankRows, priorStart, priorEnd);
  const queryMoves = moversFromMaps(aggBing(queryRows, weekStart, asOf), aggBing(queryRows, priorStart, priorEnd));
  const pageMoves = moversFromMaps(aggBing(pageRows, weekStart, asOf), aggBing(pageRows, priorStart, priorEnd));
  return {
    host: normalizeHost(siteUrl),
    siteUrl,
    engine: "bing",
    asOf,
    week,
    prior,
    clickDelta: week.clicks - prior.clicks,
    impressionDelta: week.impressions - prior.impressions,
    daily,
    queryGains: queryMoves.gains,
    queryLosses: queryMoves.losses,
    pageGains: pageMoves.gains,
    pageLosses: pageMoves.losses,
  };
}
