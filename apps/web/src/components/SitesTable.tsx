"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  matchesAnomalyPreset,
  matchesEngineFilter,
  type AnomalyPresetId,
  type EngineFilterId,
} from "@search-triad/connectors/filters";
import { AnomalyPresetBar } from "@/components/AnomalyPresetBar";
import { EngineFilterBar } from "@/components/EngineFilterBar";
import { useT } from "@/components/LocaleProvider";
import {
  SortableTh,
  compareSortValues,
  toggleSort,
  type SortState,
} from "@/components/SortableTh";
import { Delta, EngineBadge, fmt, pct } from "@/components/Stat";

export type SiteRow = {
  id: number;
  engine: string;
  host: string;
  propertyId: string;
  weekClicks: number;
  weekImpressions: number;
  clickDelta: number;
  impressionDelta: number;
  asOf: string | null;
};

type SortKey =
  | "host"
  | "engine"
  | "asOf"
  | "weekClicks"
  | "clickDelta"
  | "weekImpressions"
  | "impressionDelta"
  | "ctr";

function valueFor(row: SiteRow, key: SortKey): string | number | null {
  switch (key) {
    case "host":
      return row.host;
    case "engine":
      return row.engine;
    case "asOf":
      return row.asOf;
    case "weekClicks":
      return row.weekClicks;
    case "clickDelta":
      return row.clickDelta;
    case "weekImpressions":
      return row.weekImpressions;
    case "impressionDelta":
      return row.impressionDelta;
    case "ctr":
      return row.weekImpressions > 0 ? row.weekClicks / row.weekImpressions : 0;
  }
}

export function SitesTable({ rows }: { rows: SiteRow[] }) {
  const t = useT();
  const [preset, setPreset] = useState<AnomalyPresetId>("all");
  const [engine, setEngine] = useState<EngineFilterId>("all");
  const [windowDays, setWindowDays] = useState<"7" | "28">("7");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortState<SortKey>>({ key: "clickDelta", dir: "asc" });

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = rows.filter((r) => {
      if (!matchesEngineFilter(r.engine, engine)) return false;
      const moverLike = {
        clicks: r.weekClicks,
        impressions: r.weekImpressions,
        clickDelta: r.clickDelta,
        impressionDelta: r.impressionDelta,
      };
      if (!matchesAnomalyPreset(moverLike, preset)) return false;
      if (!needle) return true;
      return (
        r.host.toLowerCase().includes(needle) ||
        r.engine.toLowerCase().includes(needle) ||
        r.propertyId.toLowerCase().includes(needle)
      );
    });
    return [...list].sort((a, b) =>
      compareSortValues(valueFor(a, sort.key), valueFor(b, sort.key), sort.dir)
    );
  }, [rows, preset, engine, q, sort]);

  const hosts = [...new Set(filtered.map((r) => r.host))].sort();
  const sortHint = t("common_sort_hint");

  return (
    <section className="panel space-y-3 overflow-x-auto p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="block text-sm">
          {t("common_filter")}
          <input
            className="mt-1 w-full max-w-md border border-line bg-paper px-3 py-2 text-sm"
            placeholder={t("filter_sites_ph")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label={t("common_filter")}
          />
        </label>
        <label className="block text-sm">
          {t("common_window")}
          <select
            className="mt-1 block border border-line bg-paper px-3 py-2 text-sm"
            value={windowDays}
            onChange={(e) => setWindowDays(e.target.value as "7" | "28")}
            aria-label={t("common_window")}
          >
            <option value="7">{t("window_week_wow")}</option>
            <option value="28">{t("window_28d_sites")}</option>
          </select>
        </label>
      </div>
      <EngineFilterBar value={engine} onChange={setEngine} />
      <AnomalyPresetBar value={preset} onChange={setPreset} />
      <p className="text-xs text-ink/50">
        {windowDays === "28" ? t("sites_delta_note_28") : t("sites_delta_note")}
      </p>
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="text-ink/55">
          <tr>
            <SortableTh
              label={t("common_host")}
              sortKey="host"
              sort={sort}
              onSort={(k) => setSort((s) => toggleSort(s, k, "asc"))}
              title={sortHint}
            />
            <SortableTh
              label={t("common_engine")}
              sortKey="engine"
              sort={sort}
              onSort={(k) => setSort((s) => toggleSort(s, k, "asc"))}
              title={sortHint}
            />
            <SortableTh
              label={t("common_as_of")}
              sortKey="asOf"
              sort={sort}
              onSort={(k) => setSort((s) => toggleSort(s, k))}
              title={sortHint}
            />
            <SortableTh
              label={t("common_clicks")}
              sortKey="weekClicks"
              sort={sort}
              onSort={(k) => setSort((s) => toggleSort(s, k))}
              title={sortHint}
            />
            <SortableTh
              label={t("common_delta_clicks")}
              sortKey="clickDelta"
              sort={sort}
              onSort={(k) => setSort((s) => toggleSort(s, k, "asc"))}
              title={sortHint}
            />
            <SortableTh
              label={t("common_impressions")}
              sortKey="weekImpressions"
              sort={sort}
              onSort={(k) => setSort((s) => toggleSort(s, k))}
              title={sortHint}
            />
            <SortableTh
              label={t("common_delta_impr")}
              sortKey="impressionDelta"
              sort={sort}
              onSort={(k) => setSort((s) => toggleSort(s, k, "asc"))}
              title={sortHint}
            />
            <SortableTh
              label={t("common_ctr")}
              sortKey="ctr"
              sort={sort}
              onSort={(k) => setSort((s) => toggleSort(s, k))}
              title={sortHint}
            />
          </tr>
        </thead>
        <tbody>
          {filtered.map((s) => (
            <tr key={`${s.engine}-${s.id}`} className="border-t border-line/70">
              <td className="py-2">
                <Link
                  className="underline decoration-line underline-offset-2"
                  href={`/sites/${encodeURIComponent(s.host)}`}
                >
                  {s.host}
                </Link>
              </td>
              <td>
                <EngineBadge engine={s.engine} />
              </td>
              <td className="font-mono text-xs">{s.asOf || "—"}</td>
              <td className="font-mono">{fmt(s.weekClicks)}</td>
              <td>
                <Delta value={s.clickDelta} />
              </td>
              <td className="font-mono">{fmt(s.weekImpressions)}</td>
              <td>
                <Delta value={s.impressionDelta} />
              </td>
              <td className="font-mono">
                {pct(s.weekImpressions > 0 ? s.weekClicks / s.weekImpressions : 0)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && (
        <div className="space-y-2 text-sm text-ink/60">
          <p>{t("sites_empty")}</p>
          <p className="flex flex-wrap gap-3">
            <Link href="/setup" className="text-accent underline decoration-line underline-offset-2">
              {t("common_open_setup")}
            </Link>
            <Link href="/guide" className="text-ink/55 underline decoration-line underline-offset-2 hover:text-accent">
              {t("common_guide")}
            </Link>
          </p>
        </div>
      )}
      {rows.length > 0 && !filtered.length && (
        <p className="text-sm text-ink/60">{t("sites_no_match")}</p>
      )}
      <p className="text-xs text-ink/50">
        {t("sites_hosts_shown", { hosts: hosts.length, bindings: filtered.length })}
      </p>
    </section>
  );
}
