/**
 * Minimal smoke for panel auth + optional live health/auth probe.
 *   pnpm --filter @search-triad/web exec tsx scripts/smoke-auth.ts
 *   BASE_URL=http://127.0.0.1:3847 PANEL_PASSWORD=... pnpm --filter @search-triad/web exec tsx scripts/smoke-auth.ts
 */
import assert from "node:assert/strict";
import {
  getPanelAuthFromEnv,
  isAuthorizedBasic,
  isInsecureAppSecret,
  isPublicPath,
} from "../src/lib/panel-auth";

assert.equal(getPanelAuthFromEnv({}), null);
assert.equal(getPanelAuthFromEnv({ PANEL_PASSWORD: "s3cret" })?.user, "admin");
assert.equal(
  getPanelAuthFromEnv({ BASIC_AUTH_USER: "ops", BASIC_AUTH_PASSWORD: "x" })?.user,
  "ops",
);

const creds = getPanelAuthFromEnv({ PANEL_PASSWORD: "s3cret" })!;
const okHdr = `Basic ${Buffer.from("admin:s3cret").toString("base64")}`;
const badHdr = `Basic ${Buffer.from("admin:wrong").toString("base64")}`;
assert.equal(isAuthorizedBasic(okHdr, creds), true);
assert.equal(isAuthorizedBasic(badHdr, creds), false);
assert.equal(isAuthorizedBasic(null, creds), false);

assert.equal(isPublicPath("/api/health"), true);
assert.equal(isPublicPath("/api/secrets"), false);
assert.equal(isPublicPath("/api/sync"), false);
assert.equal(isPublicPath("/api/digest/run"), false);

assert.equal(isInsecureAppSecret("change-me-to-a-long-random-string-at-least-32-chars"), true);
assert.equal(isInsecureAppSecret("a".repeat(32)), false);

console.log("panel-auth unit checks: ok");

async function liveProbe() {
  const base = (process.env.BASE_URL || "").replace(/\/$/, "");
  if (!base) {
    console.log("skip live checks (set BASE_URL to hit a running server)");
    return;
  }

  const health = await fetch(`${base}/api/health`);
  assert.equal(health.status, 200);
  const body = (await health.json()) as { ok?: boolean };
  assert.equal(body.ok, true);
  console.log("live /api/health: ok");

  if (process.env.PANEL_PASSWORD || process.env.BASIC_AUTH_PASSWORD) {
    const denied = await fetch(`${base}/api/secrets`);
    assert.equal(denied.status, 401);
    const user = process.env.BASIC_AUTH_USER || "admin";
    const pass = process.env.BASIC_AUTH_PASSWORD || process.env.PANEL_PASSWORD!;
    const hdr = `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`;
    const allowed = await fetch(`${base}/api/secrets`, { headers: { Authorization: hdr } });
    assert.notEqual(allowed.status, 401);
    console.log("live auth gate on /api/secrets: ok");
  }
}

liveProbe()
  .then(() => {
    console.log("smoke-auth: passed");
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
