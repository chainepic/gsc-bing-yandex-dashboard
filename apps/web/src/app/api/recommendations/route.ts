import { NextResponse } from "next/server";
import {
  clearRecommendationState,
  exportRecommendationsCsv,
  generateRecommendations,
  markRecommendationDone,
  snoozeRecommendation,
} from "@/server/recommendations";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const format = url.searchParams.get("format");
  if (format === "csv") {
    const csv = exportRecommendationsCsv();
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="search-triad-recommendations.csv"',
      },
    });
  }
  const recs = generateRecommendations({ limit: 50 });
  return NextResponse.json({ recommendations: recs, count: recs.length });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      id?: string;
      action?: "snooze" | "done" | "clear";
      days?: number;
    };
    if (!body.id || !body.action) {
      return NextResponse.json({ error: "id and action required" }, { status: 400 });
    }
    if (body.action === "snooze") {
      return NextResponse.json({ ok: true, state: snoozeRecommendation(body.id, body.days ?? 7) });
    }
    if (body.action === "done") {
      return NextResponse.json({ ok: true, state: markRecommendationDone(body.id) });
    }
    if (body.action === "clear") {
      clearRecommendationState(body.id);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
