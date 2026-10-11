#!/usr/bin/env node
/**
 * Capture product screenshots into docs/screenshots/ (English + Chinese).
 *
 * Uses fictional example.com demo data only (ALLOW_DEMO_SEED=1).
 * Never point BASE_URL at a trial DB with real customer hosts.
 *
 * Prerequisites:
 *   1. App running on BASE_URL (default http://127.0.0.1:3848)
 *   2. ALLOW_DEMO_SEED=1 and APP_SECRET set on the server
 *   3. npx playwright install chromium  (first time)
 *
 * Usage:
 *   BASE_URL=http://127.0.0.1:3848 node scripts/capture-screenshots.mjs
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "docs", "screenshots");
const base = process.env.BASE_URL || "http://127.0.0.1:3848";
const locales = ["en", "zh"];

const filledShots = [
  { name: "overview", path: "/" },
  { name: "sites", path: "/sites" },
  { name: "site-detail", path: "/sites/example.com" },
  { name: "site-detail-bing", path: "/sites/example.com", after: clickEngineTab(/bing/i) },
  { name: "site-detail-yandex", path: "/sites/example.com", after: clickEngineTab(/yandex/i) },
  { name: "site-detail-filtered", path: "/sites/example.com", after: filterSiteMovers },
  { name: "site-detail-docs", path: "/sites/docs.example.com" },
  { name: "keywords", path: "/keywords" },
  { name: "keywords-filtered", path: "/keywords", after: filterKeywords },
  { name: "digest", path: "/digest" },
  { name: "settings", path: "/settings" },
  { name: "settings-smtp", path: "/settings", after: scrollToSmtp },
  { name: "guide", path: "/guide" },
  { name: "faq", path: "/faq" },
  { name: "recommendations", path: "/recommendations" },
  { name: "inspect", path: "/inspect" },
  { name: "prompt", path: "/prompt" },
  { name: "setup", path: "/setup" },
  { name: "setup-step2", path: "/setup", after: advanceSetup },
];

function fileName(name, locale) {
  return locale === "en" ? `${name}.png` : `${name}-zh.png`;
}

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
  const input = page
    .getByLabel(/filter|筛选|过滤/i)
    .or(page.locator('input[placeholder*="ilter" i]'))
    .or(page.locator('input[placeholder*="筛选"]'))
    .first();
  if (await input.isVisible().catch(() => false)) {
    await input.fill("pricing");
    await page.waitForTimeout(400);
  }
}

async function filterKeywords(page) {
  const input = page
    .getByLabel(/filter|筛选|过滤/i)
    .or(page.locator('input[placeholder*="earch" i]'))
    .or(page.locator('input[placeholder*="筛选"]'))
    .or(page.locator('input[placeholder*="关键词"]'))
    .first();
  if (await input.isVisible().catch(() => false)) {
    await input.fill("pricing");
    await page.waitForTimeout(400);
  }
}

async function scrollToSmtp(page) {
  const smtp = page.getByText(/SMTP|email|mail|邮件/i).first();
  if (await smtp.isVisible().catch(() => false)) {
    await smtp.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
  } else {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);
  }
}

async function advanceSetup(page) {
  const next = page.getByRole("button", { name: /next|continue|skip|下一步|继续|跳过/i }).first();
  if (await next.isVisible().catch(() => false)) {
    await next.click();
    await page.waitForTimeout(500);
  }
}

async function postJson(urlPath, body) {
  const res = await fetch(`${base}${urlPath}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${urlPath} failed (${res.status}): ${text}`);
  return text;
}

async function setLocale(locale) {
  await postJson("/api/settings", { uiLocale: locale });
}

async function resetDemo() {
  const text = await postJson("/api/demo/reset");
  console.log("Reset demo:", text.slice(0, 120));
}

async function seedDemo() {
  const text = await postJson("/api/demo/seed");
  console.log("Seeded demo:", text.slice(0, 200));
}

async function assertNoRealHosts(page) {
  const html = await page.content();
  const banned = ["obpai", "pokerjudge", "take.skin", "cs2hot", "bytedata", "easymake", "newname.ai", "hi.toys"];
  const hit = banned.find((b) => html.toLowerCase().includes(b.toLowerCase()));
  if (hit) {
    throw new Error(`Screenshot page leaked real host/keyword fragment: ${hit}`);
  }
}

async function shoot(page, name, urlPath, locale, after) {
  const url = `${base}${urlPath}`;
  const outName = fileName(name, locale);
  console.log("→", locale, outName, url);
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(500);
  if (after) await after(page);
  await assertNoRealHosts(page);
  const file = path.join(outDir, outName);
  await page.screenshot({ path: file, fullPage: true });
  console.log("  saved", path.relative(root, file));
  return file;
}

async function main() {
  await mkdir(outDir, { recursive: true });

  const health = await fetch(`${base}/api/health`)
    .then((r) => r.json())
    .catch(() => null);
  if (!health?.ok) {
    throw new Error(
      `App not healthy at ${base}. Start a dedicated demo instance, e.g.\n` +
        `  DATA_DIR=./data-screenshots ALLOW_DEMO_SEED=1 PORT=3848 …`
    );
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  const written = [];

  for (const locale of locales) {
    console.log(`\n=== Locale: ${locale} ===`);
    await resetDemo();
    await setLocale(locale);
    written.push(await shoot(page, "first-run", "/", locale));
    written.push(await shoot(page, "setup-empty", "/setup", locale));

    await seedDemo();
    await setLocale(locale);

    for (const shot of filledShots) {
      written.push(await shoot(page, shot.name, shot.path, locale, shot.after));
    }
  }

  await browser.close();

  const manifest = {
    generatedAt: new Date().toISOString(),
    base,
    locales,
    note: "Fictional example.com demo data only — no real customer hosts/keywords",
    files: written.map((f) => path.relative(root, f)),
  };
  await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  console.log("\nDone:", written.length, "screenshots →", path.relative(root, outDir));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
