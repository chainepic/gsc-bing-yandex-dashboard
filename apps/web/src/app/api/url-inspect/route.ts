import type { EngineId } from "@search-triad/connectors";
import { NextResponse } from "next/server";
import { inspectUrlForHost } from "@/server/inspection";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      host?: string;
      url?: string;
      engines?: EngineId[];
    };
    const host = body.host?.trim();
    const url = body.url?.trim();
    if (!host || !url) {
      return NextResponse.json({ error: "host and url required" }, { status: 400 });
    }
    try {
      // Basic URL sanity — must be absolute http(s)
      const parsed = new URL(url);
      if (!/^https?:$/.test(parsed.protocol)) {
        return NextResponse.json({ error: "url must be http(s)" }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: "invalid url" }, { status: 400 });
    }
    const data = await inspectUrlForHost(host, url, body.engines);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
