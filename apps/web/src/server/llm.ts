import type { Recommendation } from "@search-triad/core";
import { getSettings } from "./settings";

export type LlmPolishResult = {
  id: string;
  polished: string;
  model: string;
  error?: string;
};

/**
 * Optional local LLM polish (Ollama-compatible). Never required for rules.
 * Default OFF — call only when settings.llmPolishEnabled is true.
 */
export async function polishRecommendations(
  recs: Recommendation[],
  options?: { limit?: number }
): Promise<LlmPolishResult[]> {
  const settings = getSettings();
  if (!settings.llmPolishEnabled) {
    throw new Error("Local LLM polish is disabled (Settings → Local LLM). Rules work without it.");
  }
  const base = settings.llmBaseUrl.replace(/\/$/, "");
  const model = settings.llmModel || "llama3.2";
  const slice = recs.slice(0, options?.limit ?? 8);
  const out: LlmPolishResult[] = [];

  for (const rec of slice) {
    const prompt = [
      "Rewrite this search-console recommendation as 2 short plain-English sentences for a webmaster.",
      "Do not invent metrics. Keep the host and subject. No markdown headings.",
      "",
      `Title: ${rec.title}`,
      `Summary: ${rec.summary}`,
      `Host: ${rec.host}`,
      `Severity: ${rec.severity}`,
      `Evidence: ${rec.evidence.map((e) => `${e.label}=${e.value}`).join("; ")}`,
    ].join("\n");

    try {
      const res = await fetch(`${base}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          options: { temperature: 0.2 },
        }),
        signal: AbortSignal.timeout(60_000),
      });
      const text = await res.text();
      if (!res.ok) {
        out.push({
          id: rec.id,
          polished: "",
          model,
          error: `Ollama HTTP ${res.status}: ${text.slice(0, 180)}`,
        });
        continue;
      }
      const json = JSON.parse(text) as { response?: string };
      const polished = String(json.response || "")
        .trim()
        .replace(/\n+/g, " ");
      out.push({ id: rec.id, polished: polished || rec.summary, model });
    } catch (err) {
      out.push({
        id: rec.id,
        polished: "",
        model,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return out;
}

export async function probeLlm(): Promise<{ ok: boolean; message: string }> {
  const settings = getSettings();
  const base = settings.llmBaseUrl.replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/api/tags`, { signal: AbortSignal.timeout(5_000) });
    if (!res.ok) return { ok: false, message: `HTTP ${res.status}` };
    const data = (await res.json()) as { models?: Array<{ name?: string }> };
    const names = (data.models || []).map((m) => m.name).filter(Boolean).slice(0, 8);
    return {
      ok: true,
      message: names.length ? `Reachable. Models: ${names.join(", ")}` : "Reachable (no models listed).",
    };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}
