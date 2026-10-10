import { NextResponse } from "next/server";
import { mergeSecrets, secretsStatus } from "@/server/secrets";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(secretsStatus());
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    mergeSecrets(body);
    return NextResponse.json(secretsStatus());
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}
