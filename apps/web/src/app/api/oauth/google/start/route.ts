import { NextResponse } from "next/server";
import { buildGscAuthUrl } from "@search-triad/connectors";
import { loadSecrets } from "@/server/secrets";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const secrets = loadSecrets();
    const clientId = secrets.google?.clientId;
    if (!clientId) throw new Error("Save Google OAuth client ID first");
    const origin = new URL(req.url).origin;
    const redirectUri = `${origin}/api/oauth/google/callback`;
    const url = buildGscAuthUrl(clientId, redirectUri);
    return NextResponse.json({ url, redirectUri });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}
