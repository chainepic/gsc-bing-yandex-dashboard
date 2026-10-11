import {
  buildExportInventory,
  defaultDateRange,
  parseExportFormat,
  parseExportInclude,
  parseIsoDate,
  serializeExportSlice,
  type ExportSlicePayload,
  type ExportSliceSpec,
} from "@search-triad/core";
import { and, desc, gte, inArray, lte } from "drizzle-orm";
import { getDb } from "./db/client";
import { digests, keywordSnapshot, metricDaily, pageSnapshots, sites } from "./db/schema";
import { generateRecommendations } from "./recommendations";
import { getSettings } from "./settings";

export function parseExportSliceSpec(body: Record<string, unknown>): ExportSliceSpec {
  const settings = getSettings();
  const fallback = defaultDateRange(settings.historyDays);
  const dateFrom = parseIsoDate(body.dateFrom) || fallback.dateFrom;
  const dateTo = parseIsoDate(body.dateTo) || fallback.dateTo;
  if (dateFrom > dateTo) {
    throw new Error("dateFrom must be ≤ dateTo");
  }
  let hosts: string[] | undefined;
  if (Array.isArray(body.hosts)) {
    hosts = body.hosts.map((h) => String(h).trim().toLowerCase()).filter(Boolean);
    if (!hosts.length) hosts = undefined;
  } else if (typeof body.hosts === "string" && body.hosts.trim()) {
    hosts = body.hosts
      .split(/[\s,]+/)
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean);
  }
  return {
    hosts,
    dateFrom,
    dateTo,
    include: parseExportInclude(body.include),
    format: parseExportFormat(body.format),
  };
}

export function buildExportSlice(spec: ExportSliceSpec): ExportSlicePayload {
  const db = getDb();
  const hostFilter = spec.hosts?.length ? new Set(spec.hosts) : null;

  const allowedHosts = new Set(
    db
      .select({ host: sites.host })
      .from(sites)
      .all()
      .map((r) => r.host.toLowerCase())
      .filter((h) => !hostFilter || hostFilter.has(h))
  );

  const counts: Record<string, number> = {};
  const slice: ExportSlicePayload = {
    meta: {
      generatedAt: new Date().toISOString(),
      dateFrom: spec.dateFrom,
      dateTo: spec.dateTo,
      hosts: hostFilter ? [...hostFilter] : "all",
      include: spec.include,
      inventory: [],
    },
  };

  if (spec.include.metricsDaily) {
    const rows = db
      .select({
        engine: metricDaily.engine,
        host: metricDaily.host,
        date: metricDaily.date,
        clicks: metricDaily.clicks,
        impressions: metricDaily.impressions,
        ctr: metricDaily.ctr,
        position: metricDaily.position,
      })
      .from(metricDaily)
      .where(and(gte(metricDaily.date, spec.dateFrom), lte(metricDaily.date, spec.dateTo)))
      .orderBy(metricDaily.date)
      .all()
      .filter((r) => allowedHosts.has(r.host.toLowerCase()));
    slice.metricsDaily = rows;
    counts.metricsDaily = rows.length;
  }

  if (spec.include.movers) {
    const rows = db
      .select()
      .from(keywordSnapshot)
      .where(and(gte(keywordSnapshot.asOf, spec.dateFrom), lte(keywordSnapshot.asOf, spec.dateTo)))
      .orderBy(desc(keywordSnapshot.asOf))
      .limit(5000)
      .all()
      .filter((r) => allowedHosts.has(r.host.toLowerCase()))
      .map((r) => ({
        engine: r.engine,
        host: r.host,
        asOf: r.asOf,
        kind: r.kind,
        query: r.query,
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: r.ctr,
        position: r.position,
        clickDelta: r.clickDelta,
        impressionDelta: r.impressionDelta,
        window: r.window,
      }));
    slice.movers = rows;
    counts.movers = rows.length;
  }

  if (spec.include.recommendations) {
    const recs = generateRecommendations({ limit: 100 }).filter(
      (r) => !hostFilter || hostFilter.has(r.host.toLowerCase())
    );
    slice.recommendations = recs.map((r) => ({
      id: r.id,
      title: r.title,
      summary: r.summary,
      severity: r.severity,
      host: r.host,
      score: r.score,
    }));
    counts.recommendations = slice.recommendations.length;
  }

  if (spec.include.digests) {
    const rows = db.select().from(digests).orderBy(desc(digests.id)).limit(20).all();
    slice.digests = rows.map((d) => ({
      id: d.id,
      generatedOn: d.generatedOn,
      markdown: d.markdown,
    }));
    counts.digests = slice.digests.length;
  }

  if (spec.include.pageSnapshots) {
    const q = hostFilter
      ? db
          .select({
            host: pageSnapshots.host,
            url: pageSnapshots.url,
            fetchedAt: pageSnapshots.fetchedAt,
            statusCode: pageSnapshots.statusCode,
            title: pageSnapshots.title,
            h1: pageSnapshots.h1,
            issuesJson: pageSnapshots.issuesJson,
          })
          .from(pageSnapshots)
          .where(inArray(pageSnapshots.host, [...hostFilter]))
          .orderBy(desc(pageSnapshots.fetchedAt))
          .limit(500)
      : db
          .select({
            host: pageSnapshots.host,
            url: pageSnapshots.url,
            fetchedAt: pageSnapshots.fetchedAt,
            statusCode: pageSnapshots.statusCode,
            title: pageSnapshots.title,
            h1: pageSnapshots.h1,
            issuesJson: pageSnapshots.issuesJson,
          })
          .from(pageSnapshots)
          .orderBy(desc(pageSnapshots.fetchedAt))
          .limit(500);
    slice.pageSnapshots = q.all();
    counts.pageSnapshots = slice.pageSnapshots.length;
  }

  slice.meta.inventory = buildExportInventory(spec, counts);
  return slice;
}

export function exportSliceResponse(spec: ExportSliceSpec) {
  const slice = buildExportSlice(spec);
  return { slice, ...serializeExportSlice(slice, spec.format) };
}
