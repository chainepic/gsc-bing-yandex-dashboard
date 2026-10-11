import { addDays, normalizeHost, pickAsOf, todayInTz } from "./dates.js";
import type { SitemapEntry, UrlInspectionResult } from "./inspection.js";
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

async function bingPost(apiKey: string, endpoint: string, body: Record<string, unknown>) {
  const query = new URLSearchParams({ apikey: apiKey });
  const response = await fetch(`${API}/${endpoint}?${query}`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Bing ${endpoint} HTTP ${response.status}: ${text.slice(0, 220)}`);
  if (!text) return null;
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
  rows: Array<{
    Date?: unknown;
    Query?: string;
    Page?: string;
    Clicks?: number;
    Impressions?: number;
    AvgImpressionPosition?: number;
  }>,
  start: string,
  end: string,
  keyField: "Query" | "Page" = "Query"
) {
  return aggregateKeyed(
    rows
      .map((row) => {
        const day = bingDateToIso(row.Date);
        const key = keyField === "Page" ? row.Page || row.Query : row.Query;
        if (!day || !key || day < start || day > end) return null;
        return {
          key,
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
  const pageMoves = moversFromMaps(
    aggBing(pageRows, weekStart, asOf, "Page"),
    aggBing(pageRows, priorStart, priorEnd, "Page")
  );
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

export async function listBingSitemaps(apiKey: string, siteUrl: string): Promise<SitemapEntry[]> {
  const feeds = await bingCall(apiKey, "GetFeeds", { siteUrl });
  if (!Array.isArray(feeds)) return [];
  return feeds.map(
    (f: {
      Url?: string;
      Status?: string;
      LastCrawled?: unknown;
      Submitted?: unknown;
      UrlCount?: number;
      Type?: string;
    }) => ({
      engine: "bing" as const,
      path: f.Url || "",
      lastSubmitted: bingDateToIso(f.Submitted),
      lastDownloaded: bingDateToIso(f.LastCrawled),
      urlCount: f.UrlCount != null ? Number(f.UrlCount) : null,
      status: f.Status || null,
      contents: f.Type || null,
      isSitemapsIndex: String(f.Type || "").toLowerCase().includes("index"),
      errors: String(f.Status || "").toLowerCase().includes("error") ? 1 : 0,
    })
  );
}

export async function inspectBingUrl(
  apiKey: string,
  siteUrl: string,
  url: string
): Promise<UrlInspectionResult> {
  try {
    const [info, traffic] = await Promise.all([
      bingCall(apiKey, "GetUrlInfo", { siteUrl, url }),
      bingCall(apiKey, "GetUrlTrafficInfo", { siteUrl, url }).catch(() => null),
    ]);
    const details: string[] = [];
    const lastCrawl = bingDateToIso(info?.LastCrawledDate) || null;
    const discovery = bingDateToIso(info?.DiscoveryDate) || null;
    const httpStatus = info?.HttpStatus != null ? Number(info.HttpStatus) : null;
    if (lastCrawl) details.push(`Last crawl: ${lastCrawl}`);
    if (discovery) details.push(`Discovered: ${discovery}`);
    if (httpStatus != null && httpStatus > 0) details.push(`HTTP status: ${httpStatus}`);
    if (info?.DocumentSize != null) details.push(`Document size: ${info.DocumentSize}`);
    if (info?.IsPage != null) details.push(`Is page: ${String(info.IsPage)}`);
    if (info?.AnchorCount != null) details.push(`Anchor count: ${info.AnchorCount}`);
    if (traffic) {
      details.push(`Clicks: ${traffic.Clicks ?? 0}, impressions: ${traffic.Impressions ?? 0}`);
    }
    const crawled = Boolean(lastCrawl);
    const verdict = crawled
      ? httpStatus && httpStatus >= 400
        ? `Crawled (HTTP ${httpStatus})`
        : "Known to Bing"
      : "No crawl record";
    return {
      engine: "bing",
      url,
      siteUrl,
      ok: true,
      verdict,
      lastCrawlTime: lastCrawl,
      httpStatus,
      indexingState: crawled ? "crawled" : "unknown",
      details,
      raw: { info, traffic },
    };
  } catch (err) {
    return {
      engine: "bing",
      url,
      siteUrl,
      ok: false,
      verdict: "Error",
      details: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Submit a single URL for Bing indexing (write). Prefer SubmitUrl / URL Submission. */
export async function submitBingUrl(apiKey: string, siteUrl: string, url: string): Promise<{ ok: boolean; raw: unknown }> {
  const raw = await bingPost(apiKey, "SubmitUrl", { siteUrl, url });
  return { ok: true, raw };
}
