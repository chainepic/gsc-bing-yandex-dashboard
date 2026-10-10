import type { EngineId } from "@search-triad/connectors";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { getDb } from "./db/client";
import { keywordSnapshot, metricDaily, sites, syncRuns } from "./db/schema";

export function listSites() {
  return getDb().select().from(sites).orderBy(sites.host).all();
}

export function getSiteByHost(host: string) {
  return getDb().select().from(sites).where(eq(sites.host, host)).all();
}

export function upsertSites(
  rows: Array<{ engine: EngineId; host: string; propertyId: string; enabled?: boolean; label?: string }>
) {
  const db = getDb();
  for (const row of rows) {
    db.insert(sites)
      .values({
        engine: row.engine,
        host: row.host,
        propertyId: row.propertyId,
        enabled: row.enabled ?? true,
        label: row.label,
      })
      .onConflictDoUpdate({
        target: [sites.engine, sites.propertyId],
        set: {
          host: row.host,
          enabled: row.enabled ?? true,
          label: row.label,
        },
      })
      .run();
  }
}

export function setSiteEnabled(id: number, enabled: boolean) {
  getDb().update(sites).set({ enabled }).where(eq(sites.id, id)).run();
}

export function overviewMetrics(days = 28) {
  const db = getDb();
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - days);
  const since = cutoff.toISOString().slice(0, 10);
  const rows = db
    .select({
      engine: metricDaily.engine,
      date: metricDaily.date,
      clicks: sql<number>`sum(${metricDaily.clicks})`,
      impressions: sql<number>`sum(${metricDaily.impressions})`,
    })
    .from(metricDaily)
    .where(gte(metricDaily.date, since))
    .groupBy(metricDaily.engine, metricDaily.date)
    .orderBy(metricDaily.date)
    .all();
  return rows;
}

export function siteComparison() {
  const db = getDb();
  const siteRows = listSites().filter((s) => s.enabled);
  return siteRows.map((site) => {
    const daily = db
      .select()
      .from(metricDaily)
      .where(and(eq(metricDaily.engine, site.engine), eq(metricDaily.siteId, site.id)))
      .all()
      .sort((a, b) => a.date.localeCompare(b.date));
    const week = daily.slice(-7);
    const prior = daily.slice(-14, -7);
    const weekClicks = week.reduce((s, d) => s + d.clicks, 0);
    const priorClicks = prior.reduce((s, d) => s + d.clicks, 0);
    const weekImpressions = week.reduce((s, d) => s + d.impressions, 0);
    const priorImpressions = prior.reduce((s, d) => s + d.impressions, 0);
    return {
      id: site.id,
      engine: site.engine,
      host: site.host,
      propertyId: site.propertyId,
      weekClicks,
      weekImpressions,
      clickDelta: weekClicks - priorClicks,
      impressionDelta: weekImpressions - priorImpressions,
      asOf: daily.at(-1)?.date || null,
    };
  });
}

export function siteDetail(host: string) {
  const matched = getSiteByHost(host);
  const engines = matched.map((site) => {
    const daily = getDb()
      .select()
      .from(metricDaily)
      .where(and(eq(metricDaily.engine, site.engine), eq(metricDaily.siteId, site.id)))
      .all()
      .sort((a, b) => a.date.localeCompare(b.date));
    const keywords = getDb()
      .select()
      .from(keywordSnapshot)
      .where(and(eq(keywordSnapshot.engine, site.engine), eq(keywordSnapshot.siteId, site.id)))
      .all()
      .sort((a, b) => Math.abs(b.clickDelta) - Math.abs(a.clickDelta));
    return { site, daily, keywords };
  });
  return engines;
}

export function listKeywords(limit = 200) {
  return getDb()
    .select()
    .from(keywordSnapshot)
    .orderBy(desc(sql`abs(${keywordSnapshot.clickDelta})`))
    .limit(limit)
    .all();
}

export function latestSync() {
  return getDb().select().from(syncRuns).orderBy(desc(syncRuns.id)).limit(1).get();
}
