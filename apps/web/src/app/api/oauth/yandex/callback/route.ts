import { NextResponse } from "next/server";
import { storeYandexOAuthCode } from "@/server/yandex-auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const err = url.searchParams.get("error");
  const errDesc = url.searchParams.get("error_description");

  // Legacy implicit-flow hash tokens: keep a small helper page for paste UX.
  if (!code && !err && !url.searchParams.has("access_token")) {
    const html = `<!doctype html>
<html><head><meta charset="utf-8"/><title>Yandex OAuth</title>
<style>body{font-family:system-ui;padding:2rem;max-width:40rem;margin:auto;line-height:1.5}
code{background:#eee;padding:.2rem .4rem}</style></head>
<body>
<h1>Yandex authorization</h1>
<p>Waiting for authorization code redirect… If you still use the old implicit flow, the access token from the URL fragment is shown below for manual paste.</p>
<pre id="out">Parsing…</pre>
<script>
const hash = location.hash.replace(/^#/, '');
const params = new URLSearchParams(hash);
const token = params.get('access_token');
const out = document.getElementById('out');
if (token) {
  out.textContent = token;
} else {
  out.textContent = 'No code or access_token found. Use Setup → Open authorize URL (authorization code flow).';
}
</script>
</body></html>`;
    return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  if (err) {
    return NextResponse.redirect(
      new URL(`/setup?error=${encodeURIComponent(errDesc || err)}`, url.origin)
    );
  }
  if (!code) {
    return NextResponse.redirect(new URL("/setup?error=missing_yandex_code", url.origin));
  }

  try {
    const redirectUri = `${url.origin}/api/oauth/yandex/callback`;
    await storeYandexOAuthCode(code, redirectUri);
    return NextResponse.redirect(new URL("/setup?yandex=ok", url.origin));
  } catch (e) {
    return NextResponse.redirect(
      new URL(`/setup?error=${encodeURIComponent(e instanceof Error ? e.message : String(e))}`, url.origin)
    );
  }
}
