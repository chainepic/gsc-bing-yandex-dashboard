import { NextResponse } from "next/server";
import { listYandexHosts } from "@search-triad/connectors";
import { loadSecrets } from "@/server/secrets";

export const runtime = "nodejs";

export async function GET() {
  try {
    const token = loadSecrets().yandex?.accessToken;
    if (!token) throw new Error("Yandex access token missing");
    const sites = await listYandexHosts(token);
    return NextResponse.json({ sites });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}
