/** Panel Basic Auth helpers (Edge-safe). Auth is optional until env is set. */

export type PanelAuthCredentials = {
  user: string;
  password: string;
};

const INSECURE_APP_SECRET_PLACEHOLDERS = new Set([
  "change-me-to-a-long-random-string-at-least-32-chars",
  "change-me",
]);

/** True when APP_SECRET is missing, too short, or a known insecure placeholder. */
export function isInsecureAppSecret(value: string | undefined | null): boolean {
  if (!value || value.length < 16) return true;
  return INSECURE_APP_SECRET_PLACEHOLDERS.has(value);
}

/**
 * Resolve panel credentials from env.
 * Enable with `PANEL_PASSWORD` and/or `BASIC_AUTH_PASSWORD`.
 * Username defaults to `admin` when only `PANEL_PASSWORD` is set.
 */
export function getPanelAuthFromEnv(
  env: Record<string, string | undefined> = typeof process !== "undefined" ? process.env : {},
): PanelAuthCredentials | null {
  const password = (env.BASIC_AUTH_PASSWORD || env.PANEL_PASSWORD || "").trim();
  if (!password) return null;
  const user = (env.BASIC_AUTH_USER || "admin").trim() || "admin";
  return { user, password };
}

export function parseBasicAuthHeader(header: string | null): { user: string; password: string } | null {
  if (!header || !header.startsWith("Basic ")) return null;
  try {
    const decoded = atob(header.slice(6).trim());
    const colon = decoded.indexOf(":");
    if (colon < 0) return null;
    return { user: decoded.slice(0, colon), password: decoded.slice(colon + 1) };
  } catch {
    return null;
  }
}

function timingSafeEqualString(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const aa = enc.encode(a);
  const bb = enc.encode(b);
  const len = Math.max(aa.length, bb.length);
  let mismatch = aa.length === bb.length ? 0 : 1;
  for (let i = 0; i < len; i++) {
    mismatch |= (aa[i] ?? 0) ^ (bb[i] ?? 0);
  }
  return mismatch === 0;
}

export function isAuthorizedBasic(
  authorizationHeader: string | null,
  creds: PanelAuthCredentials,
): boolean {
  const parsed = parseBasicAuthHeader(authorizationHeader);
  if (!parsed) return false;
  return (
    timingSafeEqualString(parsed.user, creds.user) &&
    timingSafeEqualString(parsed.password, creds.password)
  );
}

/** Paths that stay reachable without panel auth (probes / static). */
export function isPublicPath(pathname: string): boolean {
  if (pathname === "/api/health") return true;
  if (pathname === "/favicon.ico") return true;
  if (pathname.startsWith("/_next/")) return true;
  return false;
}
