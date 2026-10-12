import { NextResponse } from "next/server";
import {
  deleteReportAiReport,
  getReportAiReport,
  listReportAiReports,
  reportAiStatus,
  runReportAiInterpret,
  testReportAiConnection,
} from "@/server/report-ai";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("list") === "1") {
    const limit = Number(url.searchParams.get("limit") || 30);
    return NextResponse.json({
      ...reportAiStatus(),
      reports: listReportAiReports(Number.isFinite(limit) ? limit : 30),
    });
  }
  const idRaw = url.searchParams.get("id");
  if (idRaw) {
    const id = Number(idRaw);
    const row = Number.isFinite(id) ? getReportAiReport(id) : null;
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(row);
  }
  return NextResponse.json(reportAiStatus());
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    if (body.action === "test") {
      const result = await testReportAiConnection({
        baseUrl: typeof body.baseUrl === "string" ? body.baseUrl : undefined,
        model: typeof body.model === "string" ? body.model : undefined,
        apiKey: typeof body.apiKey === "string" ? body.apiKey : undefined,
      });
      return NextResponse.json(result);
    }
    if (body.action === "delete") {
      const id = typeof body.id === "number" ? body.id : Number(body.id);
      if (!Number.isFinite(id)) throw new Error("id required");
      deleteReportAiReport(id);
      return NextResponse.json({ ok: true, reports: listReportAiReports(30) });
    }
    const { result, inventory, savedId } = await runReportAiInterpret(body);
    return NextResponse.json({
      markdown: result.markdown,
      model: result.model,
      providerId: result.providerId,
      usage: result.usage,
      inventory,
      savedId,
      saveReports: reportAiStatus().saveReports,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}
