"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DigestCopyButton } from "@/components/DigestCopyButton";
import { useLocale, useT } from "@/components/LocaleProvider";
import { SimpleMarkdown } from "@/components/SimpleMarkdown";

type IncludeState = {
  metricsDaily: boolean;
  movers: boolean;
  recommendations: boolean;
  digests: boolean;
  pageSnapshots: boolean;
};

type PromptId = "site_audit" | "export_summary" | "digest_brief" | "weekly_narrative" | "ask_advice";

export type SavedReportSummary = {
  id: number;
  createdAt: string;
  kind: "interpret" | "advice";
  promptId: string;
  hosts: string[] | "all";
  dateFrom: string;
  dateTo: string;
  model: string | null;
  markdown: string;
  parentId: number | null;
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

function hostsLabel(hosts: string[] | "all") {
  if (hosts === "all") return "all";
  return hosts.join(", ");
}

function pickInitial(reports: SavedReportSummary[]) {
  const interpret = reports.find((r) => r.kind === "interpret");
  if (!interpret) return { interpret: null as SavedReportSummary | null, advice: null as SavedReportSummary | null };
  const advice =
    reports.find((r) => r.kind === "advice" && r.parentId === interpret.id) ||
    reports.find((r) => r.kind === "advice") ||
    null;
  return { interpret, advice };
}

type Props = {
  historyDays: number;
  hosts: string[];
  reportAiConfigured: boolean;
  saveReports: boolean;
  initialReports?: SavedReportSummary[];
};

export function ExportPanel({
  historyDays,
  hosts,
  reportAiConfigured,
  saveReports,
  initialReports = [],
}: Props) {
  const t = useT();
  const locale = useLocale();
  const initial = useMemo(() => defaultRange(historyDays), [historyDays]);
  const sortedHosts = useMemo(() => [...hosts].sort((a, b) => a.localeCompare(b)), [hosts]);
  const boot = useMemo(() => pickInitial(initialReports), [initialReports]);

  const [dateFrom, setDateFrom] = useState(boot.interpret?.dateFrom || initial.dateFrom);
  const [dateTo, setDateTo] = useState(boot.interpret?.dateTo || initial.dateTo);
  const [scope, setScope] = useState<"one" | "all">(
    boot.interpret && boot.interpret.hosts !== "all" && boot.interpret.hosts.length === 1 ? "one" : boot.interpret?.hosts === "all" ? "all" : "one"
  );
  const [selectedHost, setSelectedHost] = useState(
    boot.interpret && boot.interpret.hosts !== "all" && boot.interpret.hosts[0]
      ? boot.interpret.hosts[0]
      : sortedHosts[0] || ""
  );
  const [format, setFormat] = useState<"json" | "csv" | "markdown">("markdown");
  const [include, setInclude] = useState<IncludeState>({
    metricsDaily: true,
    movers: true,
    recommendations: true,
    digests: false,
    pageSnapshots: false,
  });
  const [promptId, setPromptId] = useState<PromptId>(
    (boot.interpret?.promptId as PromptId) || "site_audit"
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [inventory, setInventory] = useState<string[]>([]);
  const [aiMarkdown, setAiMarkdown] = useState(boot.interpret?.markdown || "");
  const [adviceMarkdown, setAdviceMarkdown] = useState(boot.advice?.markdown || "");
  const [activeInterpretId, setActiveInterpretId] = useState<number | null>(boot.interpret?.id ?? null);
  const [reports, setReports] = useState<SavedReportSummary[]>(initialReports);
  const [showRaw, setShowRaw] = useState(false);

  const resolvedHosts = useMemo(() => {
    if (scope === "all") return undefined;
    return selectedHost ? [selectedHost] : undefined;
  }, [scope, selectedHost]);

  function buildBody(extra?: Record<string, unknown>) {
    return {
      dateFrom,
      dateTo,
      hosts: resolvedHosts,
      include,
      format,
      locale,
      promptId,
      ...extra,
    };
  }

  async function refreshReports() {
    const res = await fetch("/api/report-ai?list=1");
    if (!res.ok) return;
    const data = (await res.json()) as { reports?: SavedReportSummary[] };
    setReports(data.reports || []);
  }

  function loadReport(row: SavedReportSummary) {
    if (row.kind === "advice") {
      setAdviceMarkdown(row.markdown);
      if (row.parentId) {
        const parent = reports.find((r) => r.id === row.parentId);
        if (parent) {
          setAiMarkdown(parent.markdown);
          setActiveInterpretId(parent.id);
          applyHostWindow(parent);
        }
      }
      setMsg(t("export_history_saved", { id: String(row.id) }));
      return;
    }
    setAiMarkdown(row.markdown);
    setActiveInterpretId(row.id);
    applyHostWindow(row);
    const child = reports.find((r) => r.kind === "advice" && r.parentId === row.id);
    setAdviceMarkdown(child?.markdown || "");
    setMsg(t("export_history_saved", { id: String(row.id) }));
  }

  function applyHostWindow(row: SavedReportSummary) {
    setDateFrom(row.dateFrom);
    setDateTo(row.dateTo);
    if (row.hosts === "all") {
      setScope("all");
    } else if (row.hosts.length === 1) {
      setScope("one");
      setSelectedHost(row.hosts[0]!);
    } else {
      setScope("all");
    }
    if (row.promptId === "site_audit" || row.promptId === "export_summary" || row.promptId === "digest_brief" || row.promptId === "weekly_narrative") {
      setPromptId(row.promptId);
    }
  }

  async function deleteReport(id: number) {
    setBusy(true);
    try {
      const res = await fetch("/api/report-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      const data = (await res.json()) as { error?: string; reports?: SavedReportSummary[] };
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setReports(data.reports || []);
      if (activeInterpretId === id) {
        setAiMarkdown("");
        setActiveInterpretId(null);
        setAdviceMarkdown("");
      }
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function downloadExport() {
    setBusy(true);
    setMsg("");
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

  async function runAi(nextPrompt: PromptId, priorMarkdown?: string) {
    if (scope === "one" && !selectedHost) {
      setMsg(t("export_pick_host"));
      return;
    }
    setBusy(true);
    setMsg("");
    if (nextPrompt !== "ask_advice") {
      setAiMarkdown("");
      setAdviceMarkdown("");
      setActiveInterpretId(null);
    } else {
      setAdviceMarkdown("");
    }
    try {
      const res = await fetch("/api/report-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          buildBody({
            promptId: nextPrompt,
            ...(priorMarkdown ? { priorMarkdown } : {}),
            ...(nextPrompt === "ask_advice" && activeInterpretId ? { parentId: activeInterpretId } : {}),
          })
        ),
      });
      const data = (await res.json()) as {
        error?: string;
        markdown?: string;
        inventory?: string[];
        model?: string;
        savedId?: number | null;
        saveReports?: boolean;
      };
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      if (nextPrompt === "ask_advice") {
        setAdviceMarkdown(data.markdown || "");
      } else {
        setAiMarkdown(data.markdown || "");
        setPromptId(nextPrompt);
        setActiveInterpretId(typeof data.savedId === "number" ? data.savedId : null);
      }
      setInventory(data.inventory || []);
      const base = t("export_ok_ai", { model: data.model || "—" });
      if (data.savedId) {
        setMsg(`${base} · ${t("export_history_saved", { id: String(data.savedId) })}`);
        await refreshReports();
      } else if (data.saveReports === false || !saveReports) {
        setMsg(`${base} · ${t("export_history_not_saved")}`);
      } else {
        setMsg(base);
      }
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

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{t("export_scope")}</legend>
          <div className="flex flex-wrap gap-3 text-sm">
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="export-scope" checked={scope === "one"} onChange={() => setScope("one")} />
              {t("export_scope_one")}
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="export-scope" checked={scope === "all"} onChange={() => setScope("all")} />
              {t("export_scope_all")}
            </label>
          </div>
          {scope === "one" ? (
            <label className="block text-sm">
              {t("export_host_select")}
              <select
                className="mt-1 w-full max-w-md border border-line bg-paper px-3 py-2 font-mono text-sm"
                value={selectedHost}
                onChange={(e) => setSelectedHost(e.target.value)}
              >
                {!sortedHosts.length ? (
                  <option value="">{t("export_no_hosts")}</option>
                ) : (
                  sortedHosts.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))
                )}
              </select>
            </label>
          ) : (
            <p className="text-xs text-warn">{t("export_scope_all_warn")}</p>
          )}
        </fieldset>

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
            value={promptId === "ask_advice" ? "site_audit" : promptId}
            onChange={(e) => setPromptId(e.target.value as PromptId)}
          >
            <option value="site_audit">{t("export_prompt_site")}</option>
            <option value="export_summary">{t("export_prompt_summary")}</option>
            <option value="digest_brief">{t("export_prompt_brief")}</option>
            <option value="weekly_narrative">{t("export_prompt_weekly")}</option>
          </select>
          <span className="mt-1 block text-xs text-ink/45">{t("export_prompt_site_hint")}</span>
        </label>
        {!reportAiConfigured && (
          <p className="text-sm text-ink/55">
            {t("export_ai_need_key")}{" "}
            <Link href="/settings#report-ai" className="text-accent underline decoration-line underline-offset-2">
              {t("common_settings")}
            </Link>
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || !reportAiConfigured}
            onClick={() => void runAi(promptId === "ask_advice" ? "site_audit" : promptId)}
            className="bg-accent px-3 py-1.5 text-sm text-paper disabled:opacity-50"
          >
            {busy ? t("common_working") : t("export_run_ai")}
          </button>
        </div>
      </section>

      <section className="panel space-y-3 p-4">
        <h3 className="font-display text-lg">{t("export_history")}</h3>
        {!reports.length ? (
          <p className="text-sm text-ink/55">{t("export_history_empty")}</p>
        ) : (
          <ul className="divide-y divide-line/60">
            {reports.slice(0, 12).map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">
                    {row.kind === "advice" ? t("export_kind_advice") : t("export_kind_interpret")}
                    <span className="ml-2 font-mono text-xs text-ink/50">#{row.id}</span>
                  </p>
                  <p className="truncate text-xs text-ink/55">
                    {hostsLabel(row.hosts)} · {row.dateFrom}→{row.dateTo} · {row.createdAt.slice(0, 16).replace("T", " ")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => loadReport(row)}
                    className="border border-line bg-mist px-2 py-1 text-xs"
                  >
                    {t("export_history_load")}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void deleteReport(row.id)}
                    className="border border-line bg-paper px-2 py-1 text-xs text-ink/60"
                  >
                    {t("export_history_delete")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
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
        <section className="panel space-y-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-lg">{t("export_ai_result")}</h3>
            <div className="flex flex-wrap gap-2">
              <DigestCopyButton markdown={aiMarkdown} labelKey="export_copy" copiedKey="export_copied" />
              <button
                type="button"
                className="border border-line bg-paper px-2.5 py-1 text-xs"
                onClick={() => setShowRaw((v) => !v)}
              >
                {showRaw ? t("export_view_rendered") : t("export_view_raw")}
              </button>
              <button
                type="button"
                disabled={busy || !reportAiConfigured}
                onClick={() => void runAi("ask_advice", aiMarkdown)}
                className="border border-accent/40 bg-accent/10 px-2.5 py-1 text-xs text-accent disabled:opacity-50"
              >
                {busy ? t("common_working") : t("export_ask_advice")}
              </button>
            </div>
          </div>
          <p className="text-sm text-ink/55">{t("export_ask_advice_hint")}</p>
          {showRaw ? (
            <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap border border-line/60 bg-mist/20 p-3 font-mono text-xs leading-relaxed text-ink/80">
              {aiMarkdown}
            </pre>
          ) : (
            <SimpleMarkdown source={aiMarkdown} />
          )}
        </section>
      )}

      {adviceMarkdown && (
        <section className="panel space-y-3 border-accent/30 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-lg">{t("export_advice_result")}</h3>
            <DigestCopyButton markdown={adviceMarkdown} labelKey="export_copy" copiedKey="export_copied" />
          </div>
          <p className="text-sm text-ink/55">{t("export_advice_result_hint")}</p>
          {showRaw ? (
            <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap border border-line/60 bg-mist/20 p-3 font-mono text-xs leading-relaxed text-ink/80">
              {adviceMarkdown}
            </pre>
          ) : (
            <SimpleMarkdown source={adviceMarkdown} />
          )}
        </section>
      )}
    </div>
  );
}
