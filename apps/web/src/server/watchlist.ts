import { desc, eq } from "drizzle-orm";
import { normalizeHost } from "@search-triad/connectors";
import { getDb } from "./db/client";
import { watchlist } from "./db/schema";

export function listWatchlist() {
  return getDb().select().from(watchlist).orderBy(desc(watchlist.watched), watchlist.host).all();
}

export function getWatchNote(host: string) {
  return getDb().select().from(watchlist).where(eq(watchlist.host, normalizeHost(host))).get();
}

export function upsertWatchlist(input: { host: string; watched?: boolean; note?: string }) {
  const host = normalizeHost(input.host);
  if (!host) throw new Error("host required");
  const db = getDb();
  const existing = db.select().from(watchlist).where(eq(watchlist.host, host)).get();
  const updatedAt = new Date().toISOString();
  if (existing) {
    db.update(watchlist)
      .set({
        watched: input.watched ?? existing.watched,
        note: input.note !== undefined ? input.note : existing.note,
        updatedAt,
      })
      .where(eq(watchlist.host, host))
      .run();
  } else {
    db.insert(watchlist)
      .values({
        host,
        watched: input.watched ?? true,
        note: input.note ?? "",
        updatedAt,
      })
      .run();
  }
  return getWatchNote(host);
}

export function removeWatchlist(host: string) {
  getDb().delete(watchlist).where(eq(watchlist.host, normalizeHost(host))).run();
}
