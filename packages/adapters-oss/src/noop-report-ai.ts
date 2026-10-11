import type { ReportAiProvider, ReportAiRequest, ReportAiResult } from "@search-triad/core";

/** Default when no API key is configured — panel stays fully usable. */
export class NoopReportAiProvider implements ReportAiProvider {
  readonly id = "noop" as const;

  isConfigured(): boolean {
    return false;
  }

  async interpret(_req: ReportAiRequest): Promise<ReportAiResult> {
    throw new Error(
      "Report AI is not configured. Add your own API key in Settings → Report AI (BYOK), or export the slice without AI."
    );
  }
}
