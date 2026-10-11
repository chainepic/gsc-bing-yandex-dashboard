import { google } from "googleapis";
import { addDays, normalizeHost, pickAsOf, todayInTz } from "./dates.js";
import type { SitemapEntry, UrlInspectionResult } from "./inspection.js";
import { aggregateKeyed, moversFromMaps } from "./movers.js";
import type { DailyMetric, SiteRef, SiteWindowStats } from "./types.js";

export type GscAuth =
  | { kind: "service_account"; json: string | object }
  | { kind: "oauth"; clientId: string; clientSecret: string; refreshToken: string };

function getClient(auth: GscAuth) {
  if (auth.kind === "service_account") {
    const credentials = typeof auth.json === "string" ? JSON.parse(auth.json) : auth.json;
    const jwt = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
    });
    return google.searchconsole({ version: "v1", auth: jwt });
  }
  const oauth2 = new google.auth.OAuth2(auth.clientId, auth.clientSecret);
  oauth2.setCredentials({ refresh_token: auth.refreshToken });
  return google.searchconsole({ version: "v1", auth: oauth2 });
}

export function buildGscAuthUrl(clientId: string, redirectUri: string, state = "gsc") {
  const oauth2 = new google.auth.OAuth2(clientId, undefined, redirectUri);
  return oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/webmasters.readonly"],
    state,
  });
}

export async function exchangeGscCode(
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  code: string
): Promise<{ refresh_token?: string | null; access_token?: string | null }> {
  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  const { tokens } = await oauth2.getToken(code);
  return {
    refresh_token: tokens.refresh_token,
    access_token: tokens.access_token,
  };
}

export async function listGscSites(auth: GscAuth): Promise<SiteRef[]> {
  const sc = getClient(auth);
  const res = await sc.sites.list();
  return (res.data.siteEntry || [])
    .filter((s) => s.siteUrl)
    .map((s) => ({
      engine: "gsc" as const,
      host: normalizeHost(s.siteUrl!),
      siteUrl: s.siteUrl!,
      label: s.permissionLevel || undefined,
    }));
}

async function queryRows(
  sc: ReturnType<typeof getClient>,
  siteUrl: string,
  startDate: string,
  endDate: string,
  dimensions: string[],
  rowLimit = 25000
) {
  const res = await sc.searchanalytics.query({
    siteUrl,
    requestBody: { startDate, endDate, dimensions, rowLimit },
  });
  return res.data.rows || [];
}

