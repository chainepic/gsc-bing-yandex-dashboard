import { NextResponse } from "next/server";
import { seedDemoData } from "@/server/demo-seed";

export const runtime = "nodejs";

export async function POST() {
  if (process.env.ALLOW_DEMO_SEED !== "1") {
    return NextResponse.json(
      { error: "Set ALLOW_DEMO_SEED=1 to load fictional example.com fixtures" },
      { status: 403 }
    );
  }
  try {
    const result = seedDemoData();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
