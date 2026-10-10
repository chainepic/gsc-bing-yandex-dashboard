import { NextResponse } from "next/server";
import { buildYandexAuthUrl } from "@search-triad/connectors";
import { loadSecrets } from "@/server/secrets";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const secrets = loadSecrets();
    const clientId = secrets.yandex?.clientId;
    if (!clientId) throw new Error("Save Yandex client ID first");
    const origin = new URL(req.url).origin;
    const redirectUri = `${origin}/api/oauth/yandex/callback`;
    const url = buildYandexAuthUrl(clientId, redirectUri);
    return NextResponse.json({ url, redirectUri });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}