export async function fetchGscSiteStats(
  auth: GscAuth,
  siteUrl: string,
  timeZone = "Asia/Shanghai",
  historyDays = 28
): Promise<SiteWindowStats> {
  const sc = getClient(auth);
  const today = todayInTz(timeZone);
  const rangeEnd = addDays(today, -2);
  const span = Math.min(90, Math.max(28, Math.floor(historyDays))) - 1;
  const rangeStart = addDays(rangeEnd, -span);
  const dateRows = await queryRows(sc, siteUrl, rangeStart, rangeEnd, ["date"], 1000);
  const daily: DailyMetric[] = dateRows.map((row) => ({
    date: row.keys?.[0] || "",
    clicks: row.clicks || 0,
    impressions: row.impressions || 0,
    ctr: row.ctr || 0,
    position: row.position ?? null,
  })).filter((d) => d.date);
  const totals = new Map(daily.map((d) => [d.date, d]));
  const asOf = pickAsOf(
    daily.map((d) => d.date),
    totals,
    today
  ) || rangeEnd;
  const weekStart = addDays(asOf, -6);
  const priorStart = addDays(asOf, -13);
  const priorEnd = addDays(asOf, -7);

  const sum = (start: string, end: string) =>
    daily
      .filter((d) => d.date >= start && d.date <= end)
      .reduce(
        (acc, d) => ({ clicks: acc.clicks + d.clicks, impressions: acc.impressions + d.impressions }),
        { clicks: 0, impressions: 0 }
      );

  const week = sum(weekStart, asOf);
  const prior = sum(priorStart, priorEnd);

  const [qWeek, qPrior, pWeek, pPrior] = await Promise.all([
    queryRows(sc, siteUrl, weekStart, asOf, ["query"], 1000),
    queryRows(sc, siteUrl, priorStart, priorEnd, ["query"], 1000),
    queryRows(sc, siteUrl, weekStart, asOf, ["page"], 1000),
    queryRows(sc, siteUrl, priorStart, priorEnd, ["page"], 1000),
  ]);

  const toAgg = (rows: typeof qWeek) =>
    aggregateKeyed(
      rows.map((r) => ({
        key: r.keys?.[0] || "",
        clicks: r.clicks || 0,
        impressions: r.impressions || 0,
        position: r.position ?? null,
      }))
    );

  const queryMoves = moversFromMaps(toAgg(qWeek), toAgg(qPrior));
  const pageMoves = moversFromMaps(toAgg(pWeek), toAgg(pPrior));

  return {
    host: normalizeHost(siteUrl),
    siteUrl,
    engine: "gsc",
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

export async function listGscSitemaps(auth: GscAuth, siteUrl: string): Promise<SitemapEntry[]> {
  const sc = getClient(auth);
  const res = await sc.sitemaps.list({ siteUrl });
  return (res.data.sitemap || []).map((s) => ({
    engine: "gsc" as const,
    path: s.path || "",
    lastSubmitted: s.lastSubmitted || null,
    lastDownloaded: s.lastDownloaded || null,
    isPending: Boolean(s.isPending),
    isSitemapsIndex: Boolean(s.isSitemapsIndex),
    warnings: s.warnings != null ? Number(s.warnings) : null,
    errors: s.errors != null ? Number(s.errors) : null,
    contents: (s.contents || []).map((c) => c.type).filter(Boolean).join(", ") || null,
    status: s.errors && Number(s.errors) > 0 ? "errors" : s.isPending ? "pending" : "ok",
  }));
}

export async function inspectGscUrl(
  auth: GscAuth,
  siteUrl: string,
  inspectionUrl: string
): Promise<UrlInspectionResult> {
  const sc = getClient(auth);
  try {
    const res = await sc.urlInspection.index.inspect({
      requestBody: {
        inspectionUrl,
        siteUrl,
        languageCode: "en-US",
      },
    });
    const result = res.data.inspectionResult;
    const index = result?.indexStatusResult;
    const details: string[] = [];
    if (index?.coverageState) details.push(`Coverage: ${index.coverageState}`);
    if (index?.indexingState) details.push(`Indexing: ${index.indexingState}`);
    if (index?.robotsTxtState) details.push(`robots.txt: ${index.robotsTxtState}`);
    if (index?.pageFetchState) details.push(`Fetch: ${index.pageFetchState}`);
    if (index?.lastCrawlTime) details.push(`Last crawl: ${index.lastCrawlTime}`);
    if (index?.sitemap?.length) details.push(`Sitemaps: ${index.sitemap.join(", ")}`);
    if (index?.referringUrls?.length) {
      details.push(`Referring URLs: ${index.referringUrls.slice(0, 3).join(", ")}`);
    }
    const verdict =
      index?.verdict ||
      index?.coverageState ||
      (result ? "Inspected" : "No result");
    return {
      engine: "gsc",
      url: inspectionUrl,
      siteUrl,
      ok: true,
      verdict: String(verdict),
      coverageState: index?.coverageState || null,
      indexingState: index?.indexingState || null,
      lastCrawlTime: index?.lastCrawlTime || null,
      robotsTxtState: index?.robotsTxtState || null,
      pageFetchState: index?.pageFetchState || null,
      details,
      raw: (result as Record<string, unknown>) || undefined,
    };
  } catch (err) {
    return {
      engine: "gsc",
      url: inspectionUrl,
      siteUrl,
      ok: false,
      verdict: "Error",
      details: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
