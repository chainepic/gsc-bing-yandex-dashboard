import type { ReportAiLocale, ReportAiPromptId, ReportAiRequest } from "../ports/report-ai.js";
import { exportSliceToMarkdown } from "../ports/export-slice.js";

const SYSTEM_EN = `You are an SEO analyst assistant for a self-hosted GSC · Bing · Yandex dashboard (Search Triad).
Rules:
- Use ONLY the export slice data provided by the user. Do not invent metrics, URLs, or engines.
- If data is missing for an engine or host, say so explicitly.
- Prefer concrete actions tied to evidence (host, query/page, deltas).
- Output Markdown suitable to share with a colleague. No HTML.
- Do not ask for API keys or credentials.`;

const SYSTEM_ZH = `你是自托管「GSC · Bing · Yandex」面板（Search Triad）的 SEO 分析助手。
规则：
- 只根据用户提供的导出切片数据作答，禁止编造指标、URL 或引擎数据。
- 某引擎/站点缺失时要明确写出。
- 建议须可执行，并绑定证据（站点、词/页、增减幅度）。
- 输出可分享给同事的 Markdown，不要 HTML。
- 不要索取 API Key 或凭证。`;

const TASK_EN: Record<ReportAiPromptId, string> = {
  digest_brief:
    "Write a short executive brief (≤12 bullets) of what changed and the top 3 actions this week.",
  weekly_narrative:
    "Write a weekly narrative report with sections: Overview, By engine, Risks, Recommended actions. Keep under ~800 words.",
  export_summary:
    "Summarize this selective export: what was included, notable movers, and 3–5 prioritized next steps.",
};

const TASK_ZH: Record<ReportAiPromptId, string> = {
  digest_brief: "写一份简短管理层摘要（不超过 12 条要点），说明变化与本周 Top 3 行动。",
  weekly_narrative:
    "写一份周报叙事，章节：总览、分引擎、风险、建议行动。全文约 800 字以内。",
  export_summary: "总结这份选择性导出：包含哪些内容、显著 movers、以及 3–5 条优先下一步。",
};

export function reportAiSystemPrompt(locale: ReportAiLocale): string {
  return locale === "zh" ? SYSTEM_ZH : SYSTEM_EN;
}

export function reportAiTaskPrompt(promptId: ReportAiPromptId, locale: ReportAiLocale): string {
  return (locale === "zh" ? TASK_ZH : TASK_EN)[promptId];
}

/** Build chat messages for any OpenAI-compatible Chat Completions API. */
export function buildReportAiMessages(req: ReportAiRequest): Array<{ role: "system" | "user"; content: string }> {
  const inventory = req.slice.meta.inventory.join("\n");
  // Cap payload size for BYOK safety — full JSON can be huge; Markdown is denser for models.
  let body = exportSliceToMarkdown(req.slice);
  const maxChars = 120_000;
  if (body.length > maxChars) {
    body = `${body.slice(0, maxChars)}\n\n…[truncated for model context]`;
  }
  const user = [
    reportAiTaskPrompt(req.promptId, req.locale),
    "",
    "Inventory:",
    inventory,
    "",
    "Export slice (Markdown):",
    body,
  ].join("\n");

  return [
    { role: "system", content: reportAiSystemPrompt(req.locale) },
    { role: "user", content: user },
  ];
}
