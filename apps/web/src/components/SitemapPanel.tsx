"use client";

import { useCallback, useEffect, useState } from "react";
type EngineId = "gsc" | "bing" | "yandex";

type SitemapEntry = {
  engine: EngineId;
  path: string;
  lastSubmitted?: string | null;
  lastDownloaded?: string | null;
  isPending?: boolean;
  isSitemapsIndex?: boolean;
  warnings?: number | null;
  errors?: number | null;
  urlCount?: number | null;
  status?: string | null;
  contents?: string | null;
};
import { ActionableError } from "@/components/ActionableError";
import { useT } from "@/components/LocaleProvider";
import { EngineBadge, fmt } from "@/components/Stat";

type Props = { host: string };

export function SitemapPanel({ host }: Props) {
  const t = useT();
  const [entries, setEntries] = useState<SitemapEntry[]>([]);
  const [errors, setErrors] = useState<Array<{ engine: EngineId; message: string }>>([]);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/sitemaps?host=${encodeURIComponent(host)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load sitemaps");
      setEntries(data.entries || []);
      setErrors(data.errors || []);
      setLoaded(true);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, [host]);

  useEffect(() => {
    // Lazy: only fetch when panel mounts (site detail).
    void load();
  }, [load]);

  return (
    <section className="panel space-y-3 p-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-xl">{t("sitemap_title")}</h2>
          <p className="mt-1 text-sm text-ink/60">{t("sitemap_sub")}</p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void load()}
          className="border border-line bg-mist px-3 py-1.5 text-sm disabled:opacity-50"
        >
          {busy ? t("sitemap_loading") : t("common_refresh")}
        </button>
      </div>

      {loadError && (
        <ActionableError
          title={t("sitemap_failed")}
          message={loadError}
          showRetrySync
          onRetry={() => void load()}
          retryLabel={t("common_retry")}
        />
      )}

      {errors.map((e) => (
        <ActionableError
          key={e.engine}
          title={t("sitemap_engine_failed", { engine: e.engine.toUpperCase() })}
          message={e.message}
          showRetrySync
          onRetry={() => void load()}
        />
      ))}

      {loaded && !entries.length && !loadError && !errors.length && (
        <p className="text-sm text-ink/55">{t("sitemap_empty")}</p>
      )}

      {entries.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-ink/55">
              <tr>
                <th className="pb-2 font-medium">{t("common_engine")}</th>
                <th className="pb-2 font-medium">{t("common_path")}</th>
                <th className="pb-2 font-medium">{t("common_status")}</th>
                <th className="pb-2 font-medium">{t("common_urls")}</th>
                <th className="pb-2 font-medium">{t("common_errors")}</th>
                <th className="pb-2 font-medium">{t("common_last_fetch")}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((s, i) => (
                <tr key={`${s.engine}-${s.path}-${i}`} className="border-t border-line/70">
                  <td className="py-2">
                    <EngineBadge engine={s.engine} />
                  </td>
                  <td className="max-w-[320px] truncate py-2" title={s.path}>
                    {s.path || "—"}
                  </td>
                  <td className="py-2 font-mono text-xs">{s.status || "—"}</td>
                  <td className="py-2 font-mono">{s.urlCount != null ? fmt(s.urlCount) : "—"}</td>
                  <td className="py-2 font-mono">{s.errors != null ? fmt(s.errors) : "—"}</td>
                  <td className="py-2 font-mono text-xs">{s.lastDownloaded || s.lastSubmitted || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
