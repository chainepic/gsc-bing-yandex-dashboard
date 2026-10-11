import { NextResponse } from "next/server";
import { resetDemoData } from "@/server/demo-seed";

export const runtime = "nodejs";

export async function POST() {
  if (process.env.ALLOW_DEMO_SEED !== "1") {
    return NextResponse.json(
      { error: "Set ALLOW_DEMO_SEED=1 to reset demo fixtures" },
      { status: 403 }
    );
  }
  try {
    const result = resetDemoData();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
