import { addDays, normalizeHost, todayInTz } from "./dates.js";
import type { SitemapEntry, UrlInspectionResult } from "./inspection.js";
import type { DailyMetric, SiteRef, SiteWindowStats } from "./types.js";

const API = "https://api.webmaster.yandex.net/v4";

function networkErrorDetail(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  const cause = (err as Error & { cause?: unknown }).cause;
  if (cause instanceof Error) {
    const code = (cause as Error & { code?: string }).code;
    return code ? `${cause.message} (${code})` : cause.message;
  }
  return err.message;
}

async function yandexFetch(token: string, path: string, userId?: number | string) {
  const url = `${API}${path.replace("{user-id}", String(userId ?? ""))}`;
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Authorization: `OAuth ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  } catch (err) {
    throw new Error(
      `Yandex unreachable (${networkErrorDetail(err)}). Need reachability to api.webmaster.yandex.net (VPN/proxy node must open that host; see /faq#yandex-unreachable)`
    );
  }
  const text = await response.text();
  if (!response.ok) throw new Error(`Yandex ${path} HTTP ${response.status}: ${text.slice(0, 220)}`);
  return text ? JSON.parse(text) : {};
}

export type YandexTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type?: string;
};

/** Authorization-code flow (preferred — yields refresh_token). */
export function buildYandexAuthUrl(clientId: string, redirectUri: string) {
  const qs = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    force_confirm: "yes",
    scope: "webmaster:hostinfo webmaster:verify",
  });
  return `https://oauth.yandex.com/authorize?${qs.toString()}`;
}

async function yandexTokenRequest(body: URLSearchParams): Promise<YandexTokenResponse> {
  const response = await fetch("https://oauth.yandex.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Yandex token HTTP ${response.status}: ${text.slice(0, 220)}`);
  }
  const data = JSON.parse(text) as YandexTokenResponse;
  if (!data.access_token) throw new Error("Yandex token response missing access_token");
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: Number(data.expires_in) || 3600,
    token_type: data.token_type,
  };
}

export async function exchangeYandexCode(
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  code: string
): Promise<YandexTokenResponse> {
  return yandexTokenRequest(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    })
  );
}

export async function refreshYandexToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<YandexTokenResponse> {
  return yandexTokenRequest(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    })
  );
}

export async function getYandexUserId(token: string): Promise<number> {
  const user = await yandexFetch(token, "/user");
  return user.user_id;
}

export async function listYandexHosts(token: string): Promise<SiteRef[]> {
  const userId = await getYandexUserId(token);
  const data = await yandexFetch(token, "/user/{user-id}/hosts/", userId);
  return (data.hosts || []).map((h: { host_id: string; ascii_host_url?: string; unicode_host_url?: string }) => {
    const ascii = h.ascii_host_url || h.unicode_host_url || h.host_id;
    return {
      engine: "yandex" as const,
      host: normalizeHost(ascii),
      siteUrl: h.host_id,
      label: ascii,
    };
  });
}

function sumHistory(
  series: Array<{ date?: string; value?: number }> | undefined,
  start: string,
  end: string
) {
  let total = 0;
  for (const point of series || []) {
    const day = String(point.date || "").slice(0, 10);
    if (!day || day < start || day > end) continue;
    total += Number(point.value) || 0;
  }
  return total;
}

