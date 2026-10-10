import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getPanelAuthFromEnv, isAuthorizedBasic, isPublicPath } from "@/lib/panel-auth";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const creds = getPanelAuthFromEnv();
  if (!creds) {
    // Auth unset → localhost/LAN friendly (no gate). Set PANEL_PASSWORD or BASIC_AUTH_* for public deploy.
    return NextResponse.next();
  }

  if (isAuthorizedBasic(req.headers.get("authorization"), creds)) {
    return NextResponse.next();
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Search Triad", charset="UTF-8"',
      "Cache-Control": "no-store",
    },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
