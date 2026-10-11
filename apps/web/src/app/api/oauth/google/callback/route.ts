import { NextResponse } from "next/server";
import { exchangeGscCode } from "@search-triad/connectors";
import { requestOrigin } from "@/lib/request-origin";
import { loadSecrets, mergeSecrets } from "@/server/secrets";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = requestOrigin(req);
  const code = url.searchParams.get("code");
  const err = url.searchParams.get("error");
  if (err) return NextResponse.redirect(new URL(`/setup?error=${encodeURIComponent(err)}`, origin));
  if (!code) return NextResponse.redirect(new URL("/setup?error=missing_code", origin));

  try {
    const secrets = loadSecrets();
    const clientId = secrets.google?.clientId;
    const clientSecret = secrets.google?.clientSecret;
    if (!clientId || !clientSecret) throw new Error("Google OAuth client missing");
    const redirectUri = `${origin}/api/oauth/google/callback`;
    const tokens = await exchangeGscCode(clientId, clientSecret, redirectUri, code);
    if (!tokens.refresh_token && !secrets.google?.refreshToken) {
      throw new Error("No refresh_token returned. Revoke app access and retry with prompt=consent.");
    }
    mergeSecrets({
      google: {
        mode: "oauth",
        clientId,
        clientSecret,
        refreshToken: tokens.refresh_token || secrets.google?.refreshToken,
      },
    });
    // Sites are listed in the setup wizard for checkbox selection — do not auto-upsert all properties.
    return NextResponse.redirect(new URL("/setup?google=ok", origin));
  } catch (e) {
    return NextResponse.redirect(
      new URL(`/setup?error=${encodeURIComponent(e instanceof Error ? e.message : String(e))}`, origin)
    );
  }
}
