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

/** Latest on-page HTML snapshot for a URL (own hosts only). */
export const pageSnapshots = sqliteTable(
  "page_snapshots",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    host: text("host").notNull(),
    url: text("url").notNull(),
    fetchedAt: text("fetched_at").notNull(),
    statusCode: integer("status_code"),
    finalUrl: text("final_url"),
    title: text("title"),
    metaDescription: text("meta_description"),
    h1: text("h1"),
    canonical: text("canonical"),
    robotsMeta: text("robots_meta"),
    contentLength: integer("content_length").notNull().default(0),
    issuesJson: text("issues_json").notNull().default("[]"),
    error: text("error"),
  },
  (t) => [uniqueIndex("page_snapshots_url").on(t.url)]
);

/** Optional write actions audit (e.g. Bing URL submit). */
export const auditLog = sqliteTable("audit_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  createdAt: text("created_at").notNull(),
  action: text("action").notNull(),
  host: text("host"),
  detailJson: text("detail_json"),
});

/** Per-host engine extras (e.g. Yandex SQI) refreshed on sync. */
export const hostEngineMeta = sqliteTable(
  "host_engine_meta",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    engine: text("engine").notNull(),
    host: text("host").notNull(),
    siteId: integer("site_id").notNull(),
    updatedAt: text("updated_at").notNull(),
    metaJson: text("meta_json").notNull().default("{}"),
  },
  (t) => [uniqueIndex("host_engine_meta_unique").on(t.engine, t.siteId)]
);

/** Persisted watchlist / site notes. */
export const watchlist = sqliteTable(
  "watchlist",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    host: text("host").notNull(),
    watched: integer("watched", { mode: "boolean" }).notNull().default(true),
    note: text("note").notNull().default(""),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [uniqueIndex("watchlist_host").on(t.host)]
);
