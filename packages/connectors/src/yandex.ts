import { addDays, normalizeHost, todayInTz } from "./dates.js";
import type { DailyMetric, SiteRef, SiteWindowStats } from "./types.js";

const API = "https://api.webmaster.yandex.net/v4";

async function yandexFetch(token: string, path: string, userId?: number | string) {
  const url = `${API}${path.replace("{user-id}", String(userId ?? ""))}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `OAuth ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
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
  timeZone = "Asia/Shanghai"
): Promise<SiteWindowStats> {
  const userId = await getYandexUserId(token);
  const today = todayInTz(timeZone);
  const asOf = addDays(today, -3);
  const weekStart = addDays(asOf, -6);
  const priorStart = addDays(asOf, -13);
  const priorEnd = addDays(asOf, -7);

  const popularQs = new URLSearchParams();
  popularQs.set("order_by", "TOTAL_CLICKS");
  popularQs.append("query_indicator", "TOTAL_CLICKS");
  popularQs.append("query_indicator", "TOTAL_SHOWS");
  popularQs.append("query_indicator", "AVG_SHOW_POSITION");
  popularQs.set("limit", "20");

  const historyQs = new URLSearchParams();
  historyQs.set("date_from", priorStart);
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
    queryGains: queries.filter((q: { clicks: number }) => q.clicks > 0).slice(0, 5),
    queryLosses: [],
    pageGains: [],
    pageLosses: [],
    meta: {
      sqi: summary.sqi ?? null,
      searchablePages: summary.searchable_pages_count ?? null,
    },
  };
}
