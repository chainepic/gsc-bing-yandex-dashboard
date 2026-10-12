import type { ReportAiLocale, ReportAiPromptId, ReportAiRequest } from "../ports/report-ai.js";
import { exportSliceToMarkdown } from "../ports/export-slice.js";

const FORMAT_EN = `
Output format (strict):
- Markdown only. No HTML, no code fences wrapping the whole answer.
- Use ## and ### headings exactly as requested. Short paragraphs (2–4 lines).
- Prefer numbered lists and short bullets. Avoid dense tables.
- Every action must cite evidence: host / engine / query-or-page / delta.
- If evidence is missing, write "insufficient data" — never invent numbers.
- Write for a human reading on a phone: scannable, not a dump of metrics.`;

const FORMAT_ZH = `
输出格式（必须遵守）：
- 只用 Markdown。不要 HTML，不要用代码块包住全文。
- 按要求使用 ## / ### 标题。段落短（2–4 行）。
- 优先用编号列表与短 bullet，少用大表格。
- 每条行动必须带证据：站点 / 引擎 / 词或页 / 增减幅度。
- 证据不足时写「数据不足」，禁止编造数字。
- 面向人阅读（手机也能扫）：可扫读，不要指标堆砌。`;

const SYSTEM_EN = `You are an SEO analyst for a self-hosted GSC · Bing · Yandex dashboard (Search Triad).
Rules:
- Use ONLY the export slice (and prior report if provided). Do not invent metrics, URLs, or engines.
- Prefer one host at a time. If multiple hosts are present, separate them clearly — never mash findings together.
- Do not ask for API keys or credentials.
${FORMAT_EN}`;

const SYSTEM_ZH = `你是自托管「GSC · Bing · Yandex」面板（Search Triad）的 SEO 分析助手。
规则：
- 只根据导出切片（以及用户提供的上一份解读）作答，禁止编造指标、URL 或引擎数据。
- 优先单站分析。若切片含多站，必须分站写清，禁止混在一起。
- 不要索取 API Key 或凭证。
${FORMAT_ZH}`;

const TASK_EN: Record<ReportAiPromptId, string> = {
  site_audit: `Write a single-site SEO audit for the host(s) in this slice.

Required sections (use these ## headings):
## Snapshot
3–5 lines: what happened in the date range (clicks / impressions / CTR direction) by engine.
## What's working
2–5 bullets with evidence.
## What's slipping
2–5 bullets with evidence (largest absolute deltas first).
## Priority actions (this week)
Exactly 3–5 numbered actions. Each: what to do · why (evidence) · how to verify.
## Watch / unclear
Gaps, missing engines, or noisy data.

Keep under ~650 words. One host focus if the slice is single-host.`,

  export_summary: `Summarize this selective export for a human reader.

Required sections:
## Included
What hosts / tables / date range are in the slice (1 short paragraph).
## Stand-outs
Up to 6 bullets of notable movers (largest deltas), each with host + engine.
## Priority next steps
3–5 numbered actions with evidence.
## Gaps
What is missing or unreliable.

Keep under ~500 words.`,

  digest_brief: `Write an executive brief.

Required sections:
## In one minute
≤5 bullets of what changed.
## Top 3 actions
Numbered. Each with evidence and owner-ready wording.
## Risks
≤3 bullets.

Total ≤250 words.`,

  weekly_narrative: `Write a weekly narrative.

Required sections:
## Overview
## By engine
## Risks
## Recommended actions

Under ~700 words. Separate hosts if multiple.`,

  ask_advice: `You are drafting an optimization strategy based on the PRIOR INTERPRETATION below (and the export slice for numbers).

Required sections (use these ## headings):
## Goal (2 weeks)
One clear outcome sentence + 1–2 success metrics.
## Do this week (P0)
3–5 numbered actions. Each: action · owner hint · evidence link · expected signal in 7 days.
## Do this month (P1)
3–5 numbered actions (heavier / content / technical).
## Explicitly skip
2–4 things NOT to do now (and why).
## Measurement plan
How to check progress in this dashboard (which engine / host / mover type).

Be concrete and ruthless about prioritization. No generic SEO advice.
Under ~700 words.`,
};

