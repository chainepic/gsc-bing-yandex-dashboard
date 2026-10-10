import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Yandex implicit flow returns token in the URL hash (client-only). This page helps users copy it. */
export async function GET() {
  const html = `<!doctype html>
<html><head><meta charset="utf-8"/><title>Yandex OAuth</title>
<style>body{font-family:system-ui;padding:2rem;max-width:40rem;margin:auto;line-height:1.5}
code{background:#eee;padding:.2rem .4rem}</style></head>
<body>
<h1>Yandex authorization</h1>
<p>If the access token is in the URL fragment, it appears below. Copy it into Search Triad setup.</p>
<pre id="out">Parsing…</pre>
<script>
const hash = location.hash.replace(/^#/, '');
const params = new URLSearchParams(hash);
const token = params.get('access_token');
const out = document.getElementById('out');
if (token) {
  out.textContent = token;
} else {
  out.textContent = 'No access_token in URL hash. Check Yandex app redirect URI and scopes (webmaster:hostinfo webmaster:verify).';
}
</script>
</body></html>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
