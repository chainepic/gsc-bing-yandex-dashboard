import { getDb } from "./db/client";
import {
  auditLog,
  digests,
  hostEngineMeta,
  keywordSnapshot,
  metricDaily,
  pageSnapshots,
  sites,
  syncRuns,
  watchlist,
} from "./db/schema";
import { setSettings } from "./settings";

/** Wipe metrics/sites so first-run / empty screenshots stay free of real or fixture hosts. */
export function resetDemoData() {
  const db = getDb();
  db.delete(watchlist).run();
  db.delete(hostEngineMeta).run();
  db.delete(pageSnapshots).run();
  db.delete(auditLog).run();
  db.delete(keywordSnapshot).run();
  db.delete(metricDaily).run();
  db.delete(digests).run();
  db.delete(syncRuns).run();
  db.delete(sites).run();
  setSettings({ setupComplete: true, timeZone: "Asia/Shanghai", digestHour: 9, digestMinute: 0 });
  return { ok: true as const };
}

/** Load fictional example.com data for local UI demos (no real secrets). */
export function seedDemoData() {
  const db = getDb();
  const hosts = [
    { engine: "gsc", host: "example.com", propertyId: "sc-domain:example.com" },
    { engine: "bing", host: "example.com", propertyId: "https://example.com/" },
    { engine: "yandex", host: "example.com", propertyId: "https:example.com:443" },
    { engine: "gsc", host: "docs.example.com", propertyId: "https://docs.example.com/" },
    { engine: "bing", host: "docs.example.com", propertyId: "https://docs.example.com/" },
  ] as const;

  const siteIds: number[] = [];
  for (const row of hosts) {
    const inserted = db
      .insert(sites)
      .values({ ...row, enabled: true, label: "fixture" })
      .onConflictDoUpdate({
        target: [sites.engine, sites.propertyId],
        set: { host: row.host, enabled: true, label: "fixture" },
      })
      .returning()
      .get();
    siteIds.push(inserted.id);
  }

  const today = new Date();
  for (let i = 0; i < siteIds.length; i++) {
    const siteId = siteIds[i]!;
    const host = hosts[i]!.host;
    const engine = hosts[i]!.engine;
    for (let d = 27; d >= 0; d--) {
      const day = new Date(today);
      day.setUTCDate(day.getUTCDate() - d - 2);
      const date = day.toISOString().slice(0, 10);
      const clicks = 20 + ((i * 7 + d * 3) % 40);
      const impressions = clicks * (18 + (d % 5));
      db.insert(metricDaily)
        .values({
          engine,
          siteId,
          host,
          date,
          clicks,
          impressions,
          ctr: clicks / impressions,
          position: 8 + (d % 6),
        })
        .onConflictDoUpdate({
          target: [metricDaily.engine, metricDaily.siteId, metricDaily.date],
          set: { clicks, impressions, ctr: clicks / impressions, position: 8 + (d % 6), host },
        })
        .run();
    }
    const asOf = new Date(today);
    asOf.setUTCDate(asOf.getUTCDate() - 2);
    const asOfStr = asOf.toISOString().slice(0, 10);
    // Fictional queries only — never real customer keywords.
    const queries = [
      { q: "example product review", delta: -28, imprDelta: -120 },
      { q: "example pricing", delta: 12, imprDelta: 80 },
      { q: "example api tutorial", delta: 21, imprDelta: 150 },
      { q: "how to use example", delta: -9, imprDelta: 400 }, // impr ↑ clicks ↓
      { q: "example soft 404", delta: -35, imprDelta: -600 },
      { q: "示例产品评测", delta: 18, imprDelta: 95 },
      { q: "示例定价方案", delta: -14, imprDelta: -80 },
      { q: "示例 API 教程", delta: 9, imprDelta: 140 },
    ];
    for (const item of queries) {
      const clicks = 40 + Math.abs(item.delta);
      const impressions = 900 + Math.max(0, item.imprDelta);
      db.insert(keywordSnapshot)
        .values({
          engine,
          siteId,
          host,
          asOf: asOfStr,
          query: item.q,
          kind: "query",
          clicks,
          impressions,
          ctr: impressions ? clicks / impressions : 0,
          position: 12,
          clickDelta: item.delta,
          impressionDelta: item.imprDelta,
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
            clicks,
            impressions,
            ctr: impressions ? clicks / impressions : 0,
            clickDelta: item.delta,
            impressionDelta: item.imprDelta,
            host,
            kind: "query",
          },
        })
        .run();
    }
    const pages = [
      { q: "https://example.com/pricing", delta: 15, imprDelta: 90 },
      { q: "https://example.com/docs/api", delta: -11, imprDelta: 220 }, // impr ↑ clicks ↓
      { q: "https://example.com/blog/old", delta: -22, imprDelta: -520 },
    ];
    for (const item of pages) {
      const clicks = 30 + Math.abs(item.delta);
      const impressions = 600 + Math.max(0, item.imprDelta);
      db.insert(keywordSnapshot)
        .values({
          engine,
          siteId,
          host,
          asOf: asOfStr,
          query: item.q,
          kind: "page",
          clicks,
          impressions,
          ctr: impressions ? clicks / impressions : 0,
          position: 9,
          clickDelta: item.delta,
          impressionDelta: item.imprDelta,
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
            clicks,
            impressions,
            ctr: impressions ? clicks / impressions : 0,
            clickDelta: item.delta,
            impressionDelta: item.imprDelta,
            host,
            kind: "page",
          },
        })
        .run();
    }
  }

  const markdown = `# GSC · Bing · Yandex Daily (fixture)\n\nExample.com demo digest — not real traffic.\n`;
  db.insert(digests)
    .values({
      generatedOn: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
      payloadJson: JSON.stringify({ fixture: true }),
      markdown,
      delivered: false,
      deliveryNote: "fixture",
    })
    .run();

  setSettings({ setupComplete: true, timeZone: "Asia/Shanghai", digestHour: 9, digestMinute: 0 });
  return { sites: siteIds.length };
}
