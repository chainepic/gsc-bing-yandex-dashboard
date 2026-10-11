import {
  auditOnPage,
  parseHtmlOnPage,
  type OnPageIssue,
  type OnPageSnapshot,
} from "@search-triad/core";
import { normalizeHost } from "@search-triad/connectors";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "./db/client";
import { keywordSnapshot, pageSnapshots, sites } from "./db/schema";
import { getSettings } from "./settings";

const MAX_HTML_BYTES = 1_500_000;
const FETCH_TIMEOUT_MS = 12_000;

function allowedHosts(): Set<string> {
  const set = new Set<string>();
  for (const s of getDb().select().from(sites).all()) {
    if (!s.enabled) continue;
    set.add(normalizeHost(s.host));
  }
  return set;
}

function assertOwnUrl(url: string): { host: string; href: string } {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid URL");
  }
  if (!/^https?:$/.test(parsed.protocol)) {
    throw new Error("Only http(s) URLs are allowed");
  }
  // Block obvious SSRF targets
  const hostname = parsed.hostname.toLowerCase();
  const isPrivate172 = /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname);
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "0.0.0.0" ||
    hostname.startsWith("127.") ||
    hostname.startsWith("10.") ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("169.254.") ||
    isPrivate172 ||
    hostname === "[::1]"
  ) {
    throw new Error("Local/private addresses are not crawlable");
  }
  const host = normalizeHost(hostname);
  if (!allowedHosts().has(host)) {
    throw new Error(`Host ${host} is not an enabled monitored site — crawl own URLs only`);
  }
  return { host, href: parsed.toString() };
}

async function mapPool<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  let i = 0;
  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx]!);
    }
  });
  await Promise.all(workers);
  return results;
}

export async function fetchOnPage(url: string): Promise<OnPageSnapshot & { issues: OnPageIssue[] }> {
  const { host, href } = assertOwnUrl(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(href, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "SearchTriadOnPageBot/0.3 (+self-hosted; own-URL audit only)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    const buf = Buffer.from(await res.arrayBuffer());
    const slice = buf.subarray(0, MAX_HTML_BYTES);
    const contentType = res.headers.get("content-type") || "";
    let html = "";
    if (/html|xml|text\/plain/i.test(contentType) || !contentType) {
      html = slice.toString("utf8");
    }
    const snap = parseHtmlOnPage(href, html, res.status);
    snap.finalUrl = res.url || href;
    const issues = auditOnPage(snap);
    persistSnapshot(host, snap, issues);
    return { ...snap, issues };
  } catch (err) {
    const snap: OnPageSnapshot = {
      url: href,
      fetchedAt: new Date().toISOString(),
      statusCode: null,
      title: null,
      metaDescription: null,
      h1: null,
      canonical: null,
      robotsMeta: null,
      contentLength: 0,
      error: err instanceof Error ? err.message : String(err),
    };
    const issues = auditOnPage(snap);
    persistSnapshot(host, snap, issues);
    return { ...snap, issues };
  } finally {
    clearTimeout(timer);
  }
}

function persistSnapshot(host: string, snap: OnPageSnapshot, issues: OnPageIssue[]) {
  const db = getDb();
  db.insert(pageSnapshots)
    .values({
      host,
      url: snap.url,
      fetchedAt: snap.fetchedAt,
      statusCode: snap.statusCode,
      finalUrl: snap.finalUrl || null,
      title: snap.title,
      metaDescription: snap.metaDescription,
      h1: snap.h1,
      canonical: snap.canonical,
      robotsMeta: snap.robotsMeta,
      contentLength: snap.contentLength,
      issuesJson: JSON.stringify(issues),
      error: snap.error || null,
    })
    .onConflictDoUpdate({
      target: [pageSnapshots.url],
      set: {
        host,
        fetchedAt: snap.fetchedAt,
        statusCode: snap.statusCode,
        finalUrl: snap.finalUrl || null,
        title: snap.title,
        metaDescription: snap.metaDescription,
        h1: snap.h1,
        canonical: snap.canonical,
        robotsMeta: snap.robotsMeta,
        contentLength: snap.contentLength,
        issuesJson: JSON.stringify(issues),
        error: snap.error || null,
      },
    })
    .run();
}

export function listSnapshotsForHost(host: string, limit = 40) {
  return getDb()
    .select()
    .from(pageSnapshots)
    .where(eq(pageSnapshots.host, normalizeHost(host)))
    .orderBy(desc(pageSnapshots.fetchedAt))
    .limit(limit)
    .all()
    .map((row) => ({
      ...row,
      issues: safeIssues(row.issuesJson),
    }));
}

function safeIssues(raw: string): OnPageIssue[] {
  try {
    const parsed = JSON.parse(raw) as OnPageIssue[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Page movers with click drop for a host (candidates for on-page audit). */
export function droppingPagesForHost(host: string, limit?: number) {
  const settings = getSettings();
  const max = limit ?? settings.crawlMaxUrlsPerHost;
  const rows = getDb()
    .select()
    .from(keywordSnapshot)
    .where(and(eq(keywordSnapshot.host, normalizeHost(host)), eq(keywordSnapshot.kind, "page")))
    .all()
    .filter((r) => r.clickDelta < 0 || r.impressionDelta <= -500)
    .sort((a, b) => a.clickDelta - b.clickDelta || a.impressionDelta - b.impressionDelta);
  const seen = new Set<string>();
  const out: Array<{
    url: string;
    clickDelta: number;
    impressionDelta: number;
    clicks: number;
    impressions: number;
    engine: string;
  }> = [];
  for (const r of rows) {
    if (!/^https?:\/\//i.test(r.query)) continue;
    if (seen.has(r.query)) continue;
    seen.add(r.query);
    out.push({
      url: r.query,
      clickDelta: r.clickDelta,
      impressionDelta: r.impressionDelta,
      clicks: r.clicks,
      impressions: r.impressions,
      engine: r.engine,
    });
    if (out.length >= max) break;
  }
  return out;
}

export async function crawlDroppingPages(host: string) {
  const settings = getSettings();
  const candidates = droppingPagesForHost(host, settings.crawlMaxUrlsPerHost);
  const results = await mapPool(candidates, settings.crawlConcurrency, async (c) => {
    const snap = await fetchOnPage(c.url);
    return { ...snap, dropping: c };
  });
  return {
    host: normalizeHost(host),
    crawled: results.length,
    limit: settings.crawlMaxUrlsPerHost,
    concurrency: settings.crawlConcurrency,
    results,
  };
}

export async function crawlUrls(urls: string[]) {
  const settings = getSettings();
  const limited = urls.slice(0, settings.crawlMaxUrlsPerHost);
  const results = await mapPool(limited, settings.crawlConcurrency, (url) => fetchOnPage(url));
  return {
    crawled: results.length,
    limit: settings.crawlMaxUrlsPerHost,
    concurrency: settings.crawlConcurrency,
    results,
  };
}

export function listAllSnapshotsWithIssues(limit = 100) {
  return getDb()
    .select()
    .from(pageSnapshots)
    .orderBy(desc(pageSnapshots.fetchedAt))
    .limit(limit)
    .all()
    .map((row) => ({
      host: row.host,
      url: row.url,
      fetchedAt: row.fetchedAt,
      statusCode: row.statusCode,
      title: row.title,
      issues: safeIssues(row.issuesJson),
      error: row.error,
    }))
    .filter((r) => r.issues.length > 0 || r.error);
}
