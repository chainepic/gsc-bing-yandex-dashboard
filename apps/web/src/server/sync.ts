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
  if (!secrets.yandex?.accessToken) throw new Error("Yandex token missing");
  return fetchYandexSiteStats(secrets.yandex.accessToken, propertyId, timeZone);
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
    ...stats.queryGains.map((r) => ({ ...r, direction: "gain" as const })),
    ...stats.queryLosses.map((r) => ({ ...r, direction: "loss" as const })),
  ];
  for (const row of rows) {
    db.insert(keywordSnapshot)
      .values({
        engine,
        siteId,
        host,
        asOf: stats.asOf,
        query: row.key,
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
        ],
        set: {
          clicks: row.clicks,
          impressions: row.impressions,
          clickDelta: row.clickDelta,
          impressionDelta: row.impressionDelta,
          position: row.position || 0,
          host,
        },
      })
      .run();
  }
}

export type SyncResult = {
  runId: number;
  status: "ok" | "error";
  message: string;
  byEngine: Record<EngineId, SiteWindowStats[]>;
};

export async function runSync(): Promise<SyncResult> {
  const db = getDb();
  const settings = getSettings();
  const startedAt = new Date().toISOString();
  const run = db
    .insert(syncRuns)
    .values({ startedAt, status: "running", message: "Sync started" })
    .returning()
    .get();

  const byEngine: Record<EngineId, SiteWindowStats[]> = { gsc: [], bing: [], yandex: [] };
  const errors: string[] = [];

  const enabled = db.select().from(sites).where(eq(sites.enabled, true)).all();

  for (const site of enabled) {
    const engine = site.engine as EngineId;
    try {
      const stats = await fetchSite(engine, site.propertyId, settings.timeZone);
      persistSite(site.id, site.host, engine, stats);
      byEngine[engine].push(stats);
    } catch (err) {
      errors.push(`${engine}:${site.host}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const status = errors.length && !Object.values(byEngine).some((a) => a.length) ? "error" : "ok";
  const message = errors.length
    ? `Synced ${Object.values(byEngine).flat().length} sites; ${errors.length} errors: ${errors.slice(0, 3).join("; ")}`
    : `Synced ${Object.values(byEngine).flat().length} sites`;

  db.update(syncRuns)
    .set({ finishedAt: new Date().toISOString(), status, message })
    .where(eq(syncRuns.id, run.id))
    .run();

  return { runId: run.id, status, message, byEngine };
}
