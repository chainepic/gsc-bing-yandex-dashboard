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

export type KeywordRow = {
  id: number;
  query: string;
  engine: string;
  host: string;
  clicks: number;
  clickDelta: number;
  impressions: number;
  impressionDelta: number;
  position: number | null;
  ctr: number;
};

type SortKey =
  | "query"
  | "engine"
  | "host"
  | "clicks"
  | "clickDelta"
  | "impressions"
  | "impressionDelta"
  | "ctr"
  | "position";

function valueFor(row: KeywordRow, key: SortKey): string | number | null {
  switch (key) {
    case "query":
      return row.query;
    case "engine":
      return row.engine;
    case "host":
      return row.host;
    case "clicks":
      return row.clicks;
    case "clickDelta":
      return row.clickDelta;
    case "impressions":
      return row.impressions;
    case "impressionDelta":
      return row.impressionDelta;
    case "ctr":
      return row.ctr;
    case "position":
      return row.position;
  }
}

export function KeywordTable({ rows }: { rows: KeywordRow[] }) {
  const t = useT();
  const [q, setQ] = useState("");
  const [preset, setPreset] = useState<AnomalyPresetId>("all");
  const [engine, setEngine] = useState<EngineFilterId>("all");
  const [windowDays, setWindowDays] = useState<"7" | "28">("7");
  const [sort, setSort] = useState<SortState<SortKey>>({ key: "clickDelta", dir: "asc" });

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = rows.filter((r) => {
      if (!matchesEngineFilter(r.engine, engine)) return false;
      if (!matchesAnomalyPreset(r, preset)) return false;
      if (!needle) return true;
      return (
        r.query.toLowerCase().includes(needle) ||
        r.host.toLowerCase().includes(needle) ||
        r.engine.toLowerCase().includes(needle)
      );
    });
    return [...list].sort((a, b) =>
      compareSortValues(valueFor(a, sort.key), valueFor(b, sort.key), sort.dir)
    );
  }, [rows, q, preset, engine, sort]);

  const sortHint = t("common_sort_hint");

  return (
    <section className="panel space-y-3 overflow-x-auto p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="block text-sm">
          {t("common_filter")}
          <input
            className="mt-1 w-full max-w-md border border-line bg-paper px-3 py-2 text-sm"
            placeholder={t("filter_keywords_ph")}
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
            <option value="7">{t("window_week_movers")}</option>
            <option value="28">{t("window_28d_label")}</option>
          </select>
        </label>
      </div>
      <EngineFilterBar value={engine} onChange={setEngine} />
      <AnomalyPresetBar value={preset} onChange={setPreset} />
      <p className="text-xs text-ink/50">
        {windowDays === "28" ? t("kw_snap_note_28") : t("kw_snap_note")}
      </p>
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="text-ink/55">
          <tr>
            <SortableTh
              label={t("common_query")}
              sortKey="query"
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
              label={t("common_host")}
              sortKey="host"
              sort={sort}
              onSort={(k) => setSort((s) => toggleSort(s, k, "asc"))}
              title={sortHint}
            />
            <SortableTh
              label={t("common_clicks")}
              sortKey="clicks"
              sort={sort}
              onSort={(k) => setSort((s) => toggleSort(s, k))}
              title={sortHint}
            />
            <SortableTh
              label={t("common_delta")}
              sortKey="clickDelta"
              sort={sort}
              onSort={(k) => setSort((s) => toggleSort(s, k, "asc"))}
              title={`${sortHint} · ${t("common_delta_clicks")}`}
            />
            <SortableTh
              label={t("common_impr")}
              sortKey="impressions"
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
            <SortableTh
              label={t("common_pos")}
              sortKey="position"
              sort={sort}
              onSort={(k) => setSort((s) => toggleSort(s, k, "asc"))}
              title={sortHint}
            />
          </tr>
        </thead>
        <tbody>
          {filtered.map((r) => (
            <tr key={r.id} className="border-t border-line/70">
              <td className="max-w-[280px] truncate py-2">{r.query}</td>
              <td>
                <EngineBadge engine={r.engine} />
              </td>
              <td>
                <Link
                  href={`/sites/${encodeURIComponent(r.host)}`}
                  className="underline decoration-line underline-offset-2"
                >
                  {r.host}
                </Link>
              </td>
              <td className="font-mono">{fmt(r.clicks)}</td>
              <td>
                <Delta value={r.clickDelta} />
              </td>
              <td className="font-mono">{fmt(r.impressions)}</td>
              <td>
                <Delta value={r.impressionDelta} />
              </td>
              <td className="font-mono">{pct(r.ctr)}</td>
              <td className="font-mono">{r.position ? r.position.toFixed(1) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && (
        <div className="space-y-2 text-sm text-ink/60">
          <p>{t("kw_empty")}</p>
          <p className="flex flex-wrap gap-3">
            <Link href="/settings" className="text-accent underline decoration-line underline-offset-2">
              {t("common_settings_sync")}
            </Link>
            <Link href="/guide" className="text-ink/55 underline decoration-line underline-offset-2 hover:text-accent">
              {t("common_guide")}
            </Link>
          </p>
        </div>
      )}
      {rows.length > 0 && !filtered.length && (
        <p className="text-sm text-ink/60">{t("kw_no_match")}</p>
      )}
      {rows.length > 0 && filtered.length > 0 && (q.trim() || preset !== "all" || engine !== "all") && (
        <p className="text-xs text-ink/50">
          {t("common_showing_of", { shown: filtered.length, total: rows.length })}
        </p>
      )}
    </section>
  );
}
