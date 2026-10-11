import { NextResponse } from "next/server";
import { listSitemapsForHost } from "@/server/inspection";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const host = new URL(req.url).searchParams.get("host")?.trim();
  if (!host) {
    return NextResponse.json({ error: "host query required" }, { status: 400 });
  }
  try {
    const data = await listSitemapsForHost(host);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
