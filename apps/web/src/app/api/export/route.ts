import { NextResponse } from "next/server";
import { exportSliceResponse, parseExportSliceSpec } from "@/server/export-slice";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const download = body.download === true || body.download === "true";
    const spec = parseExportSliceSpec(body);
    const { slice, body: fileBody, contentType, filename } = exportSliceResponse(spec);
    if (download) {
      return new NextResponse(fileBody, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }
    return NextResponse.json({
      meta: slice.meta,
      format: spec.format,
      filename,
      contentType,
      body: fileBody,
      previewChars: Math.min(fileBody.length, 4000),
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    hint: "POST JSON { dateFrom, dateTo, hosts?, include, format, download? }",
  });
}
