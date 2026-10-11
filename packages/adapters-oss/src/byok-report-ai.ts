import {
  buildReportAiMessages,
  type ReportAiProvider,
  type ReportAiRequest,
  type ReportAiResult,
} from "@search-triad/core";

export type ByokReportAiConfig = {
  /** OpenAI-compatible base, e.g. https://api.openai.com/v1 or http://127.0.0.1:11434/v1 */
  baseUrl: string;
  apiKey: string;
  model: string;
  /** Optional fetch override (tests). */
  fetchImpl?: typeof fetch;
};

/**
 * User-paid LLM via any Chat Completions–compatible endpoint.
 * Never talks to Chainepic billing.
 */
export class ByokReportAiProvider implements ReportAiProvider {
  readonly id = "byok" as const;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly fetchImpl: typeof fetch;

  constructor(config: ByokReportAiConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.apiKey = config.apiKey.trim();
    this.model = config.model.trim() || "gpt-4o-mini";
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.baseUrl);
  }

  async interpret(req: ReportAiRequest): Promise<ReportAiResult> {
    if (!this.isConfigured()) {
      throw new Error("BYOK Report AI is missing base URL or API key.");
    }
    const messages = buildReportAiMessages(req);
    const url = `${this.baseUrl}/chat/completions`;
    const res = await this.fetchImpl(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.2,
        messages,
      }),
      signal: AbortSignal.timeout(120_000),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`BYOK LLM HTTP ${res.status}: ${text.slice(0, 240)}`);
    }
    let json: {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
      model?: string;
    };
    try {
      json = JSON.parse(text) as typeof json;
    } catch {
      throw new Error(`BYOK LLM returned non-JSON: ${text.slice(0, 180)}`);
    }
    const markdown = String(json.choices?.[0]?.message?.content || "").trim();
    if (!markdown) {
      throw new Error("BYOK LLM returned an empty completion.");
    }
    return {
      markdown,
      model: json.model || this.model,
      providerId: this.id,
      usage: {
        inputTokens: json.usage?.prompt_tokens,
        outputTokens: json.usage?.completion_tokens,
      },
    };
  }
}
