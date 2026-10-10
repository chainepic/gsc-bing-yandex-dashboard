import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { dbPath } from "../paths";
import * as schema from "./schema";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (_db) return _db;
  const file = dbPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      engine TEXT NOT NULL,
      host TEXT NOT NULL,
      property_id TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      label TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS sites_engine_property ON sites(engine, property_id);
    CREATE TABLE IF NOT EXISTS sync_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      status TEXT NOT NULL,
      message TEXT,
      detail_json TEXT
    );
    CREATE TABLE IF NOT EXISTS metric_daily (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      engine TEXT NOT NULL,
      site_id INTEGER NOT NULL,
      host TEXT NOT NULL,
      date TEXT NOT NULL,
      clicks INTEGER NOT NULL DEFAULT 0,
      impressions INTEGER NOT NULL DEFAULT 0,
      ctr REAL NOT NULL DEFAULT 0,
      position REAL NOT NULL DEFAULT 0
    );
    CREATE UNIQUE INDEX IF NOT EXISTS metric_daily_unique ON metric_daily(engine, site_id, date);
    CREATE TABLE IF NOT EXISTS keyword_snapshot (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      engine TEXT NOT NULL,
      site_id INTEGER NOT NULL,
      host TEXT NOT NULL,
      as_of TEXT NOT NULL,
      query TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'query',
      clicks INTEGER NOT NULL DEFAULT 0,
      impressions INTEGER NOT NULL DEFAULT 0,
      ctr REAL NOT NULL DEFAULT 0,
      position REAL NOT NULL DEFAULT 0,
      click_delta INTEGER NOT NULL DEFAULT 0,
      impression_delta INTEGER NOT NULL DEFAULT 0,
      window TEXT NOT NULL DEFAULT 'week'
    );
    CREATE UNIQUE INDEX IF NOT EXISTS keyword_snap_unique ON keyword_snapshot(engine, site_id, as_of, query, window, kind);
    CREATE TABLE IF NOT EXISTS digests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      generated_on TEXT NOT NULL,
      created_at TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      markdown TEXT NOT NULL,
      delivered INTEGER NOT NULL DEFAULT 0,
      delivery_note TEXT
    );
  `);

  // Lightweight migrations for existing DBs created before kind / detail_json.
  const cols = sqlite.prepare(`PRAGMA table_info(keyword_snapshot)`).all() as Array<{ name: string }>;
  if (!cols.some((c) => c.name === "kind")) {
    sqlite.exec(`ALTER TABLE keyword_snapshot ADD COLUMN kind TEXT NOT NULL DEFAULT 'query'`);
  }
  sqlite.exec(`DROP INDEX IF EXISTS keyword_snap_unique`);
  sqlite.exec(
    `CREATE UNIQUE INDEX IF NOT EXISTS keyword_snap_unique ON keyword_snapshot(engine, site_id, as_of, query, window, kind)`
  );

  const syncCols = sqlite.prepare(`PRAGMA table_info(sync_runs)`).all() as Array<{ name: string }>;
  if (!syncCols.some((c) => c.name === "detail_json")) {
    sqlite.exec(`ALTER TABLE sync_runs ADD COLUMN detail_json TEXT`);
  }

  _db = drizzle(sqlite, { schema });
  return _db;
}