function historyToDaily(
  clicks: Array<{ date?: string; value?: number }> | undefined,
  shows: Array<{ date?: string; value?: number }> | undefined
): DailyMetric[] {
  const map = new Map<string, DailyMetric>();
  for (const point of clicks || []) {
    const day = String(point.date || "").slice(0, 10);
    if (!day) continue;
    const cur = map.get(day) || { date: day, clicks: 0, impressions: 0 };
    cur.clicks += Number(point.value) || 0;
    map.set(day, cur);
  }
  for (const point of shows || []) {
    const day = String(point.date || "").slice(0, 10);
    if (!day) continue;
    const cur = map.get(day) || { date: day, clicks: 0, impressions: 0 };
    cur.impressions += Number(point.value) || 0;
    map.set(day, cur);
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export async function fetchYandexSiteStats(
  token: string,
  hostId: string,
  timeZone = "Asia/Shanghai",
  historyDays = 28
): Promise<SiteWindowStats> {
  const userId = await getYandexUserId(token);
  const today = todayInTz(timeZone);
  const asOf = addDays(today, -3);
  const weekStart = addDays(asOf, -6);
  const priorStart = addDays(asOf, -13);
  const priorEnd = addDays(asOf, -7);
  const span = Math.min(90, Math.max(28, Math.floor(historyDays)));
  const historyFrom = addDays(asOf, -(span - 1));

  const popularQs = new URLSearchParams();
  popularQs.set("order_by", "TOTAL_CLICKS");
  popularQs.append("query_indicator", "TOTAL_CLICKS");
  popularQs.append("query_indicator", "TOTAL_SHOWS");
  popularQs.append("query_indicator", "AVG_SHOW_POSITION");
  popularQs.set("limit", "20");

  const historyQs = new URLSearchParams();
  historyQs.set("date_from", historyFrom);
  historyQs.set("date_to", asOf);
  historyQs.append("query_indicator", "TOTAL_CLICKS");
  historyQs.append("query_indicator", "TOTAL_SHOWS");

  const enc = encodeURIComponent(hostId);
  const [summary, popular, history] = await Promise.all([
    yandexFetch(token, `/user/{user-id}/hosts/${enc}/summary/`, userId).catch(() => ({})),
    yandexFetch(
      token,
      `/user/{user-id}/hosts/${enc}/search-queries/popular/?${popularQs}`,
      userId
    ).catch(() => ({ queries: [] })),
    yandexFetch(
      token,
      `/user/{user-id}/hosts/${enc}/search-queries/all/history/?${historyQs}`,
      userId
    ).catch(() => ({ indicators: {} })),
  ]);

  const clickSeries = history.indicators?.TOTAL_CLICKS || [];
  const showSeries = history.indicators?.TOTAL_SHOWS || [];
  const week = {
    clicks: sumHistory(clickSeries, weekStart, asOf),
    impressions: sumHistory(showSeries, weekStart, asOf),
  };
  const prior = {
    clicks: sumHistory(clickSeries, priorStart, priorEnd),
    impressions: sumHistory(showSeries, priorStart, priorEnd),
  };

  const queries = (popular.queries || []).slice(0, 10).map(
    (q: { query_text?: string; indicators?: Record<string, number> }) => ({
      key: q.query_text || "",
      clicks: Number(q.indicators?.TOTAL_CLICKS) || 0,
      impressions: Number(q.indicators?.TOTAL_SHOWS) || 0,
      position: q.indicators?.AVG_SHOW_POSITION ? Number(q.indicators.AVG_SHOW_POSITION) : null,
      clickDelta: 0,
      impressionDelta: 0,
    })
  );

  return {
    host: normalizeHost(hostId),
    siteUrl: hostId,
    engine: "yandex",
    asOf,
    week,
    prior,
    clickDelta: week.clicks - prior.clicks,
    impressionDelta: week.impressions - prior.impressions,
    daily: historyToDaily(clickSeries, showSeries),
    queryGains: queries.filter((q: { clicks: number }) => q.clicks > 0).slice(0, 30),
    queryLosses: [],
    pageGains: [],
    pageLosses: [],
    meta: {
      sqi: summary.sqi ?? null,
      searchablePages: summary.searchable_pages_count ?? null,
      excludedPages: summary.excluded_pages_count ?? null,
    },
  };
}

export async function listYandexSitemaps(token: string, hostId: string): Promise<SitemapEntry[]> {
  const userId = await getYandexUserId(token);
  const enc = encodeURIComponent(hostId);
  const data = await yandexFetch(token, `/user/{user-id}/hosts/${enc}/sitemaps/?limit=100`, userId);
  return (data.sitemaps || []).map(
    (s: {
      sitemap_url?: string;
      last_access_date?: string;
      errors_count?: number;
      urls_count?: number;
      sitemap_type?: string;
      sources?: string[];
    }) => ({
      engine: "yandex" as const,
      path: s.sitemap_url || "",
      lastDownloaded: s.last_access_date ? String(s.last_access_date).slice(0, 10) : null,
      errors: s.errors_count != null ? Number(s.errors_count) : null,
      urlCount: s.urls_count != null ? Number(s.urls_count) : null,
      isSitemapsIndex: s.sitemap_type === "INDEX_SITEMAP",
      contents: (s.sources || []).join(", ") || s.sitemap_type || null,
      status: Number(s.errors_count) > 0 ? "errors" : "ok",
    })
  );
}

/**
 * Yandex has no GSC-style per-URL inspection. Within API limits we return host
 * indexing status plus any matching recrawl-queue entry for the URL.
 */
export async function inspectYandexUrl(
  token: string,
  hostId: string,
  url: string
): Promise<UrlInspectionResult> {
  try {
    const userId = await getYandexUserId(token);
    const enc = encodeURIComponent(hostId);
    const [hostInfo, summary, queue] = await Promise.all([
      yandexFetch(token, `/user/{user-id}/hosts/${enc}/`, userId).catch(() => ({})),
      yandexFetch(token, `/user/{user-id}/hosts/${enc}/summary/`, userId).catch(() => ({})),
      yandexFetch(token, `/user/{user-id}/hosts/${enc}/recrawl/queue/?limit=100`, userId).catch(() => ({
        tasks: [],
      })),
    ]);
    const details: string[] = [];
    const hostStatus = hostInfo.host_data_status || null;
    if (hostStatus) details.push(`Host data status: ${hostStatus}`);
    if (summary.sqi != null) details.push(`SQI: ${summary.sqi}`);
    if (summary.searchable_pages_count != null) {
      details.push(`Searchable pages: ${summary.searchable_pages_count}`);
    }
    if (summary.excluded_pages_count != null) {
      details.push(`Excluded pages: ${summary.excluded_pages_count}`);
    }
    const tasks = Array.isArray(queue.tasks) ? queue.tasks : [];
    const match = tasks.find(
      (t: { url?: string }) => String(t.url || "").replace(/\/$/, "") === url.replace(/\/$/, "")
    );
    if (match) {
      details.push(`Recrawl task: ${match.state || "unknown"} (added ${match.added_time || "—"})`);
    } else {
      details.push(
        "No per-URL index inspection on Yandex API; showing host summary. Recrawl queue has no match for this URL."
      );
    }
    const verdict = match?.state
      ? `Recrawl: ${match.state}`
      : hostStatus === "OK"
        ? "Host indexed (no URL-level verdict)"
        : hostStatus
          ? `Host: ${hostStatus}`
          : "Host summary only";
    return {
      engine: "yandex",
      url,
      siteUrl: hostId,
      ok: true,
      verdict,
      indexingState: hostStatus || match?.state || null,
      coverageState: hostStatus || null,
      details,
      raw: { hostInfo, summary, recrawlMatch: match || null },
    };
  } catch (err) {
    return {
      engine: "yandex",
      url,
      siteUrl: hostId,
      ok: false,
      verdict: "Error",
      details: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
