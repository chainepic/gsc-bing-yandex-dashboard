import { buildDigest, postWebhook, type DigestPayload } from "@search-triad/core";
import type { EngineId, SiteWindowStats } from "@search-triad/connectors";
import { and, desc, eq } from "drizzle-orm";
import nodemailer from "nodemailer";
import { getDb } from "./db/client";
import { digests, keywordSnapshot, metricDaily, sites } from "./db/schema";
import { generateRecommendations } from "./recommendations";
import { loadSecrets } from "./secrets";
import { getSettings } from "./settings";
import { runSync } from "./sync";

function rebuildWindowsFromDb(): Record<EngineId, SiteWindowStats[]> {
  const db = getDb();
  const siteRows = db.select().from(sites).all();
  const byEngine: Record<EngineId, SiteWindowStats[]> = { gsc: [], bing: [], yandex: [] };

  for (const site of siteRows) {
    if (!site.enabled) continue;
    const engine = site.engine as EngineId;
    const daily = db
      .select()
      .from(metricDaily)
      .where(and(eq(metricDaily.engine, engine), eq(metricDaily.siteId, site.id)))
      .all()
      .sort((a, b) => a.date.localeCompare(b.date));
    if (!daily.length) continue;
    const asOf = daily[daily.length - 1]!.date;
    const weekDates = daily.slice(-7);
    const priorDates = daily.slice(-14, -7);
    const week = {
      clicks: weekDates.reduce((s, d) => s + d.clicks, 0),
      impressions: weekDates.reduce((s, d) => s + d.impressions, 0),
    };
    const prior = {
      clicks: priorDates.reduce((s, d) => s + d.clicks, 0),
      impressions: priorDates.reduce((s, d) => s + d.impressions, 0),
    };
    const snapshots = db
      .select()
      .from(keywordSnapshot)
      .where(and(eq(keywordSnapshot.engine, engine), eq(keywordSnapshot.siteId, site.id)))
      .all();
    const toRow = (k: (typeof snapshots)[number]) => ({
      key: k.query,
      clicks: k.clicks,
      impressions: k.impressions,
      position: k.position,
      clickDelta: k.clickDelta,
      impressionDelta: k.impressionDelta,
    });
    const queries = snapshots.filter((k) => (k.kind || "query") === "query");
    const pages = snapshots.filter((k) => k.kind === "page");
    const queryGains = queries
      .filter((k) => k.clickDelta > 0)
      .sort((a, b) => b.clickDelta - a.clickDelta)
      .slice(0, 10)
      .map(toRow);
    const queryLosses = queries
      .filter((k) => k.clickDelta < 0)
      .sort((a, b) => a.clickDelta - b.clickDelta)
      .slice(0, 10)
      .map(toRow);
    const pageGains = pages
      .filter((k) => k.clickDelta > 0)
      .sort((a, b) => b.clickDelta - a.clickDelta)
      .slice(0, 10)
      .map(toRow);
    const pageLosses = pages
      .filter((k) => k.clickDelta < 0)
      .sort((a, b) => a.clickDelta - b.clickDelta)
      .slice(0, 10)
      .map(toRow);

    byEngine[engine].push({
      host: site.host,
      siteUrl: site.propertyId,
      engine,
      asOf,
      week,
      prior,
      clickDelta: week.clicks - prior.clicks,
      impressionDelta: week.impressions - prior.impressions,
      daily: daily.map((d) => ({
        date: d.date,
        clicks: d.clicks,
        impressions: d.impressions,
        ctr: d.ctr,
        position: d.position,
      })),
      queryGains,
      queryLosses,
      pageGains,
      pageLosses,
    });
  }
  return byEngine;
}

async function postTelegram(botToken: string, chatId: string, text: string) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: text.slice(0, 4000),
      disable_web_page_preview: true,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Telegram HTTP ${res.status}${body ? `: ${body.slice(0, 200)}` : ""}`);
  }
}

async function deliver(payload: DigestPayload) {
  const secrets = loadSecrets();
  const notes: string[] = [];
  if (secrets.notify?.webhookUrl) {
    try {
      await postWebhook(secrets.notify.webhookUrl, {
        text: payload.markdown.slice(0, 3500),
        content: payload.markdown.slice(0, 1900),
        digest: payload,
      });
      notes.push("webhook ok");
    } catch (err) {
      notes.push(`webhook: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (secrets.notify?.smtp?.host && secrets.notify.smtp.to) {
    try {
      const smtp = secrets.notify.smtp;
      const transport = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
      });
      await transport.sendMail({
        from: smtp.from || smtp.user,
        to: smtp.to,
        subject: `GSC · Bing · Yandex Daily ${payload.generatedOn}`,
        text: payload.markdown,
      });
      notes.push("smtp ok");
    } catch (err) {
      notes.push(`smtp: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (secrets.notify?.telegram?.botToken && secrets.notify.telegram.chatId) {
    try {
      await postTelegram(secrets.notify.telegram.botToken, secrets.notify.telegram.chatId, payload.markdown);
      notes.push("telegram ok");
    } catch (err) {
      notes.push(`telegram: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return notes.join("; ") || "no delivery configured";
}

export async function runDigestJob(options: { syncFirst?: boolean; deliver?: boolean } = {}) {
  const settings = getSettings();
  if (options.syncFirst !== false) {
    await runSync();
  }
  const byEngine = rebuildWindowsFromDb();
  const generatedOn = new Date().toLocaleDateString("en-CA", { timeZone: settings.timeZone });
  // Rule-card copy is zh/en only; Russian digests still use Chinese/English cards under Russian section titles.
  const recLocale = settings.digestLocale === "zh" ? "zh" : "en";
  const recommendations = settings.digestIncludeRecommendations
    ? generateRecommendations({ limit: 20, locale: recLocale })
    : [];
  const payload = buildDigest({
    generatedOn,
    timeZone: settings.timeZone,
    byEngine,
    recommendations,
    includeRecommendations: settings.digestIncludeRecommendations,
    sections: settings.digestSections,
    locale: settings.digestLocale,
  });
  let deliveryNote: string | null = null;
  let delivered = false;
  if (options.deliver !== false) {
    deliveryNote = await deliver(payload);
    delivered = deliveryNote.includes("ok");
  }
  const db = getDb();
  const row = db
    .insert(digests)
    .values({
      generatedOn,
      createdAt: new Date().toISOString(),
      payloadJson: JSON.stringify(payload),
      markdown: payload.markdown,
      delivered,
      deliveryNote,
    })
    .returning()
    .get();
  return { id: row.id, payload, deliveryNote };
}

export function listDigests(limit = 30) {
  return getDb().select().from(digests).orderBy(desc(digests.id)).limit(limit).all();
}

export function getDigest(id: number) {
  return getDb().select().from(digests).where(eq(digests.id, id)).get();
}
