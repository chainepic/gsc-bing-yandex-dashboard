import { NextResponse } from "next/server";
import { getSettings, setSettings } from "@/server/settings";
import { scheduleFromSettings } from "@/server/cron";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(getSettings());
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const next = setSettings({
      timeZone: body.timeZone,
      digestHour: body.digestHour,
      digestMinute: body.digestMinute,
      setupComplete: body.setupComplete,
    });
    scheduleFromSettings();
    return NextResponse.json(next);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}
