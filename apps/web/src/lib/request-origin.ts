import { SETUP_DEFAULT_ORIGIN } from "@/lib/setup-links";

/**
 * Public origin for OAuth redirects. Prefer Host / forwarded headers so binding
 * on 0.0.0.0 does not produce redirect_uri=http://0.0.0.0:... (Google rejects that).
 */
export function requestOrigin(req: Request): string {
  const url = new URL(req.url);
  const xfHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = xfHost || req.headers.get("host")?.trim() || url.host;
  const xfProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  let proto = xfProto || url.protocol.replace(":", "") || "http";

  if (!host || host.startsWith("0.0.0.0")) {
    return SETUP_DEFAULT_ORIGIN;
  }

  // Local HTTPS is uncommon for this panel; keep http for localhost / 127.0.0.1
  if (/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host)) {
    proto = "http";
  }

  return `${proto}://${host}`;
}
