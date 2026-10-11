import { NextResponse } from "next/server";
import {
  crawlDroppingPages,
  crawlUrls,
  droppingPagesForHost,
  fetchOnPage,
  listSnapshotsForHost,
} from "@/server/crawl";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const host = new URL(req.url).searchParams.get("host")?.trim();
  if (!host) {
    return NextResponse.json({ error: "host query required" }, { status: 400 });
  }
  return NextResponse.json({
    host,
    candidates: droppingPagesForHost(host),
    snapshots: listSnapshotsForHost(host),
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      host?: string;
      mode?: "dropping" | "urls" | "one";
      urls?: string[];
      url?: string;
    };
    const mode = body.mode || (body.url ? "one" : "dropping");
    if (mode === "one") {
      if (!body.url?.trim()) {
        return NextResponse.json({ error: "url required" }, { status: 400 });
      }
      const result = await fetchOnPage(body.url.trim());
      return NextResponse.json({ result });
    }
    if (mode === "urls") {
      const urls = (body.urls || []).map((u) => u.trim()).filter(Boolean);
      if (!urls.length) {
        return NextResponse.json({ error: "urls required" }, { status: 400 });
      }
      const data = await crawlUrls(urls);
      return NextResponse.json(data);
    }
    if (!body.host?.trim()) {
      return NextResponse.json({ error: "host required for dropping mode" }, { status: 400 });
    }
    const data = await crawlDroppingPages(body.host.trim());
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
