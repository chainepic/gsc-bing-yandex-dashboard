import { NextResponse } from "next/server";
import { listWatchlist, removeWatchlist, upsertWatchlist } from "@/server/watchlist";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ items: listWatchlist() });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { host?: string; watched?: boolean; note?: string };
    if (!body.host?.trim()) {
      return NextResponse.json({ error: "host required" }, { status: 400 });
    }
    const row = upsertWatchlist({
      host: body.host.trim(),
      watched: body.watched,
      note: body.note,
    });
    return NextResponse.json({ item: row });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const host = new URL(req.url).searchParams.get("host")?.trim();
  if (!host) return NextResponse.json({ error: "host required" }, { status: 400 });
  removeWatchlist(host);
  return NextResponse.json({ ok: true });
}
