import { NextResponse } from "next/server";
import { listSites, setSiteEnabled, upsertSites } from "@/server/queries";
import type { EngineId } from "@search-triad/connectors";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ sites: listSites() });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rows = (body.sites || []) as Array<{
      engine: EngineId;
      host: string;
      propertyId: string;
      enabled?: boolean;
      label?: string;
    }>;
    upsertSites(rows);
    return NextResponse.json({ sites: listSites() });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    setSiteEnabled(Number(body.id), Boolean(body.enabled));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}
