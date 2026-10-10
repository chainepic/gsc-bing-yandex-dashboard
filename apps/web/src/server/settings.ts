import { eq } from "drizzle-orm";
import { getDb } from "./db/client";
import { settings } from "./db/schema";

export type AppSettings = {
  timeZone: string;
  digestHour: number;
  digestMinute: number;
  setupComplete: boolean;
};

const DEFAULTS: AppSettings = {
  timeZone: "Asia/Shanghai",
  digestHour: 9,
  digestMinute: 0,
  setupComplete: false,
};

export function getSettings(): AppSettings {
  const db = getDb();
  const rows = db.select().from(settings).all();
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    timeZone: map.timeZone || DEFAULTS.timeZone,
    digestHour: Number(map.digestHour ?? DEFAULTS.digestHour),
    digestMinute: Number(map.digestMinute ?? DEFAULTS.digestMinute),
    setupComplete: map.setupComplete === "true",
  };
}

export function setSettings(patch: Partial<AppSettings>) {
  const db = getDb();
  const current = getSettings();
  const cleaned = Object.fromEntries(
    Object.entries(patch).filter(([, v]) => v !== undefined)
  ) as Partial<AppSettings>;
  const next = { ...current, ...cleaned };
  for (const [key, value] of Object.entries(next)) {
    const existing = db.select().from(settings).where(eq(settings.key, key)).get();
    if (existing) {
      db.update(settings).set({ value: String(value) }).where(eq(settings.key, key)).run();
    } else {
      db.insert(settings).values({ key, value: String(value) }).run();
    }
  }
  return next;
}
