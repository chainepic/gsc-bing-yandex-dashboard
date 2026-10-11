"use client";

import { useState } from "react";
type EngineId = "gsc" | "bing" | "yandex";

type UrlInspectionResult = {
  engine: EngineId;
  url: string;
  siteUrl: string;
  ok: boolean;
  verdict: string;
  coverageState?: string | null;
  indexingState?: string | null;
  lastCrawlTime?: string | null;
  robotsTxtState?: string | null;
  pageFetchState?: string | null;
  httpStatus?: number | null;
  details: string[];
  error?: string;
};
import { ActionableError } from "@/components/ActionableError";
import { useT } from "@/components/LocaleProvider";
import { EngineBadge } from "@/components/Stat";

type Props = { host: string; defaultUrl?: string };

export function UrlInspectPanel({ host, defaultUrl }: Props) {
  const t = useT();
  const [url, setUrl] = useState(defaultUrl || `https://${host}/`);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<UrlInspectionResult[] | null>(null);

  async function runInspect() {
    setBusy(true);
    setError(null);
    setResults(null);
    try {
      const res = await fetch("/api/url-inspect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host, url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Inspection failed");
      setResults(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="url-inspect" className="panel space-y-3 p-4">
      <div>
        <h2 className="font-display text-xl">{t("url_inspect_title")}</h2>
<p className="mt-1 text-sm text-ink/60">{t("url_inspect_sub")}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          className="min-w-[240px] flex-1 border border-line bg-paper px-3 py-2 text-sm"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/page"
          aria-label="URL to inspect"
        />
        <button
          type="button"
          disabled={busy || !url.trim()}
          onClick={() => void runInspect()}
          className="border border-accent bg-accent px-4 py-2 text-sm text-paper disabled:opacity-50"
        >
          {busy ? t("url_inspect_busy") : t("url_inspect_btn")}
        </button>
      </div>

      {error && (
        <ActionableError
          title={t("url_inspect_failed")}
          message={error}
          showRetrySync
          onRetry={() => void runInspect()}
          retryLabel={t("common_retry")}
        />
      )}

      {results && (
        <div className="grid gap-3 md:grid-cols-3">
          {results.map((r) => (
            <ResultCard key={r.engine} result={r} onRetry={() => void runInspect()} />
          ))}
        </div>
      )}
    </section>
  );
}

function ResultCard({ result, onRetry }: { result: UrlInspectionResult; onRetry: () => void }) {
  const t = useT();
  if (!result.ok || result.error) {
    return (
      <ActionableError
        title={t("url_inspect_engine_failed", { engine: label(result.engine) })}
        message={result.error || t("url_inspect_unknown")}
        showRetrySync
        onRetry={onRetry}
      />
    );
  }
  return (
    <div className="border border-line/80 bg-mist/40 p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <EngineBadge engine={result.engine} />
        <span className="font-mono text-xs text-ink/55">{result.verdict}</span>
      </div>
      <ul className="mt-2 space-y-1 text-xs text-ink/70">
        {result.details.map((d) => (
          <li key={d}>{d}</li>
        ))}
        {!result.details.length && <li className="text-ink/50">{t("url_inspect_no_details")}</li>}
      </ul>
    </div>
  );
}

function label(engine: EngineId) {
  return engine === "gsc" ? "Google" : engine === "bing" ? "Bing" : "Yandex";
}
