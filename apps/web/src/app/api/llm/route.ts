import { NextResponse } from "next/server";
import { polishRecommendations, probeLlm } from "@/server/llm";
import { generateRecommendations } from "@/server/recommendations";
import { getSettings } from "@/server/settings";

export const runtime = "nodejs";

export async function GET() {
  const settings = getSettings();
  if (!settings.llmPolishEnabled) {
    return NextResponse.json({
      enabled: false,
      message: "Local LLM polish is off (default). Enable in Settings — never required for rules.",
    });
  }
  const probe = await probeLlm();
  return NextResponse.json({
    enabled: true,
    baseUrl: settings.llmBaseUrl,
    model: settings.llmModel,
    probe,
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { limit?: number; ids?: string[] };
    let recs = generateRecommendations({ limit: 40 });
    if (body.ids?.length) {
      const want = new Set(body.ids);
      recs = recs.filter((r) => want.has(r.id));
    }
    const polished = await polishRecommendations(recs, { limit: body.limit ?? 8 });
    return NextResponse.json({ polished, count: polished.length });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}
