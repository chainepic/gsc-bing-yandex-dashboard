import {
  inspectBingUrl,
  inspectGscUrl,
  inspectYandexUrl,
  listBingSitemaps,
  listGscSitemaps,
  listYandexSitemaps,
  type EngineId,
  type GscAuth,
  type SitemapEntry,
  type UrlInspectionResult,
} from "@search-triad/connectors";
import { eq } from "drizzle-orm";
import { getDb } from "./db/client";
import { sites } from "./db/schema";
import { loadSecrets } from "./secrets";
import { ensureYandexAccessToken } from "./yandex-auth";

function gscAuthFromSecrets(): GscAuth | null {
  const s = loadSecrets().google;
  if (!s) return null;
  if (s.mode === "service_account" && s.serviceAccountJson) {
    return { kind: "service_account", json: s.serviceAccountJson };
  }
  if (s.clientId && s.clientSecret && s.refreshToken) {
    return { kind: "oauth", clientId: s.clientId, clientSecret: s.clientSecret, refreshToken: s.refreshToken };
  }
  return null;
}

export function sitesForHost(host: string) {
  return getDb().select().from(sites).where(eq(sites.host, host)).all();
}

export async function listSitemapsForHost(host: string): Promise<{
  host: string;
  entries: SitemapEntry[];
  errors: Array<{ engine: EngineId; message: string }>;
}> {
  const matched = sitesForHost(host).filter((s) => s.enabled);
  const entries: SitemapEntry[] = [];
  const errors: Array<{ engine: EngineId; message: string }> = [];
  const secrets = loadSecrets();

  for (const site of matched) {
    const engine = site.engine as EngineId;
    try {
      if (engine === "gsc") {
        const auth = gscAuthFromSecrets();
        if (!auth) throw new Error("Google credentials missing");
        entries.push(...(await listGscSitemaps(auth, site.propertyId)));
      } else if (engine === "bing") {
        if (!secrets.bing?.apiKey) throw new Error("Bing API key missing");
        entries.push(...(await listBingSitemaps(secrets.bing.apiKey, site.propertyId)));
      } else if (engine === "yandex") {
        const token = await ensureYandexAccessToken();
        entries.push(...(await listYandexSitemaps(token, site.propertyId)));
      }
    } catch (err) {
      errors.push({
        engine,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { host, entries, errors };
}

export async function inspectUrlForHost(
  host: string,
  url: string,
  engines?: EngineId[]
): Promise<{
  host: string;
  url: string;
  results: UrlInspectionResult[];
}> {
  const matched = sitesForHost(host).filter((s) => s.enabled);
  const want = engines?.length ? new Set(engines) : null;
  const secrets = loadSecrets();
  const results: UrlInspectionResult[] = [];

  for (const site of matched) {
    const engine = site.engine as EngineId;
    if (want && !want.has(engine)) continue;
    if (engine === "gsc") {
      const auth = gscAuthFromSecrets();
      if (!auth) {
        results.push({
          engine,
          url,
          siteUrl: site.propertyId,
          ok: false,
          verdict: "Error",
          details: [],
          error: "Google credentials missing",
        });
        continue;
      }
      results.push(await inspectGscUrl(auth, site.propertyId, url));
    } else if (engine === "bing") {
      if (!secrets.bing?.apiKey) {
        results.push({
          engine,
          url,
          siteUrl: site.propertyId,
          ok: false,
          verdict: "Error",
          details: [],
          error: "Bing API key missing",
        });
        continue;
      }
      results.push(await inspectBingUrl(secrets.bing.apiKey, site.propertyId, url));
    } else if (engine === "yandex") {
      try {
        const token = await ensureYandexAccessToken();
        results.push(await inspectYandexUrl(token, site.propertyId, url));
      } catch (err) {
        results.push({
          engine,
          url,
          siteUrl: site.propertyId,
          ok: false,
          verdict: "Error",
          details: [],
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  if (!results.length) {
    results.push({
      engine: "gsc",
      url,
      siteUrl: host,
      ok: false,
      verdict: "Error",
      details: [],
      error: `No enabled engine bindings for host ${host}`,
    });
  }

  return { host, url, results };
}
