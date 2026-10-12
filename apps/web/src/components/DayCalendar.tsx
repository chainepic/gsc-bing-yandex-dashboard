"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  matchesEngineFilter,
  type EngineFilterId,
} from "@search-triad/connectors/filters";
import { EngineFilterBar } from "@/components/EngineFilterBar";
import { useT } from "@/components/LocaleProvider";
import { Delta, EngineBadge, fmt, pct } from "@/components/Stat";
import type { CalendarDaySummary, DayMetricsBundle } from "@/server/queries";

const WEEKDAYS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKDAYS_ZH = ["一", "二", "三", "四", "五", "六", "日"];

function monthLabel(year: number, month: number, zh: boolean) {
  if (zh) return `${year}年${month + 1}月`;
  return new Date(year, month, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
}

function buildCells(year: number, month: number) {
  const first = new Date(year, month, 1);
  // Monday-first: Sun=0 → 6
  const startPad = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ iso: string | null; day: number | null }> = [];
  for (let i = 0; i < startPad; i++) cells.push({ iso: null, day: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ iso, day: d });
  }
  while (cells.length % 7 !== 0) cells.push({ iso: null, day: null });
  return cells;
}

export function DayCalendar({
  summaries,
  byDate,
  locale,
}: {
  summaries: CalendarDaySummary[];
  byDate: Record<string, DayMetricsBundle>;
  locale: "en" | "zh";
}) {
  const t = useT();
  const summaryMap = useMemo(() => new Map(summaries.map((s) => [s.date, s])), [summaries]);
  const latest = summaries.length ? summaries[summaries.length - 1]!.date : null;

  const initial = latest
    ? new Date(`${latest}T12:00:00`)
    : new Date();
  const [cursor, setCursor] = useState({ y: initial.getFullYear(), m: initial.getMonth() });
  const [selected, setSelected] = useState<string | null>(latest);
  const [engine, setEngine] = useState<EngineFilterId>("all");

  const cells = useMemo(() => buildCells(cursor.y, cursor.m), [cursor]);
  const weekdays = locale === "zh" ? WEEKDAYS_ZH : WEEKDAYS_EN;
  const bundle = selected ? byDate[selected] : null;

  const engineCards = useMemo(() => {
    if (!bundle) return [];
    return bundle.engines.filter((e) => matchesEngineFilter(e.engine, engine));
  }, [bundle, engine]);

  const siteRows = useMemo(() => {
    if (!bundle) return [];
    return bundle.sites.filter((s) => matchesEngineFilter(s.engine, engine));
  }, [bundle, engine]);

  function shiftMonth(delta: number) {
    setCursor((c) => {
      const d = new Date(c.y, c.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  if (!summaries.length) {
    return (
      <section className="panel space-y-2 p-4">
        <h2 className="font-display text-xl">{t("calendar_title")}</h2>
        <p className="text-sm text-ink/60">{t("calendar_empty")}</p>
      </section>
    );
  }

  return (
    <section className="panel space-y-4 p-4">
      <div>
        <h2 className="font-display text-xl">{t("calendar_title")}</h2>
        <p className="mt-1 text-sm text-ink/60">{t("calendar_sub")}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,280px)_1fr]">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="border border-line bg-mist px-2 py-1 text-xs"
              aria-label={t("calendar_prev_month")}
            >
              ←
            </button>
            <p className="text-sm font-medium">{monthLabel(cursor.y, cursor.m, locale === "zh")}</p>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="border border-line bg-mist px-2 py-1 text-xs"
              aria-label={t("calendar_next_month")}
            >
              →
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-ink/45">
            {weekdays.map((w) => (
              <div key={w}>{w}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, i) => {
              if (!cell.iso || cell.day == null) {
                return <div key={`pad-${i}`} className="aspect-square" />;
              }
              const hit = summaryMap.get(cell.iso);
              const active = selected === cell.iso;
              const hasData = Boolean(hit);
              return (
                <button
                  key={cell.iso}
                  type="button"
                  disabled={!hasData}
                  title={
                    hit
                      ? `${cell.iso} · ${fmt(hit.clicks)} ${t("common_clicks").toLowerCase()}`
                      : cell.iso
                  }
                  onClick={() => hasData && setSelected(cell.iso)}
                  className={`aspect-square border text-xs ${
                    active
                      ? "border-accent bg-accent text-paper"
                      : hasData
                        ? "border-line bg-mist text-ink hover:border-accent"
                        : "border-transparent text-ink/25"
                  }`}
                >
                  <span className="block leading-none">{cell.day}</span>
                  {hasData && (
                    <span
                      className={`mt-0.5 block h-1 w-1 mx-auto rounded-full ${
                        active ? "bg-paper" : "bg-accent"
                      }`}
                      aria-hidden
                    />
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-ink/45">{t("calendar_dot_hint")}</p>
        </div>

        <div className="space-y-3 min-w-0">
          {bundle ? (
            <>
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="font-display text-lg">{bundle.date}</p>
                  <p className="text-xs text-ink/50">
                    {bundle.prevDate
                      ? t("calendar_vs_prev", { date: bundle.prevDate })
                      : t("calendar_no_prev")}
                  </p>
                </div>
                <p className="font-mono text-sm">
                  {fmt(bundle.totals.clicks)} · {fmt(bundle.totals.impressions)} · {pct(bundle.totals.ctr)}
                </p>
              </div>
              <EngineFilterBar value={engine} onChange={setEngine} />
              <div className="grid gap-2 sm:grid-cols-3">
                {engineCards.map((e) => (
                  <div key={e.engine} className="border border-line/70 bg-mist/30 p-3">
                    <EngineBadge engine={e.engine} />
                    <p className="mt-2 font-display text-2xl">{fmt(e.clicks)}</p>
                    <p className="text-xs text-ink/55">
                      {t("common_impressions_ctr", {
                        impr: fmt(e.impressions),
                        ctr: pct(e.ctr),
                      })}
                    </p>
                    <p className="mt-1 flex gap-2 text-xs">
                      <Delta value={e.clickDelta} />
                      <span className="text-ink/40">/</span>
                      <Delta value={e.impressionDelta} />
                    </p>
                  </div>
                ))}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="text-ink/55">
                    <tr>
                      <th className="pb-2 font-medium">{t("common_host")}</th>
                      <th className="pb-2 font-medium">{t("common_engine")}</th>
                      <th className="pb-2 font-medium">{t("common_clicks")}</th>
                      <th className="pb-2 font-medium">{t("common_delta")}</th>
                      <th className="pb-2 font-medium">{t("common_impr")}</th>
                      <th className="pb-2 font-medium">{t("common_ctr")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {siteRows.slice(0, 40).map((s) => (
                      <tr key={`${s.engine}-${s.host}`} className="border-t border-line/70">
                        <td className="py-2">
                          <Link
                            href={`/sites/${encodeURIComponent(s.host)}`}
                            className="underline decoration-line underline-offset-2"
                          >
                            {s.host}
                          </Link>
                        </td>
                        <td>
                          <EngineBadge engine={s.engine} />
                        </td>
                        <td className="font-mono">{fmt(s.clicks)}</td>
                        <td>
                          <Delta value={s.clickDelta} />
                        </td>
                        <td className="font-mono">{fmt(s.impressions)}</td>
                        <td className="font-mono">{pct(s.ctr)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!siteRows.length && (
                  <p className="text-sm text-ink/55">{t("calendar_no_engine_rows")}</p>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-ink/55">{t("calendar_pick")}</p>
          )}
        </div>
      </div>
    </section>
  );
}
