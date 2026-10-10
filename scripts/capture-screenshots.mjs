#!/usr/bin/env node
/**
 * Capture product screenshots into docs/screenshots/.
 *
 * Prerequisites:
 *   1. App running on BASE_URL (default http://127.0.0.1:3847)
 *   2. ALLOW_DEMO_SEED=1 and APP_SECRET set on the server
 *   3: npx playwright install chromium  (first time)
 *
 * Usage:
 *   node scripts/capture-screenshots.mjs
 *   BASE_URL=http://127.0.0.1:3847 node scripts/capture-screenshots.mjs
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "docs", "screenshots");
const base = process.env.BASE_URL || "http://127.0.0.1:3847";

const shots = [
  { name: "overview", path: "/", wait: "networkidle" },
  { name: "sites", path: "/sites", wait: "networkidle" },
  { name: "site-detail", path: "/sites/example.com", wait: "networkidle" },
  { name: "site-detail-bing", path: "/sites/example.com", wait: "networkidle", after: clickEngineTab(/bing/i) },
  { name: "site-detail-yandex", path: "/sites/example.com", wait: "networkidle", after: clickEngineTab(/yandex/i) },
  { name: "site-detail-filtered", path: "/sites/example.com", wait: "networkidle", after: filterSiteMovers },
  { name: "keywords", path: "/keywords", wait: "networkidle" },
  { name: "keywords-filtered", path: "/keywords", wait: "networkidle", after: filterKeywords },
  { name: "digest", path: "/digest", wait: "networkidle" },
  { name: "settings", path: "/settings", wait: "networkidle" },
  { name: "settings-smtp", path: "/settings", wait: "networkidle", after: scrollToSmtp },
  { name: "guide", path: "/guide", wait: "networkidle" },
  { name: "setup", path: "/setup", wait: "networkidle" },
  { name: "setup-step2", path: "/setup", wait: "networkidle", after: advanceSetup },
];

function clickEngineTab(re) {
  return async (page) => {
    const tabs = page.locator('[role="tab"]');
    const count = await tabs.count();
    for (let i = 0; i < count; i++) {
      const text = (await tabs.nth(i).innerText()).trim();
      if (re.test(text)) {
        await tabs.nth(i).click();
        await page.waitForTimeout(400);
        return;
      }
    }
  };
}

async function filterSiteMovers(page) {
  const input = page.getByLabel(/filter/i).or(page.locator('input[placeholder*="ilter" i]')).first();
  if (await input.isVisible().catch(() => false)) {
    await input.fill("pricing");
    await page.waitForTimeout(400);
  }
}

async function filterKeywords(page) {
  const input = page.getByLabel("Filter keywords").or(page.locator('input[placeholder*="earch" i]')).first();
  if (await input.isVisible().catch(() => false)) {
    await input.fill("pricing");
    await page.waitForTimeout(400);
  }
}

async function scrollToSmtp(page) {
  const smtp = page.getByText(/SMTP|email|mail/i).first();
  if (await smtp.isVisible().catch(() => false)) {
    await smtp.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
  } else {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);
  }
}

async function advanceSetup(page) {
  const next = page.getByRole("button", { name: /next|continue|skip/i }).first();
  if (await next.isVisible().catch(() => false)) {
    await next.click();
    await page.waitForTimeout(500);
  }
}

async function seedDemo() {
  const res = await fetch(`${base}/api/demo/seed`, { method: "POST" });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Demo seed failed (${res.status}): ${text}`);
  }
  console.log("Seeded demo:", text.slice(0, 200));
}

async function shoot(page, name, urlPath, after) {
  const url = `${base}${urlPath}`;
  console.log("→", name, url);
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(500);
  if (after) await after(page);
  const file = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log("  saved", path.relative(root, file));
  return file;
}

async function captureFirstRun(page, written) {
  // Mark setup complete with no engines/sites → Overview shows FirstRunPanel.
  const res = await fetch(`${base}/api/settings`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ setupComplete: true, timeZone: "Asia/Shanghai", digestHour: 9, digestMinute: 0 }),
  });
  if (!res.ok) {
    console.warn("Could not mark setup complete for first-run shot:", await res.text());
    return;
  }
  written.push(await shoot(page, "first-run", "/"));
  written.push(await shoot(page, "setup-empty", "/setup"));
}

async function main() {
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  const written = [];

  // 1–2 first-run / empty guidance shots before demo seed fills the UI
  await captureFirstRun(page, written);

  await seedDemo();

  for (const shot of shots) {
    written.push(await shoot(page, shot.name, shot.path, shot.after));
  }

  written.push(await shoot(page, "site-detail-docs", "/sites/docs.example.com"));

  await browser.close();

  const manifest = {
    generatedAt: new Date().toISOString(),
    base,
    files: written.map((f) => path.relative(root, f)),
  };
  await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  console.log("\nDone:", written.length, "screenshots →", path.relative(root, outDir));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
