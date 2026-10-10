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

export async function GET() {
  try {
    const sites = await listGscSites(auth());
    return NextResponse.json({ sites });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}
