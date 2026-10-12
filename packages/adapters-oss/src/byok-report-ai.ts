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

  /** Minimal round-trip to verify base URL + key + model before full interpret. */
  async ping(): Promise<{ model: string; reply: string }> {
    if (!this.isConfigured()) {
      throw new Error("BYOK Report AI is missing base URL or API key.");
    }
    const json = await this.chatCompletions({
      model: this.model,
      temperature: 0,
      max_tokens: 16,
      messages: [{ role: "user", content: "Reply with exactly: OK" }],
      timeoutMs: 30_000,
    });
    const reply = String(json.choices?.[0]?.message?.content || "").trim();
    if (!reply) {
      throw new Error("BYOK LLM returned an empty completion.");
    }
    return { model: json.model || this.model, reply };
  }

  async interpret(req: ReportAiRequest): Promise<ReportAiResult> {
    if (!this.isConfigured()) {
      throw new Error("BYOK Report AI is missing base URL or API key.");
    }
    const messages = buildReportAiMessages(req);
    const json = await this.chatCompletions({
      model: this.model,
      temperature: 0.2,
      messages,
      timeoutMs: 120_000,
    });
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

  private async chatCompletions(body: {
    model: string;
    temperature: number;
    messages: unknown[];
    max_tokens?: number;
    timeoutMs: number;
  }) {
    const url = `${this.baseUrl}/chat/completions`;
    const payload: Record<string, unknown> = {
      model: body.model,
      temperature: body.temperature,
      messages: body.messages,
    };
    if (body.max_tokens != null) payload.max_tokens = body.max_tokens;
    const res = await this.fetchImpl(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(body.timeoutMs),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`BYOK LLM HTTP ${res.status}: ${text.slice(0, 240)}`);
    }
    try {
      return JSON.parse(text) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
        model?: string;
      };
    } catch {
      throw new Error(`BYOK LLM returned non-JSON: ${text.slice(0, 180)}`);
    }
  }
}
