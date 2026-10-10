import { NextResponse } from "next/server";
import { listYandexHosts } from "@search-triad/connectors";
import { ensureYandexAccessToken } from "@/server/yandex-auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    const token = await ensureYandexAccessToken();
    const sites = await listYandexHosts(token);
    return NextResponse.json({ sites });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}
