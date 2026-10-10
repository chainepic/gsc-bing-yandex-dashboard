import {
  fetchBingSiteStats,
  fetchGscSiteStats,
  fetchYandexSiteStats,
  type EngineId,
  type GscAuth,
  type SiteWindowStats,
} from "@search-triad/connectors";
import { eq } from "drizzle-orm";
import { getDb } from "./db/client";
import { keywordSnapshot, metricDaily, sites, syncRuns } from "./db/schema";
import { loadSecrets } from "./secrets";
import { getSettings } from "./settings";
import { ensureYandexAccessToken } from "./yandex-auth";

export type SyncSiteError = {
  engine: EngineId;
  host: string;
  propertyId: string;
  message: string;
};

export type SyncDetail = {
  total: number;
  completed: number;
  ok: number;
  errors: SyncSiteError[];
};

function gscAuthFromSecrets(): GscAuth | null {
  const s = loadSecrets().google;
  if (!s) return null;
  if (s.mode === "service_account" && s.serviceAccountJson) {
    return { kind: "service_account", json: s.serviceAccountJson };
  }
  if (s.clientId && s.clientSecret && s.refreshToken) {
    return { kind: "oauth", clientId: s.clientId, clientSecret: s.clientSecret, refreshToken: s.refreshToken };
  }
  return null;
}

async function fetchSite(engine: EngineId, propertyId: string, timeZone: string): Promise<SiteWindowStats> {
  const secrets = loadSecrets();
  if (engine === "gsc") {
    const auth = gscAuthFromSecrets();
    if (!auth) throw new Error("Google credentials missing");
    return fetchGscSiteStats(auth, propertyId, timeZone);
  }
  if (engine === "bing") {
    if (!secrets.bing?.apiKey) throw new Error("Bing API key missing");
    return fetchBingSiteStats(secrets.bing.apiKey, propertyId, timeZone);
  }
  const token = await ensureYandexAccessToken();
  return fetchYandexSiteStats(token, propertyId, timeZone);
}

function persistSite(siteId: number, host: string, engine: EngineId, stats: SiteWindowStats) {
  const db = getDb();
  for (const day of stats.daily) {
    db.insert(metricDaily)
      .values({
        engine,
        siteId,
        host,
        date: day.date,
        clicks: day.clicks,
        impressions: day.impressions,
        ctr: day.ctr || 0,
        position: day.position || 0,
      })
      .onConflictDoUpdate({
        target: [metricDaily.engine, metricDaily.siteId, metricDaily.date],
        set: {
          clicks: day.clicks,
          impressions: day.impressions,
          ctr: day.ctr || 0,
          position: day.position || 0,
          host,
        },
      })
      .run();
  }

  db.delete(keywordSnapshot)
    .where(eq(keywordSnapshot.siteId, siteId))
    .run();

  const rows = [
    ...stats.queryGains.map((r) => ({ ...r, direction: "gain" as const, kind: "query" as const })),
    ...stats.queryLosses.map((r) => ({ ...r, direction: "loss" as const, kind: "query" as const })),
    ...stats.pageGains.map((r) => ({ ...r, direction: "gain" as const, kind: "page" as const })),
    ...stats.pageLosses.map((r) => ({ ...r, direction: "loss" as const, kind: "page" as const })),
  ];
  for (const row of rows) {
    if (!row.key) continue;
    db.insert(keywordSnapshot)
      .values({
        engine,
        siteId,
        host,
        asOf: stats.asOf,
        query: row.key,
        kind: row.kind,
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.impressions ? row.clicks / row.impressions : 0,
        position: row.position || 0,
        clickDelta: row.clickDelta,
        impressionDelta: row.impressionDelta,
        window: "week",
      })
      .onConflictDoUpdate({
        target: [
          keywordSnapshot.engine,
          keywordSnapshot.siteId,
          keywordSnapshot.asOf,
          keywordSnapshot.query,
          keywordSnapshot.window,
          keywordSnapshot.kind,
        ],
        set: {
          clicks: row.clicks,
          impressions: row.impressions,
          clickDelta: row.clickDelta,
          impressionDelta: row.impressionDelta,
          position: row.position || 0,
          host,
          kind: row.kind,
        },
      })
      .run();
  }
}

function writeProgress(runId: number, detail: SyncDetail, status = "running") {
  const message =
    status === "running"
      ? `Syncing ${detail.completed}/${detail.total}…`
      : detail.errors.length
        ? `Synced ${detail.ok}/${detail.total} sites; ${detail.errors.length} failed`
        : `Synced ${detail.ok} sites`;
  getDb()
    .update(syncRuns)
    .set({
      status,
      message,
      detailJson: JSON.stringify(detail),
      ...(status === "running" ? {} : { finishedAt: new Date().toISOString() }),
    })
    .where(eq(syncRuns.id, runId))
    .run();
  return message;
}

export type SyncResult = {
  runId: number;
  status: "ok" | "error";
  message: string;
  detail: SyncDetail;
  byEngine: Record<EngineId, SiteWindowStats[]>;
};

export async function runSync(): Promise<SyncResult> {
  const db = getDb();
  const settings = getSettings();
  const startedAt = new Date().toISOString();
  const run = db
    .insert(syncRuns)
    .values({ startedAt, status: "running", message: "Sync started", detailJson: null })
    .returning()
    .get();

  const byEngine: Record<EngineId, SiteWindowStats[]> = { gsc: [], bing: [], yandex: [] };
  const enabled = db.select().from(sites).where(eq(sites.enabled, true)).all();
  const detail: SyncDetail = {
    total: enabled.length,
    completed: 0,
    ok: 0,
    errors: [],
  };
  writeProgress(run.id, detail);

  for (const site of enabled) {
    const engine = site.engine as EngineId;
    try {
      const stats = await fetchSite(engine, site.propertyId, settings.timeZone);
      persistSite(site.id, site.host, engine, stats);
      byEngine[engine].push(stats);
      detail.ok += 1;
    } catch (err) {
      detail.errors.push({
        engine,
        host: site.host,
        propertyId: site.propertyId,
        message: err instanceof Error ? err.message : String(err),
      });
    }
    detail.completed += 1;
    writeProgress(run.id, detail);
  }

  const status = detail.errors.length && detail.ok === 0 ? "error" : "ok";
  const message = writeProgress(run.id, detail, status);

  return { runId: run.id, status, message, detail, byEngine };
}
