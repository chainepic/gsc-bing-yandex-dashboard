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
      digestIncludeRecommendations:
        body.digestIncludeRecommendations === undefined
          ? undefined
          : Boolean(body.digestIncludeRecommendations),
      crawlMaxUrlsPerHost:
        body.crawlMaxUrlsPerHost === undefined ? undefined : Number(body.crawlMaxUrlsPerHost),
      crawlConcurrency:
        body.crawlConcurrency === undefined ? undefined : Number(body.crawlConcurrency),
      bingUrlSubmitEnabled:
        body.bingUrlSubmitEnabled === undefined ? undefined : Boolean(body.bingUrlSubmitEnabled),
      historyDays: body.historyDays === undefined ? undefined : Number(body.historyDays),
      uiLocale: body.uiLocale === "zh" || body.uiLocale === "en" ? body.uiLocale : undefined,
      digestLocale: body.digestLocale === "zh" || body.digestLocale === "en" ? body.digestLocale : undefined,
      digestSections: body.digestSections,
      llmPolishEnabled: false,
      llmBaseUrl: typeof body.llmBaseUrl === "string" ? body.llmBaseUrl : undefined,
      llmModel: typeof body.llmModel === "string" ? body.llmModel : undefined,
      reportAiEnabled:
        body.reportAiEnabled === undefined ? undefined : Boolean(body.reportAiEnabled),
      reportAiBaseUrl: typeof body.reportAiBaseUrl === "string" ? body.reportAiBaseUrl : undefined,
      reportAiModel: typeof body.reportAiModel === "string" ? body.reportAiModel : undefined,
    });
    scheduleFromSettings();
    return NextResponse.json(next);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}
