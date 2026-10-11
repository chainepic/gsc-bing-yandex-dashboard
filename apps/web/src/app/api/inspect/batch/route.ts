import type { EngineId } from "@search-triad/connectors";
import { normalizeHost } from "@search-triad/connectors";
import { NextResponse } from "next/server";
import { inspectUrlForHost } from "@/server/inspection";
import { listSites } from "@/server/queries";

export const runtime = "nodejs";

/** Read-only multi-URL inspection queue (capped). */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { urls?: string[]; engines?: EngineId[] };
    const urls = [...new Set((body.urls || []).map((u) => u.trim()).filter(Boolean))].slice(0, 20);
    if (!urls.length) {
      return NextResponse.json({ error: "urls required (max 20)" }, { status: 400 });
    }
    const sites = listSites().filter((s) => s.enabled);
    const hostSet = new Set(sites.map((s) => s.host));
    const results: Array<{
      url: string;
      host: string | null;
      ok: boolean;
      error?: string;
      results?: Awaited<ReturnType<typeof inspectUrlForHost>>["results"];
    }> = [];

    for (const url of urls) {
      try {
        const parsed = new URL(url);
        if (!/^https?:$/.test(parsed.protocol)) {
          results.push({ url, host: null, ok: false, error: "url must be http(s)" });
          continue;
        }
        const host = normalizeHost(parsed.hostname);
        if (!hostSet.has(host)) {
          results.push({
            url,
            host,
            ok: false,
            error: "URL host is not an enabled monitored site",
          });
          continue;
        }
        const data = await inspectUrlForHost(host, url, body.engines);
        results.push({ url, host, ok: true, results: data.results });
      } catch (err) {
        results.push({
          url,
          host: null,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return NextResponse.json({ count: results.length, results });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
