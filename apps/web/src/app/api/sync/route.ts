import { NextResponse } from "next/server";
import { runSync } from "@/server/sync";

export const runtime = "nodejs";

export async function POST() {
  try {
    const result = await runSync();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
