"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionableError } from "@/components/ActionableError";
import { useT } from "@/components/LocaleProvider";
import { Delta, fmt } from "@/components/Stat";

type Issue = { id: string; severity: string; message: string };

type Snapshot = {
  url: string;
  fetchedAt: string;
  statusCode: number | null;
  title: string | null;
  metaDescription: string | null;
  h1: string | null;
  canonical: string | null;
  robotsMeta: string | null;
  issues: Issue[];
  error: string | null;
};

type Candidate = {
  url: string;
  clickDelta: number;
  impressionDelta: number;
  clicks: number;
  impressions: number;
  engine: string;
};

type Props = { host: string };

export function OnPageAuditPanel({ host }: Props) {
  const t = useT();
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [extraUrl, setExtraUrl] = useState(`https://${host}/`);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/crawl?host=${encodeURIComponent(host)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setCandidates(data.candidates || []);
      setSnapshots(data.snapshots || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [host]);

  useEffect(() => {
    void load();
  }, [load]);

  async function crawlDropping() {
    setBusy(true);
    setError(null);
    setMsg("");
    try {
      const res = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host, mode: "dropping" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Crawl failed");
      setMsg(t("onpage_crawled", { n: data.crawled, limit: data.limit, concurrency: data.concurrency }));
      await load();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function crawlOne() {
    setBusy(true);
    setError(null);
    setMsg("");
    try {
      const res = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "one", url: extraUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Crawl failed");
      setMsg(t("onpage_fetched", { url: data.result?.url || extraUrl }));
      await load();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="onpage-audit" className="panel space-y-4 p-4">
      <div>
        <h2 className="font-display text-xl">{t("onpage_title")}</h2>
<p className="mt-1 text-sm text-ink/60">{t("onpage_sub")}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || !candidates.length}
          onClick={() => void crawlDropping()}
          className="border border-accent bg-accent px-3 py-1.5 text-sm text-paper disabled:opacity-50"
        >
          {busy ? t("onpage_crawling") : t("onpage_audit_n", { n: candidates.length })}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void load()}
          className="border border-line bg-mist px-3 py-1.5 text-sm disabled:opacity-50"
        >
          {t("common_refresh")}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          className="min-w-[240px] flex-1 border border-line bg-paper px-3 py-2 text-sm"
          value={extraUrl}
          onChange={(e) => setExtraUrl(e.target.value)}
          placeholder={`https://${host}/path`}
          aria-label="URL to audit"
        />
        <button
          type="button"
          disabled={busy || !extraUrl.trim()}
          onClick={() => void crawlOne()}
          className="border border-line bg-mist px-3 py-1.5 text-sm disabled:opacity-50"
        >
          Audit URL
        </button>
      </div>

      {msg && <p className="text-sm text-ink/65">{msg}</p>}
      {error && (
        <ActionableError
          title={t("onpage_failed")}
          message={error}
          showSettings
          onRetry={() => void crawlDropping()}
          retryLabel={t("onpage_retry")}
        />
      )}

      {candidates.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-ink/70">{t("onpage_candidates")}</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {candidates.slice(0, 12).map((c) => (
              <li key={c.url} className="flex flex-wrap justify-between gap-2 border-b border-line/40 py-1">
                <span className="max-w-[70%] truncate font-mono text-xs" title={c.url}>
                  {c.url}
                </span>
                <span className="font-mono text-xs">
                  {fmt(c.clicks)} <Delta value={c.clickDelta} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {!candidates.length && (
        <p className="text-sm text-ink/55">{t("onpage_no_candidates")}</p>
      )}

      {snapshots.length > 0 && (
        <div className="overflow-x-auto">
          <h3 className="text-sm font-medium text-ink/70">{t("onpage_snapshots")}</h3>
          <table className="mt-2 w-full min-w-[720px] text-left text-sm">
            <thead className="text-ink/55">
              <tr>
                <th className="pb-2 font-medium">{t("common_page")}</th>
                <th className="pb-2 font-medium">{t("common_http")}</th>
                <th className="pb-2 font-medium">{t("common_title")}</th>
                <th className="pb-2 font-medium">{t("common_issues")}</th>
              </tr>
            </thead>
            <tbody>
              {snapshots.map((s) => (
                <tr key={s.url} className="border-t border-line/70 align-top">
                  <td className="max-w-[240px] truncate py-2 font-mono text-xs" title={s.url}>
                    {s.url}
                  </td>
                  <td className="py-2 font-mono text-xs">{s.statusCode ?? "—"}</td>
                  <td className="max-w-[200px] truncate py-2 text-xs" title={s.title || ""}>
                    {s.title || s.error || "—"}
                  </td>
                  <td className="py-2 text-xs text-ink/70">
                    {s.issues.length
                      ? s.issues.map((i) => i.message).join("; ")
                      : s.error || "OK"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