const TASK_ZH: Record<ReportAiPromptId, string> = {
  site_audit: `针对本切片中的站点写一份「单站 SEO 审计」（若仅一站，全文只谈该站）。

必须使用这些 ## 标题：
## 快照
3–5 行：日期范围内各引擎点击 / 展示 / CTR 方向。
## 在变好的
2–5 条 bullet，带证据。
## 在变差的
2–5 条 bullet，带证据（绝对值下降优先）。
## 本周优先行动
恰好 3–5 条编号行动。每条：做什么 · 为什么（证据） · 如何验证。
## 需观察 / 数据不清
缺口、缺引擎、噪音数据。

全文约 650 字以内。`,

  export_summary: `用适合人阅读的方式总结这份选择性导出。

必须章节：
## 本次包含
站点 / 表格 / 日期范围（一段话）。
## 显著变化
最多 6 条 bullet（最大增减优先），每条含站点 + 引擎。
## 优先下一步
3–5 条编号行动，带证据。
## 缺口
缺失或不可靠之处。

约 500 字以内。`,

  digest_brief: `写管理层一分钟摘要。

必须章节：
## 一分钟看懂
≤5 条变化要点。
## Top 3 行动
编号；每条带证据、可直接派活。
## 风险
≤3 条。

全文 ≤250 字。`,

  weekly_narrative: `写周报叙事。

必须章节：
## 总览
## 分引擎
## 风险
## 建议行动

约 700 字以内。多站必须分开写。`,

  ask_advice: `根据下方「上一份解读」以及导出切片中的数字，制定一份可执行的优化策略。

必须使用这些 ## 标题：
## 两周目标
一句结果 + 1–2 个成功指标。
## 本周必做（P0）
3–5 条编号。每条：行动 · 建议负责人角色 · 证据 · 7 天内可观察信号。
## 本月可做（P1）
3–5 条（更重的内容 / 技术项）。
## 明确不做
2–4 条现在不要做的事（及原因）。
## 如何验收
在本面板里怎么盯（哪个引擎 / 站点 / 变动类型）。

要具体、敢取舍，禁止空泛 SEO 套话。约 700 字以内。`,
};

export function reportAiSystemPrompt(locale: ReportAiLocale): string {
  return locale === "zh" ? SYSTEM_ZH : SYSTEM_EN;
}

export function reportAiTaskPrompt(promptId: ReportAiPromptId, locale: ReportAiLocale): string {
  return (locale === "zh" ? TASK_ZH : TASK_EN)[promptId];
}

function truncateMarkdown(body: string, maxChars = 100_000): string {
  if (body.length <= maxChars) return body;
  return `${body.slice(0, maxChars)}\n\n…[truncated for model context]`;
}

/** Build chat messages for any OpenAI-compatible Chat Completions API. */
export function buildReportAiMessages(req: ReportAiRequest): Array<{ role: "system" | "user"; content: string }> {
  const inventory = req.slice.meta.inventory.join("\n") || "(empty)";
  const hostsLabel =
    req.slice.meta.hosts === "all"
      ? "all hosts"
      : Array.isArray(req.slice.meta.hosts)
        ? req.slice.meta.hosts.join(", ")
        : String(req.slice.meta.hosts);
  const body = truncateMarkdown(exportSliceToMarkdown(req.slice));

  const parts: string[] = [
    reportAiTaskPrompt(req.promptId, req.locale),
    "",
    `Focus hosts: ${hostsLabel}`,
    `Date range: ${req.slice.meta.dateFrom} → ${req.slice.meta.dateTo}`,
    "",
    "Inventory:",
    inventory,
  ];

  if (req.promptId === "ask_advice") {
    const prior = (req.priorMarkdown || "").trim();
    parts.push(
      "",
      "PRIOR INTERPRETATION (optimize from this — do not rewrite it wholesale):",
      prior || "(missing — infer carefully from the slice only)"
    );
  }

  parts.push("", "Export slice (Markdown):", body);

  return [
    { role: "system", content: reportAiSystemPrompt(req.locale) },
    { role: "user", content: parts.join("\n") },
  ];
}
