import { eq } from "drizzle-orm";
import {
  DEFAULT_DIGEST_SECTIONS,
  parseDigestSections,
  type DigestLocale,
  type DigestSections,
} from "@search-triad/core";
import type { UiLocale } from "@/lib/i18n";
import { getDb } from "./db/client";
import { settings } from "./db/schema";

export type AppSettings = {
  timeZone: string;
  digestHour: number;
  digestMinute: number;
  setupComplete: boolean;
  digestIncludeRecommendations: boolean;
  crawlMaxUrlsPerHost: number;
  crawlConcurrency: number;
  bingUrlSubmitEnabled: boolean;
  /** Sync/UI history window in days (28 | 56 | 90). */
  historyDays: number;
  /** Null until the user explicitly saves UI language (then browser Accept-Language is used). */
  uiLocale: UiLocale | null;
  digestLocale: DigestLocale;
  digestSections: DigestSections;
  /**
   * @deprecated Recommendation-card polish — hidden in UI; use Report AI instead.
   */
  llmPolishEnabled: boolean;
  /** @deprecated Prefer reportAiBaseUrl */
  llmBaseUrl: string;
  /** @deprecated Prefer reportAiModel */
  llmModel: string;
  /** Opt-in BYOK report interpretation — default OFF. */
  reportAiEnabled: boolean;
  /** OpenAI-compatible Chat Completions base (…/v1). */
  reportAiBaseUrl: string;
  reportAiModel: string;
};

const DEFAULTS: AppSettings = {
  timeZone: "Asia/Shanghai",
  digestHour: 9,
  digestMinute: 0,
  setupComplete: false,
  digestIncludeRecommendations: true,
  crawlMaxUrlsPerHost: 15,
  crawlConcurrency: 3,
  bingUrlSubmitEnabled: false,
  historyDays: 28,
  uiLocale: null,
  digestLocale: "en",
  digestSections: { ...DEFAULT_DIGEST_SECTIONS },
  llmPolishEnabled: false,
  llmBaseUrl: "http://127.0.0.1:11434",
  llmModel: "llama3.2",
  reportAiEnabled: false,
  reportAiBaseUrl: "https://api.openai.com/v1",
  reportAiModel: "gpt-4o-mini",
};

function intSetting(map: Record<string, string>, key: string, fallback: number, min: number, max: number) {
  const n = Number(map[key] ?? fallback);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

function historyDaysOf(map: Record<string, string>): number {
  const n = intSetting(map, "historyDays", DEFAULTS.historyDays, 28, 90);
  if (n <= 28) return 28;
  if (n <= 56) return 56;
  return 90;
}

export function getSettings(): AppSettings {
  const db = getDb();
  const rows = db.select().from(settings).all();
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  let digestSections = { ...DEFAULT_DIGEST_SECTIONS };
  if (map.digestSectionsJson) {
    try {
      digestSections = parseDigestSections(JSON.parse(map.digestSectionsJson));
    } catch {
      digestSections = { ...DEFAULT_DIGEST_SECTIONS };
    }
  }
  if (map.digestIncludeRecommendations === "false") {
    digestSections = { ...digestSections, recommendations: false };
  }
  return {
    timeZone: map.timeZone || DEFAULTS.timeZone,
    digestHour: Number(map.digestHour ?? DEFAULTS.digestHour),
    digestMinute: Number(map.digestMinute ?? DEFAULTS.digestMinute),
    setupComplete: map.setupComplete === "true",
    digestIncludeRecommendations:
      map.digestIncludeRecommendations === undefined
        ? DEFAULTS.digestIncludeRecommendations
        : map.digestIncludeRecommendations === "true",
    crawlMaxUrlsPerHost: intSetting(map, "crawlMaxUrlsPerHost", DEFAULTS.crawlMaxUrlsPerHost, 1, 50),
    crawlConcurrency: intSetting(map, "crawlConcurrency", DEFAULTS.crawlConcurrency, 1, 8),
    bingUrlSubmitEnabled: map.bingUrlSubmitEnabled === "true",
    historyDays: historyDaysOf(map),
    uiLocale: map.uiLocale === "zh" || map.uiLocale === "en" ? map.uiLocale : null,
    digestLocale: map.digestLocale === "zh" ? "zh" : "en",
    digestSections,
    llmPolishEnabled: map.llmPolishEnabled === "true",
    llmBaseUrl: map.llmBaseUrl || DEFAULTS.llmBaseUrl,
    llmModel: map.llmModel || DEFAULTS.llmModel,
    reportAiEnabled: map.reportAiEnabled === "true",
    reportAiBaseUrl: map.reportAiBaseUrl || map.llmBaseUrl || DEFAULTS.reportAiBaseUrl,
    reportAiModel: map.reportAiModel || map.llmModel || DEFAULTS.reportAiModel,
  };
}

export function setSettings(patch: Partial<AppSettings>) {
  const db = getDb();
  const current = getSettings();
  const cleaned = Object.fromEntries(
    Object.entries(patch).filter(([, v]) => v !== undefined)
  ) as Partial<AppSettings>;
  const next = { ...current, ...cleaned };
  if (cleaned.digestSections) {
    next.digestSections = parseDigestSections({ ...current.digestSections, ...cleaned.digestSections });
  }
  if (cleaned.digestIncludeRecommendations !== undefined) {
    next.digestSections = {
      ...next.digestSections,
      recommendations: Boolean(cleaned.digestIncludeRecommendations),
    };
  }

  const flat: Record<string, string> = {
    timeZone: next.timeZone,
    digestHour: String(next.digestHour),
    digestMinute: String(next.digestMinute),
    setupComplete: String(next.setupComplete),
    digestIncludeRecommendations: String(next.digestIncludeRecommendations),
    crawlMaxUrlsPerHost: String(next.crawlMaxUrlsPerHost),
    crawlConcurrency: String(next.crawlConcurrency),
    bingUrlSubmitEnabled: String(next.bingUrlSubmitEnabled),
    historyDays: String(next.historyDays),
    digestLocale: next.digestLocale,
    digestSectionsJson: JSON.stringify(next.digestSections),
    llmPolishEnabled: "false",
    llmBaseUrl: next.llmBaseUrl,
    llmModel: next.llmModel,
    reportAiEnabled: String(next.reportAiEnabled),
    reportAiBaseUrl: next.reportAiBaseUrl,
    reportAiModel: next.reportAiModel,
  };
  // Only persist uiLocale when explicitly set (do not write "en" for unset → browser default).
  if (next.uiLocale === "zh" || next.uiLocale === "en") {
    flat.uiLocale = next.uiLocale;
  }

  for (const [key, value] of Object.entries(flat)) {
    const existing = db.select().from(settings).where(eq(settings.key, key)).get();
    if (existing) {
      db.update(settings).set({ value }).where(eq(settings.key, key)).run();
    } else {
      db.insert(settings).values({ key, value }).run();
    }
  }
  return getSettings();
}
