import { NextResponse } from "next/server";
import { listBingSubmitLog, submitUrlToBing } from "@/server/bing-submit";
import { getSettings } from "@/server/settings";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    enabled: getSettings().bingUrlSubmitEnabled,
    log: listBingSubmitLog(20),
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      host?: string;
      url?: string;
      confirmToken?: string;
    };
    if (!body.host?.trim() || !body.url?.trim()) {
      return NextResponse.json({ error: "host and url required" }, { status: 400 });
    }
    const result = await submitUrlToBing({
      host: body.host.trim(),
      url: body.url.trim(),
      confirmToken: body.confirmToken || "",
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}
