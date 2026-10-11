import { ByokReportAiProvider, NoopReportAiProvider } from "@search-triad/adapters-oss";
import {
  OssEntitlementsProvider,
  parseReportAiLocale,
  parseReportAiPromptId,
  type ReportAiProvider,
  type ReportAiResult,
} from "@search-triad/core";
import { buildExportSlice, parseExportSliceSpec } from "./export-slice";
import { loadSecrets } from "./secrets";
import { getSettings } from "./settings";

const entitlements = new OssEntitlementsProvider();

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
  };
}

export async function runReportAiInterpret(body: Record<string, unknown>): Promise<{
  result: ReportAiResult;
  inventory: string[];
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
  // AI always works from a materialized slice; prefer markdown-friendly includes as requested.
  const slice = buildExportSlice(spec);
  const result = await provider.interpret({
    slice,
    promptId: parseReportAiPromptId(body.promptId),
    locale: parseReportAiLocale(body.locale),
  });
  return { result, inventory: slice.meta.inventory };
}
