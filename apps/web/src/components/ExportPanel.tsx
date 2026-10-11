"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLocale, useT } from "@/components/LocaleProvider";

type IncludeState = {
  metricsDaily: boolean;
  movers: boolean;
  recommendations: boolean;
  digests: boolean;
  pageSnapshots: boolean;
};

function defaultRange(days: number) {
  const to = new Date();
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - days);
  return {
    dateFrom: from.toISOString().slice(0, 10),
    dateTo: to.toISOString().slice(0, 10),
  };
}

type Props = {
  historyDays: number;
  hosts: string[];
  reportAiConfigured: boolean;
};

export function ExportPanel({ historyDays, hosts, reportAiConfigured }: Props) {
  const t = useT();
  const locale = useLocale();
  const initial = useMemo(() => defaultRange(historyDays), [historyDays]);
  const [dateFrom, setDateFrom] = useState(initial.dateFrom);
  const [dateTo, setDateTo] = useState(initial.dateTo);
  const [hostText, setHostText] = useState("");
  const [format, setFormat] = useState<"json" | "csv" | "markdown">("markdown");
  const [include, setInclude] = useState<IncludeState>({
    metricsDaily: true,
    movers: true,
    recommendations: true,
    digests: true,
    pageSnapshots: false,
  });
  const [promptId, setPromptId] = useState<"export_summary" | "digest_brief" | "weekly_narrative">(
    "export_summary"
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [inventory, setInventory] = useState<string[]>([]);
  const [aiMarkdown, setAiMarkdown] = useState("");

  function buildBody(extra?: Record<string, unknown>) {
    const hostsList = hostText
      .split(/[\s,]+/)
      .map((h) => h.trim())
      .filter(Boolean);
    return {
      dateFrom,
      dateTo,
      hosts: hostsList.length ? hostsList : undefined,
      include,
      format,
      locale,
      promptId,
      ...extra,
    };
  }

  async function downloadExport() {
    setBusy(true);
    setMsg("");
    setAiMarkdown("");
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody({ download: true })),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") || "";
      const match = /filename="([^"]+)"/.exec(cd);
      const filename = match?.[1] || `search-triad-export.${format === "markdown" ? "md" : format}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setMsg(t("export_ok_download"));
      // refresh inventory via non-download call
      const preview = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody({ download: false })),
      });
      const pj = (await preview.json()) as { meta?: { inventory?: string[] } };
      setInventory(pj.meta?.inventory || []);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function runAi() {
    setBusy(true);
    setMsg("");
    setAiMarkdown("");
    try {
      const res = await fetch("/api/report-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody()),
      });
      const data = (await res.json()) as {
        error?: string;
        markdown?: string;
        inventory?: string[];
        model?: string;
      };
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setAiMarkdown(data.markdown || "");
      setInventory(data.inventory || []);
      setMsg(t("export_ok_ai", { model: data.model || "—" }));
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const includeKeys = Object.keys(include) as Array<keyof IncludeState>;

  return (
    <div className="space-y-6">
      <section className="panel space-y-4 p-4">
        <div>
          <h2 className="font-display text-xl">{t("export_slice_title")}</h2>
          <p className="mt-1 text-sm text-ink/60">{t("export_slice_body")}</p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="block text-sm">
            {t("export_date_from")}
            <input
              type="date"
              className="mt-1 w-full border border-line bg-paper px-3 py-2"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            {t("export_date_to")}
            <input
              type="date"
              className="mt-1 w-full border border-line bg-paper px-3 py-2"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </label>
        </div>

        <label className="block text-sm">
          {t("export_hosts")}
          <input
            className="mt-1 w-full border border-line bg-paper px-3 py-2 font-mono text-sm"
            placeholder={hosts.slice(0, 3).join(", ") || "example.com"}
            value={hostText}
            onChange={(e) => setHostText(e.target.value)}
          />
          <span className="mt-1 block text-xs text-ink/45">{t("export_hosts_hint")}</span>
        </label>

        <div>
          <p className="text-sm font-medium">{t("export_include")}</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {includeKeys.map((key) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={include[key]}
                  onChange={(e) => setInclude({ ...include, [key]: e.target.checked })}
                />
                {t(`export_inc_${key}` as "export_inc_metricsDaily")}
              </label>
            ))}
          </div>
        </div>

        <label className="block text-sm">
          {t("export_format")}
          <select
            className="mt-1 border border-line bg-paper px-3 py-2"
            value={format}
            onChange={(e) => setFormat(e.target.value as typeof format)}
          >
            <option value="markdown">Markdown</option>
            <option value="json">JSON</option>
            <option value="csv">CSV</option>
          </select>
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void downloadExport()}
            className="border border-line bg-mist px-3 py-1.5 text-sm disabled:opacity-50"
          >
            {busy ? t("common_working") : t("export_download")}
          </button>
        </div>
      </section>

      <section className="panel space-y-4 p-4">
        <div>
          <h2 className="font-display text-xl">{t("export_ai_title")}</h2>
          <p className="mt-1 text-sm text-ink/60">{t("export_ai_body")}</p>
        </div>
        <label className="block text-sm">
          {t("export_prompt")}
          <select
            className="mt-1 w-full max-w-md border border-line bg-paper px-3 py-2"
            value={promptId}
            onChange={(e) => setPromptId(e.target.value as typeof promptId)}
          >
            <option value="export_summary">{t("export_prompt_summary")}</option>
            <option value="digest_brief">{t("export_prompt_brief")}</option>
            <option value="weekly_narrative">{t("export_prompt_weekly")}</option>
          </select>
        </label>
        {!reportAiConfigured && (
          <p className="text-sm text-ink/55">
            {t("export_ai_need_key")}{" "}
            <Link href="/settings" className="text-accent underline decoration-line underline-offset-2">
              {t("common_settings")}
            </Link>
          </p>
        )}
        <button
          type="button"
          disabled={busy || !reportAiConfigured}
          onClick={() => void runAi()}
          className="border border-line bg-mist px-3 py-1.5 text-sm disabled:opacity-50"
        >
          {busy ? t("common_working") : t("export_run_ai")}
        </button>
      </section>

      {msg && <p className="text-sm text-ink/65">{msg}</p>}

      {inventory.length > 0 && (
        <section className="panel p-4">
          <h3 className="font-display text-lg">{t("export_inventory")}</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 font-mono text-xs text-ink/70">
            {inventory.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      )}

      {aiMarkdown && (
        <section className="panel p-4">
          <h3 className="font-display text-lg">{t("export_ai_result")}</h3>
          <pre className="mt-3 max-h-[32rem] overflow-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-ink/80">
            {aiMarkdown}
          </pre>
        </section>
      )}
    </div>
  );
}
