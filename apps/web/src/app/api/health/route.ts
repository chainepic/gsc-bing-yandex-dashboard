import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Unauthenticated liveness probe for Docker / k8s. */
export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      status: "ok",
      service: "search-triad",
    },
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}
