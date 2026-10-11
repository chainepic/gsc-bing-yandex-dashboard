"use client";

import { useState } from "react";
import Link from "next/link";
import { ActionableError } from "@/components/ActionableError";
import { useT } from "@/components/LocaleProvider";
import { EngineBadge } from "@/components/Stat";

type BatchRow = {
  url: string;
  host: string | null;
  ok: boolean;
  error?: string;
  results?: Array<{
    engine: string;
    ok: boolean;
    verdict: string;
    details: string[];
    error?: string;
  }>;
};

export default function InspectPage() {
  const t = useT();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<BatchRow[] | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    setRows(null);
    const urls = text
      .split(/[\n,\s]+/)
      .map((u) => u.trim())
      .filter(Boolean);
    try {
      const res = await fetch("/api/inspect/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("inspect_failed"));
      setRows(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="font-display text-2xl">{t("inspect_title")}</h1>
        <p className="mt-1 text-sm text-ink/65">{t("inspect_sub")}</p>
      </section>
      <section className="panel space-y-3 p-4">
        <textarea
          className="min-h-[140px] w-full border border-line bg-paper px-3 py-2 font-mono text-sm"
          placeholder={"https://example.com/a\nhttps://example.com/b"}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          type="button"
          disabled={busy || !text.trim()}
          onClick={() => void run()}
          className="border border-accent bg-accent px-4 py-2 text-sm text-paper disabled:opacity-50"
        >
          {busy ? t("inspect_running") : t("inspect_run")}
        </button>
        {error && (
          <ActionableError title={t("inspect_failed")} message={error} showGuide onRetry={() => void run()} />
        )}
      </section>
      {rows && (
        <section className="space-y-3">
          {rows.map((r) => (
            <article key={r.url} className="panel space-y-2 p-4 text-sm">
              <p className="font-mono text-xs break-all">{r.url}</p>
              {!r.ok && <p className="text-[color:var(--warn)]">{r.error}</p>}
              {r.host && (
                <Link
                  href={`/sites/${encodeURIComponent(r.host)}`}
                  className="text-accent underline decoration-line underline-offset-2"
                >
                  {r.host}
                </Link>
              )}
              <div className="grid gap-2 md:grid-cols-3">
                {(r.results || []).map((eng) => (
                  <div key={eng.engine} className="border border-line/70 bg-mist/30 p-2 text-xs">
                    <EngineBadge engine={eng.engine} />
                    <p className="mt-1 font-mono">{eng.ok ? eng.verdict : eng.error || t("common_error")}</p>
                    <ul className="mt-1 space-y-0.5 text-ink/60">
                      {(eng.details || []).slice(0, 4).map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
