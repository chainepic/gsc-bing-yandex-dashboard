import { getDb } from "./db/client";
import { digests, keywordSnapshot, metricDaily, sites } from "./db/schema";
import { setSettings } from "./settings";

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
    const queries = [
      { q: "example product review", delta: -28 },
      { q: "example pricing", delta: 12 },
      { q: "example api tutorial", delta: 21 },
      { q: "how to use example", delta: -9 },
    ];
    for (const item of queries) {
      db.insert(keywordSnapshot)
        .values({
          engine,
          siteId,
          host,
          asOf: asOfStr,
          query: item.q,
          kind: "query",
          clicks: 40 + Math.abs(item.delta),
          impressions: 900,
          ctr: 0.04,
          position: 12,
          clickDelta: item.delta,
          impressionDelta: item.delta * 10,
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
            clicks: 40 + Math.abs(item.delta),
            clickDelta: item.delta,
            host,
            kind: "query",
          },
        })
        .run();
    }
    const pages = [
      { q: "https://example.com/pricing", delta: 15 },
      { q: "https://example.com/docs/api", delta: -11 },
    ];
    for (const item of pages) {
      db.insert(keywordSnapshot)
        .values({
          engine,
          siteId,
          host,
          asOf: asOfStr,
          query: item.q,
          kind: "page",
          clicks: 30 + Math.abs(item.delta),
          impressions: 600,
          ctr: 0.05,
          position: 9,
          clickDelta: item.delta,
          impressionDelta: item.delta * 8,
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
            clicks: 30 + Math.abs(item.delta),
            clickDelta: item.delta,
            host,
            kind: "page",
          },
        })
        .run();
    }
  }

  const markdown = `# Search Triad Daily (fixture)\n\nExample.com demo digest — not real traffic.\n`;
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
