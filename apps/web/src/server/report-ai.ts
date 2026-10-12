import { ByokReportAiProvider, NoopReportAiProvider } from "@search-triad/adapters-oss";
import {
  OssEntitlementsProvider,
  parseReportAiLocale,
  parseReportAiPromptId,
  type ReportAiProvider,
  type ReportAiResult,
} from "@search-triad/core";
import { desc, eq } from "drizzle-orm";
import { getDb } from "./db/client";
import { reportAiReports } from "./db/schema";
import { buildExportSlice, parseExportSliceSpec } from "./export-slice";
import { loadSecrets } from "./secrets";
import { getSettings } from "./settings";

const entitlements = new OssEntitlementsProvider();

export type SavedReportAiReport = {
  id: number;
  createdAt: string;
  kind: "interpret" | "advice";
  promptId: string;
  hosts: string[] | "all";
  dateFrom: string;
  dateTo: string;
  model: string | null;
  markdown: string;
  parentId: number | null;
};

/** Composition root for OSS — never imports commercial/. */
export function getReportAiProvider(): ReportAiProvider {
  const settings = getSettings();
  const secrets = loadSecrets();
  const apiKey = secrets.reportAi?.apiKey?.trim() || "";
  if (!settings.reportAiEnabled || !apiKey) {
    return new NoopReportAiProvider();
  }
  return new ByokReportAiProvider({
    baseUrl: settings.reportAiBaseUrl,
    apiKey,
    model: settings.reportAiModel,
  });
}

export function reportAiStatus() {
  const provider = getReportAiProvider();
  const settings = getSettings();
  const secrets = loadSecrets();
  return {
    entitlements: entitlements.get(),
    enabled: settings.reportAiEnabled,
    configured: provider.isConfigured(),
    providerId: provider.id,
    baseUrl: settings.reportAiBaseUrl,
    model: settings.reportAiModel,
    hasApiKey: Boolean(secrets.reportAi?.apiKey),
    saveReports: settings.reportAiSaveReports,
  };
}

/** Probe saved (or override) base URL + key + model with a tiny completion. */
export async function testReportAiConnection(overrides?: {
  baseUrl?: string;
  model?: string;
  apiKey?: string;
}) {
  const settings = getSettings();
  const secrets = loadSecrets();
  const baseUrl = (overrides?.baseUrl || settings.reportAiBaseUrl || "").trim();
  const model = (overrides?.model || settings.reportAiModel || "").trim();
  const apiKey = (overrides?.apiKey || secrets.reportAi?.apiKey || "").trim();
  if (!baseUrl || !apiKey) {
    throw new Error("Missing base URL or API key. Save Report AI settings first, or paste a key to test.");
  }
  if (!model) {
    throw new Error("Model is empty.");
  }
  const provider = new ByokReportAiProvider({ baseUrl, apiKey, model });
  const started = Date.now();
  const ping = await provider.ping();
  return {
    ok: true as const,
    requestedModel: model,
    returnedModel: ping.model,
    reply: ping.reply,
    baseUrl,
    latencyMs: Date.now() - started,
  };
}

function hostsLabel(hosts: ExportHosts): string {
  return hosts === "all" ? "all" : JSON.stringify(hosts);
}

type ExportHosts = string[] | "all";

function parseHostsJson(raw: string): ExportHosts {
  if (raw === "all") return "all";
  try {
    const v = JSON.parse(raw) as unknown;
    if (Array.isArray(v)) return v.map(String);
  } catch {
    /* ignore */
  }
  return "all";
}

function rowToSaved(row: typeof reportAiReports.$inferSelect): SavedReportAiReport {
  return {
    id: row.id,
    createdAt: row.createdAt,
    kind: row.kind === "advice" ? "advice" : "interpret",
    promptId: row.promptId,
    hosts: parseHostsJson(row.hostsJson),
    dateFrom: row.dateFrom,
    dateTo: row.dateTo,
    model: row.model,
    markdown: row.markdown,
    parentId: row.parentId,
  };
}

export function listReportAiReports(limit = 30): SavedReportAiReport[] {
  const rows = getDb()
    .select()
    .from(reportAiReports)
    .orderBy(desc(reportAiReports.id))
    .limit(Math.min(100, Math.max(1, limit)))
    .all();
  return rows.map(rowToSaved);
}

export function getReportAiReport(id: number): SavedReportAiReport | null {
  const row = getDb().select().from(reportAiReports).where(eq(reportAiReports.id, id)).get();
  return row ? rowToSaved(row) : null;
}

export function deleteReportAiReport(id: number) {
  getDb().delete(reportAiReports).where(eq(reportAiReports.id, id)).run();
}

function saveReportAiReport(input: {
  kind: "interpret" | "advice";
  promptId: string;
  hosts: ExportHosts;
  dateFrom: string;
  dateTo: string;
  model: string | null;
  markdown: string;
  parentId?: number | null;
}): number | null {
  if (!getSettings().reportAiSaveReports) return null;
  const row = getDb()
    .insert(reportAiReports)
    .values({
      createdAt: new Date().toISOString(),
      kind: input.kind,
      promptId: input.promptId,
      hostsJson: hostsLabel(input.hosts),
      dateFrom: input.dateFrom,
      dateTo: input.dateTo,
      model: input.model,
      markdown: input.markdown,
      parentId: input.parentId ?? null,
    })
    .returning()
    .get();
  return row.id;
}

export async function runReportAiInterpret(body: Record<string, unknown>): Promise<{
  result: ReportAiResult;
  inventory: string[];
  savedId: number | null;
}> {
  if (!entitlements.get().reportAiByok) {
    throw new Error("Report AI BYOK is not entitled on this build.");
  }
  const provider = getReportAiProvider();
  if (!provider.isConfigured()) {
    throw new Error(
      "Report AI is not configured. Enable it in Settings and save your API key (BYOK)."
    );
  }
  const spec = parseExportSliceSpec(body);
  const slice = buildExportSlice(spec);
  const promptId = parseReportAiPromptId(body.promptId);
  const priorMarkdown = typeof body.priorMarkdown === "string" ? body.priorMarkdown : undefined;
  const parentId =
    typeof body.parentId === "number"
      ? body.parentId
      : typeof body.parentId === "string" && /^\d+$/.test(body.parentId)
        ? Number(body.parentId)
        : null;
  if (promptId === "ask_advice" && !(priorMarkdown || "").trim()) {
    throw new Error("ask_advice requires priorMarkdown from a previous interpretation.");
  }
  const result = await provider.interpret({
    slice,
    promptId,
    locale: parseReportAiLocale(body.locale),
    priorMarkdown,
  });
  const kind = promptId === "ask_advice" ? "advice" : "interpret";
  const savedId = saveReportAiReport({
    kind,
    promptId,
    hosts: slice.meta.hosts,
    dateFrom: slice.meta.dateFrom,
    dateTo: slice.meta.dateTo,
    model: result.model,
    markdown: result.markdown,
    parentId: kind === "advice" ? parentId : null,
  });
  return { result, inventory: slice.meta.inventory, savedId };
}
