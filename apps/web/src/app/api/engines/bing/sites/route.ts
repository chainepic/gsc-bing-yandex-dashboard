import { NextResponse } from "next/server";
import { listBingSites } from "@search-triad/connectors";
import { loadSecrets } from "@/server/secrets";

export const runtime = "nodejs";

export async function GET() {
  try {
    const key = loadSecrets().bing?.apiKey;
    if (!key) throw new Error("Bing API key missing");
    const sites = await listBingSites(key);
    return NextResponse.json({ sites });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}
