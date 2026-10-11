import type { ExportSlicePayload } from "./export-slice.js";

/** Preset prompt ids shipped with OSS — commercial may add more later via its own adapter. */
export type ReportAiPromptId = "digest_brief" | "weekly_narrative" | "export_summary";

export type ReportAiLocale = "en" | "zh";

export type ReportAiRequest = {
  slice: ExportSlicePayload;
  promptId: ReportAiPromptId;
  locale: ReportAiLocale;
};

export type ReportAiResult = {
  markdown: string;
  model: string;
  providerId: string;
  usage?: { inputTokens?: number; outputTokens?: number };
};

/**
 * Port for report interpretation. OSS wires BYOK; commercial wires metered.
 * Core never imports a concrete HTTP client for billing.
 */
export interface ReportAiProvider {
  readonly id: "noop" | "byok" | "metered";
  isConfigured(): boolean;
  interpret(req: ReportAiRequest): Promise<ReportAiResult>;
}

export function parseReportAiPromptId(raw: unknown): ReportAiPromptId {
  if (raw === "digest_brief" || raw === "weekly_narrative" || raw === "export_summary") return raw;
  return "export_summary";
}

export function parseReportAiLocale(raw: unknown): ReportAiLocale {
  return raw === "zh" ? "zh" : "en";
}
