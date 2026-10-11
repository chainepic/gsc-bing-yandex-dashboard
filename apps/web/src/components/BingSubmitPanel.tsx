"use client";

import { useCallback, useEffect, useState } from "react";
import { ActionableError } from "@/components/ActionableError";
import { useT } from "@/components/LocaleProvider";

type Props = { host: string; enabled: boolean };

export function BingSubmitPanel({ host, enabled }: Props) {
  const t = useT();
  const [url, setUrl] = useState(`https://${host}/`);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [log, setLog] = useState<Array<{ id: number; createdAt: string; detailJson: string | null }>>([]);

  const load = useCallback(async () => {
    const res = await fetch("/api/bing/submit-url");
    const data = await res.json();
    if (res.ok) setLog(data.log || []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!enabled) {
    return (
      <section className="panel p-4 text-sm text-ink/60">
        <h2 className="font-display text-xl text-ink">{t("bing_submit_title")}</h2>
<p className="mt-2">{t("bing_submit_disabled")}</p>
      </section>
    );
  }

  async function submit() {
    if (!confirm) {
      setError(t("bing_submit_need_confirm"));
      return;
    }
    setBusy(true);
    setError(null);
    setMsg("");
    try {
      const res = await fetch("/api/bing/submit-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host, url: url.trim(), confirmToken: "SUBMIT" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submit failed");
      setMsg(t("bing_submit_ok", { url: data.url }));
      setConfirm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel space-y-3 p-4">
      <div>
        <h2 className="font-display text-xl">{t("bing_submit_title")}</h2>
<p className="mt-1 text-sm text-ink/60">{t("bing_submit_sub")}</p>
      </div>
      <input
        className="w-full border border-line bg-paper px-3 py-2 text-sm"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        aria-label="URL to submit to Bing"
      />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />
        {t("bing_submit_confirm")}
      </label>
      <button
        type="button"
        disabled={busy || !url.trim()}
        onClick={() => void submit()}
        className="border border-warn/50 bg-mist px-3 py-1.5 text-sm disabled:opacity-50"
      >
        {busy ? t("bing_submit_busy") : t("bing_submit_btn")}
      </button>
      {msg && <p className="text-sm text-[color:var(--ok)]">{msg}</p>}
      {error && (
        <ActionableError title={t("bing_submit_failed")} message={error} showSettings onRetry={() => void submit()} />
      )}
      {log.length > 0 && (
        <ul className="space-y-1 font-mono text-xs text-ink/55">
          {log.slice(0, 8).map((row) => (
            <li key={row.id}>
              #{row.id} {row.createdAt} — {row.detailJson?.slice(0, 120)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
