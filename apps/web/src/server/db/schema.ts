import { integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const sites = sqliteTable(
  "sites",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    engine: text("engine").notNull(), // gsc | bing | yandex
    host: text("host").notNull(),
    propertyId: text("property_id").notNull(),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    label: text("label"),
  },
  (t) => [uniqueIndex("sites_engine_property").on(t.engine, t.propertyId)]
);

export const syncRuns = sqliteTable("sync_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  startedAt: text("started_at").notNull(),
  finishedAt: text("finished_at"),
  status: text("status").notNull(), // running | ok | error
  message: text("message"),
  /** JSON: { total, completed, errors: Array<{ engine, host, message }> } */
  detailJson: text("detail_json"),
});

export const metricDaily = sqliteTable(
  "metric_daily",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    engine: text("engine").notNull(),
    siteId: integer("site_id").notNull(),
    host: text("host").notNull(),
    date: text("date").notNull(),
    clicks: integer("clicks").notNull().default(0),
    impressions: integer("impressions").notNull().default(0),
    ctr: real("ctr").notNull().default(0),
    position: real("position").notNull().default(0),
  },
  (t) => [uniqueIndex("metric_daily_unique").on(t.engine, t.siteId, t.date)]
);

export const keywordSnapshot = sqliteTable(
  "keyword_snapshot",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    engine: text("engine").notNull(),
    siteId: integer("site_id").notNull(),
    host: text("host").notNull(),
    asOf: text("as_of").notNull(),
    /** query text or page URL */
    query: text("query").notNull(),
    /** query | page */
    kind: text("kind").notNull().default("query"),
    clicks: integer("clicks").notNull().default(0),
    impressions: integer("impressions").notNull().default(0),
    ctr: real("ctr").notNull().default(0),
    position: real("position").notNull().default(0),
    clickDelta: integer("click_delta").notNull().default(0),
    impressionDelta: integer("impression_delta").notNull().default(0),
    window: text("window").notNull().default("week"),
  },
  (t) => [uniqueIndex("keyword_snap_unique").on(t.engine, t.siteId, t.asOf, t.query, t.window, t.kind)]
);

export const digests = sqliteTable("digests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  generatedOn: text("generated_on").notNull(),
  createdAt: text("created_at").notNull(),
  payloadJson: text("payload_json").notNull(),
  markdown: text("markdown").notNull(),
  delivered: integer("delivered", { mode: "boolean" }).notNull().default(false),
  deliveryNote: text("delivery_note"),
});
