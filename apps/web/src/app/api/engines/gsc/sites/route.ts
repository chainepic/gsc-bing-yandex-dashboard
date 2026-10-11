import { NextResponse } from "next/server";
import { listGscSites, type GscAuth } from "@search-triad/connectors";
import { loadSecrets } from "@/server/secrets";

export const runtime = "nodejs";

function auth(): GscAuth {
  const s = loadSecrets().google;
  if (!s) throw new Error("Google credentials missing");
  if (s.mode === "service_account" && s.serviceAccountJson) {
    return { kind: "service_account", json: s.serviceAccountJson };
  }
  if (s.clientId && s.clientSecret && s.refreshToken) {
    return { kind: "oauth", clientId: s.clientId, clientSecret: s.clientSecret, refreshToken: s.refreshToken };
  }
  throw new Error("Google not connected");
}

function humanizeGscError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const disabled =
    /Search Console API has not been used/i.test(msg) ||
    (/it is disabled/i.test(msg) && /searchconsole/i.test(msg));
  if (!disabled) return msg;
  const project = msg.match(/project[= ](\d+)/i)?.[1];
  const link = project
    ? `https://console.developers.google.com/apis/api/searchconsole.googleapis.com/overview?project=${project}`
    : "https://console.cloud.google.com/apis/library/searchconsole.googleapis.com";
  return `GSC_API_DISABLED: Enable Google Search Console API first — ${link}`;
}

export async function GET() {
  try {
    const sites = await listGscSites(auth());
    return NextResponse.json({ sites });
  } catch (err) {
    return NextResponse.json({ error: humanizeGscError(err) }, { status: 400 });
  }
}
