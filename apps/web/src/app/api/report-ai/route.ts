import { NextResponse } from "next/server";
import { reportAiStatus, runReportAiInterpret } from "@/server/report-ai";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(reportAiStatus());
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const { result, inventory } = await runReportAiInterpret(body);
    return NextResponse.json({
      markdown: result.markdown,
      model: result.model,
      providerId: result.providerId,
      usage: result.usage,
      inventory,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}
