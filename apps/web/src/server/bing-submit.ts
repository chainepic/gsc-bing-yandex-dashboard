import { normalizeHost, submitBingUrl } from "@search-triad/connectors";
import { desc, eq } from "drizzle-orm";
import { getDb } from "./db/client";
import { auditLog, sites } from "./db/schema";
import { loadSecrets } from "./secrets";
import { getSettings } from "./settings";

export function listBingSubmitLog(limit = 30) {
  return getDb()
    .select()
    .from(auditLog)
    .where(eq(auditLog.action, "bing_url_submit"))
    .orderBy(desc(auditLog.id))
    .limit(limit)
    .all();
}

/**
 * Opt-in Bing URL submit. Requires settings.bingUrlSubmitEnabled and confirmToken === "SUBMIT".
 */
export async function submitUrlToBing(options: {
  host: string;
  url: string;
  confirmToken: string;
}) {
  const settings = getSettings();
  if (!settings.bingUrlSubmitEnabled) {
    throw new Error("Bing URL submit is disabled. Enable it in Settings (default off).");
  }
  if (options.confirmToken !== "SUBMIT") {
    throw new Error('Confirmation required: set confirmToken to "SUBMIT"');
  }

  let parsed: URL;
  try {
    parsed = new URL(options.url);
  } catch {
    throw new Error("Invalid URL");
  }
  if (!/^https?:$/.test(parsed.protocol)) throw new Error("url must be http(s)");

  const host = normalizeHost(options.host);
  if (normalizeHost(parsed.hostname) !== host) {
    throw new Error("URL host must match the selected site host");
  }

  const site = getDb()
    .select()
    .from(sites)
    .all()
    .find((s) => s.enabled && s.engine === "bing" && s.host === host);
  if (!site) throw new Error(`No enabled Bing binding for ${host}`);

  const apiKey = loadSecrets().bing?.apiKey;
  if (!apiKey) throw new Error("Bing API key missing");

  const result = await submitBingUrl(apiKey, site.propertyId, parsed.toString());
  getDb()
    .insert(auditLog)
    .values({
      createdAt: new Date().toISOString(),
      action: "bing_url_submit",
      host,
      detailJson: JSON.stringify({
        url: parsed.toString(),
        siteUrl: site.propertyId,
        result: result.raw,
      }),
    })
    .run();

  return { ok: true as const, host, url: parsed.toString(), siteUrl: site.propertyId };
}
