"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { DetailChart, type ChartPoint } from "@/components/DetailChart";
import { useT } from "@/components/LocaleProvider";
import { EngineBadge, Sparkline, fmt, pct } from "@/components/Stat";

export type EngineRollup = {
  clicks: number;
  impressions: number;
  ctr: number;
  series: number[];
  points: ChartPoint[];
};

export type EngineCard = {
  engine: string;
  d7: EngineRollup;
  d28: EngineRollup;
  dLong: EngineRollup;
};

function engineColor(engine: string) {
  return engine === "gsc" ? "var(--gsc)" : engine === "bing" ? "var(--bing)" : "var(--yandex)";
}

function peakDay(points: ChartPoint[]) {
  if (!points.length) return null;
  return points.reduce((best, p) => (p.clicks > best.clicks ? p : best), points[0]!);
}

function avgDaily(points: ChartPoint[]) {
  if (!points.length) return 0;
  return points.reduce((s, p) => s + p.clicks, 0) / points.length;
}

export function EngineOverviewCards({
  historyDays,
  cards,
}: {
  historyDays: number;
  cards: EngineCard[];
}) {
  const t = useT();
  const titleId = useId();
  const [open, setOpen] = useState<string | null>(null);
  const [metric, setMetric] = useState<"clicks" | "impressions">("clicks");

  const active = useMemo(() => cards.find((c) => c.engine === open) || null, [cards, open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(null);
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <section className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => {
          const color = engineColor(card.engine);
          return (
            <button
              key={card.engine}
              type="button"
              onClick={() => {
                setMetric("clicks");
                setOpen(card.engine);
              }}
              className="panel p-4 text-left transition hover:border-accent/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              aria-haspopup="dialog"
            >
              <div className="flex items-center justify-between">
                <EngineBadge engine={card.engine} />
                <span className="font-mono text-xs text-ink/50">{historyDays}d</span>
              </div>
              <p className="mt-3 font-display text-3xl">{fmt(card.dLong.clicks)}</p>
              <p className="text-sm text-ink/60">
                {t("common_impressions_ctr", {
                  impr: fmt(card.dLong.impressions),
                  ctr: pct(card.dLong.ctr),
                })}
              </p>
              <div className="mt-3">
                <Sparkline values={card.dLong.series} color={color} />
              </div>
              <p className="mt-2 text-xs text-ink/55">
                {t("common_7d_28d", { d7: fmt(card.d7.clicks), d28: fmt(card.d28.clicks) })}
              </p>
              <p className="mt-2 text-[11px] text-accent/80">{t("overview_chart_expand_hint")}</p>
            </button>
          );
        })}
      </section>

      {active ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="presentation"
          onClick={() => setOpen(null)}
        >
          <div className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]" />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="panel relative z-10 flex max-h-[min(92vh,720px)] w-full max-w-3xl flex-col overflow-hidden shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-line/70 px-4 py-3">
              <div>
                <div className="flex items-center gap-3">
                  <EngineBadge engine={active.engine} />
                  <span className="font-mono text-xs text-ink/50">
                    {t("overview_chart_window", { days: historyDays })}
                  </span>
                </div>
                <h2 id={titleId} className="mt-2 font-display text-xl">
                  {t("overview_chart_detail_title")}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(null)}
                className="border border-line bg-mist px-2.5 py-1 text-xs hover:border-accent/40"
              >
                {t("common_close")}
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto p-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setMetric("clicks")}
                  className={`border px-2.5 py-1 text-xs ${
                    metric === "clicks" ? "border-accent bg-accent/10 text-accent" : "border-line bg-mist"
                  }`}
                >
                  {t("common_clicks")}
                </button>
                <button
                  type="button"
                  onClick={() => setMetric("impressions")}
                  className={`border px-2.5 py-1 text-xs ${
                    metric === "impressions" ? "border-accent bg-accent/10 text-accent" : "border-line bg-mist"
                  }`}
                >
                  {t("common_impressions")}
                </button>
              </div>

              <DetailChart
                points={active.dLong.points}
                color={engineColor(active.engine)}
                metric={metric}
                height={280}
              />

              <dl className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                <StatBlock
                  label={t("overview_chart_total_clicks")}
                  value={fmt(active.dLong.clicks)}
                  sub={t("common_impressions_ctr", {
                    impr: fmt(active.dLong.impressions),
                    ctr: pct(active.dLong.ctr),
                  })}
                />
                <StatBlock
                  label={t("overview_chart_avg_daily")}
                  value={fmt(Math.round(avgDaily(active.dLong.points)))}
                  sub={`${active.dLong.points.length} ${t("overview_chart_days")}`}
                />
                <StatBlock
                  label={t("overview_chart_peak")}
                  value={peakDay(active.dLong.points) ? fmt(peakDay(active.dLong.points)!.clicks) : "—"}
                  sub={peakDay(active.dLong.points)?.date || "—"}
                />
                <StatBlock
                  label={t("common_7d_28d", {
                    d7: fmt(active.d7.clicks),
                    d28: fmt(active.d28.clicks),
                  })}
                  value={`${pct(active.d7.ctr)} / ${pct(active.d28.ctr)}`}
                  sub={t("overview_chart_ctr_windows")}
                />
              </dl>

              {active.dLong.points.length > 0 ? (
                <div className="overflow-x-auto border border-line/70">
                  <table className="w-full min-w-[480px] text-left text-xs">
                    <thead className="bg-mist/50 text-ink/55">
                      <tr>
                        <th className="px-3 py-2 font-medium">{t("overview_chart_date")}</th>
                        <th className="px-3 py-2 font-medium">{t("common_clicks")}</th>
                        <th className="px-3 py-2 font-medium">{t("common_impressions")}</th>
                        <th className="px-3 py-2 font-medium">{t("common_ctr")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...active.dLong.points]
                        .slice(-14)
                        .reverse()
                        .map((p) => (
                          <tr key={p.date} className="border-t border-line/60 font-mono">
                            <td className="px-3 py-1.5">{p.date}</td>
                            <td className="px-3 py-1.5">{fmt(p.clicks)}</td>
                            <td className="px-3 py-1.5">{fmt(p.impressions)}</td>
                            <td className="px-3 py-1.5">
                              {pct(p.impressions > 0 ? p.clicks / p.impressions : 0)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  <p className="border-t border-line/60 px-3 py-2 text-[11px] text-ink/50">
                    {t("overview_chart_table_hint")}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function StatBlock({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="border border-line/70 bg-mist/25 px-3 py-2">
      <dt className="text-[11px] text-ink/55">{label}</dt>
      <dd className="mt-1 font-display text-xl">{value}</dd>
      <dd className="mt-0.5 text-[11px] text-ink/50">{sub}</dd>
    </div>
  );
}
