"use client";

import { EngineBadge, fmt } from "@/components/Stat";
import { useT } from "@/components/LocaleProvider";

export type HostMetaRow = {
  engine: string;
  updatedAt: string;
  meta: Record<string, unknown>;
};

export function HostMetaCard({ rows }: { rows: HostMetaRow[] }) {
  const t = useT();
  const yandex = rows.find((r) => r.engine === "yandex");
  if (!rows.length) return null;

  const sqi = yandex?.meta?.sqi;
  const searchable = yandex?.meta?.searchablePages;
  const excluded = yandex?.meta?.excludedPages;

  return (
    <section className="panel p-4">
      <h2 className="font-display text-xl">{t("host_meta_title")}</h2>
      <p className="mt-1 text-sm text-ink/60">{t("host_meta_sub")}</p>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        {rows.map((r) => (
          <div key={r.engine} className="border border-line/70 bg-mist/30 p-3 text-sm">
            <EngineBadge engine={r.engine} />
            {r.engine === "yandex" ? (
              <dl className="mt-2 space-y-1 font-mono text-xs text-ink/70">
                <div className="flex justify-between gap-2">
                  <dt>SQI</dt>
                  <dd>{sqi != null ? String(sqi) : "—"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>{t("host_meta_searchable")}</dt>
                  <dd>{searchable != null ? fmt(Number(searchable)) : "—"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>{t("host_meta_excluded")}</dt>
                  <dd>{excluded != null ? fmt(Number(excluded)) : "—"}</dd>
                </div>
                <p className="pt-1 text-[11px] text-ink/45">{t("host_meta_updated", { at: r.updatedAt })}</p>
              </dl>
            ) : (
              <p className="mt-2 text-xs text-ink/50">{t("host_meta_none")}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
