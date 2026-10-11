import {
  recommendationsToCsv,
  runRules,
  type OnPageIssue,
  type Recommendation,
  type RuleMover,
  type RuleOnPageAudit,
  type RuleSiteMetric,
} from "@search-triad/core";
import type { EngineId } from "@search-triad/connectors";
import { eq } from "drizzle-orm";
import { droppingPagesForHost, listAllSnapshotsWithIssues } from "./crawl";
import { getDb } from "./db/client";
import { keywordSnapshot, settings, sites } from "./db/schema";
import { coverageGapTable, hostEngineMetaForHost, siteComparison } from "./queries";
import { secretsStatus } from "./secrets";

export type RecommendationState = {
  /** recommendation id → ISO snooze-until or "done" */
  items: Record<string, { status: "snoozed" | "done"; until?: string; at: string }>;
};

function loadState(): RecommendationState {
  const row = getDb().select().from(settings).where(eq(settings.key, "recommendationState")).get();
  if (!row?.value) return { items: {} };
  try {
    const parsed = JSON.parse(row.value) as RecommendationState;
    return { items: parsed.items || {} };
  } catch {
    return { items: {} };
  }
}

function saveState(state: RecommendationState) {
  const db = getDb();
  const key = "recommendationState";
  const value = JSON.stringify(state);
  const existing = db.select().from(settings).where(eq(settings.key, key)).get();
  if (existing) {
    db.update(settings).set({ value }).where(eq(settings.key, key)).run();
  } else {
    db.insert(settings).values({ key, value }).run();
  }
}

function isHidden(id: string, state: RecommendationState, now = new Date()): boolean {
  const entry = state.items[id];
  if (!entry) return false;
  if (entry.status === "done") return true;
  if (entry.status === "snoozed" && entry.until) {
    return new Date(entry.until).getTime() > now.getTime();
  }
  return false;
}

function connectedEngines(): EngineId[] {
  const status = secretsStatus();
  const engines: EngineId[] = [];
  if (status.google) engines.push("gsc");
  if (status.bing) engines.push("bing");
  if (status.yandex) engines.push("yandex");
  // Also count enabled site bindings even if secrets check is stale
  const bound = new Set(
    getDb()
      .select()
      .from(sites)
      .all()
      .filter((s) => s.enabled)
      .map((s) => s.engine as EngineId)
  );
  for (const e of bound) {
    if (!engines.includes(e)) engines.push(e);
  }
  return engines;
}

function buildMovers(): RuleMover[] {
  const rows = getDb().select().from(keywordSnapshot).all();
  return rows.map((r) => ({
    engine: r.engine as EngineId,
    host: r.host,
    key: r.query,
    kind: (r.kind === "page" ? "page" : "query") as "query" | "page",
    clicks: r.clicks,
    impressions: r.impressions,
    clickDelta: r.clickDelta,
    impressionDelta: r.impressionDelta,
    position: r.position || null,
  }));
}

function buildSites(): RuleSiteMetric[] {
  const comps = siteComparison();
  const gaps = coverageGapTable();
  const byHostEngine = new Map<string, RuleSiteMetric>();

  for (const g of gaps) {
    for (const engine of ["gsc", "bing", "yandex"] as EngineId[]) {
      const cell = g.engines[engine];
      if (!cell) continue;
      byHostEngine.set(`${g.host}:${engine}`, {
        engine,
        host: g.host,
        weekClicks: cell.weekClicks,
        weekImpressions: cell.weekImpressions,
        clickDelta: cell.clickDelta,
        impressionDelta: cell.impressionDelta,
        connected: cell.connected,
      });
    }
  }
  for (const c of comps) {
    const key = `${c.host}:${c.engine}`;
    byHostEngine.set(key, {
      engine: c.engine as EngineId,
      host: c.host,
      weekClicks: c.weekClicks,
      weekImpressions: c.weekImpressions,
      clickDelta: c.clickDelta,
      impressionDelta: c.impressionDelta,
      connected: true,
    });
  }
  return [...byHostEngine.values()];
}

function buildOnPageAudits(): RuleOnPageAudit[] {
  const snaps = listAllSnapshotsWithIssues(80);
  const dropByUrl = new Map<string, { clickDelta: number; impressionDelta: number }>();
  const hosts = [...new Set(snaps.map((s) => s.host))];
  for (const host of hosts) {
    for (const d of droppingPagesForHost(host, 50)) {
      dropByUrl.set(d.url, { clickDelta: d.clickDelta, impressionDelta: d.impressionDelta });
    }
  }
  return snaps.map((s) => {
    const drop = dropByUrl.get(s.url);
    return {
      host: s.host,
      url: s.url,
      statusCode: s.statusCode,
      title: s.title,
      issues: s.issues as OnPageIssue[],
      clickDelta: drop?.clickDelta,
      impressionDelta: drop?.impressionDelta,
    };
  });
}

export function generateRecommendations(options?: {
  includeHidden?: boolean;
  limit?: number;
  /** UI or digest locale for card copy (separate from uiLocale persistence). */
  locale?: "en" | "zh";
}): Recommendation[] {
  const state = loadState();
  const raw = runRules(
    {
      movers: buildMovers(),
      sites: buildSites(),
      connectedEngines: connectedEngines(),
      onPage: buildOnPageAudits(),
      locale: options?.locale === "zh" ? "zh" : "en",
    },
    options?.limit ?? 50
  );
  // Attach Yandex SQI / searchable counts as evidence when present.
  const metaByHost = new Map<string, Record<string, unknown>>();
  for (const host of [...new Set(raw.map((r) => r.host))]) {
    const y = hostEngineMetaForHost(host).find((m) => m.engine === "yandex");
    if (y?.meta) metaByHost.set(host, y.meta);
  }
  const zh = options?.locale === "zh";
  const sqiLabel = zh ? "Yandex SQI" : "Yandex SQI";
  const searchableLabel = zh ? "Yandex 可搜索页" : "Yandex searchable";
  for (const rec of raw) {
    const meta = metaByHost.get(rec.host);
    if (!meta) continue;
    if (meta.sqi != null && !rec.evidence.some((e) => e.label === sqiLabel || e.label === "Yandex SQI")) {
      rec.evidence.push({ label: sqiLabel, value: String(meta.sqi) });
    }
    if (
      meta.searchablePages != null &&
      !rec.evidence.some((e) => e.label === searchableLabel || e.label === "Yandex searchable")
    ) {
      rec.evidence.push({ label: searchableLabel, value: String(meta.searchablePages) });
    }
  }
  if (options?.includeHidden) return raw;
  return raw.filter((r) => !isHidden(r.id, state));
}

export function snoozeRecommendation(id: string, days = 7) {
  const state = loadState();
  const until = new Date();
  until.setUTCDate(until.getUTCDate() + days);
  state.items[id] = {
    status: "snoozed",
    until: until.toISOString(),
    at: new Date().toISOString(),
  };
  saveState(state);
  return state.items[id];
}

export function markRecommendationDone(id: string) {
  const state = loadState();
  state.items[id] = { status: "done", at: new Date().toISOString() };
  saveState(state);
  return state.items[id];
}

export function clearRecommendationState(id: string) {
  const state = loadState();
  delete state.items[id];
  saveState(state);
}

export function exportRecommendationsCsv(): string {
  return recommendationsToCsv(generateRecommendations({ limit: 100 }));
}

export function getRecommendationState(): RecommendationState {
  return loadState();
}
