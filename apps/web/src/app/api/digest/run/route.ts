import { NextResponse } from "next/server";
import { runDigestJob } from "@/server/digest-job";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await runDigestJob({
      syncFirst: body.syncFirst !== false,
      deliver: Boolean(body.deliver),
    });
    return NextResponse.json({ id: result.id, deliveryNote: result.deliveryNote, generatedOn: result.payload.generatedOn });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
