"use client";

import { useT } from "@/components/LocaleProvider";
import type { ChartPoint } from "@/components/DetailChart";
import { EngineBadge, Sparkline, fmt, pct } from "@/components/Stat";

type Rollup = {
  clicks: number;
  impressions: number;
  ctr: number;
  series: number[];
  points: ChartPoint[];
};

export function TrendCompare({
  historyDays,
  cards,
}: {
  historyDays: number;
  cards: Array<{ engine: string; d7: Rollup; d28: Rollup; dLong: Rollup }>;
}) {
  const t = useT();
  return (
    <section className="panel space-y-3 p-4">
      <div>
        <h2 className="font-display text-xl">{t("trend_title")}</h2>
        <p className="mt-1 text-sm text-ink/60">{t("trend_sub", { days: historyDays })}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <div key={card.engine} className="border border-line/70 bg-mist/30 p-3">
            <EngineBadge engine={card.engine} />
            <dl className="mt-3 space-y-1 font-mono text-xs text-ink/70">
              <div className="flex justify-between gap-2">
                <dt>7d</dt>
                <dd>
                  {fmt(card.d7.clicks)} · CTR {pct(card.d7.ctr)}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>28d</dt>
                <dd>
                  {fmt(card.d28.clicks)} · CTR {pct(card.d28.ctr)}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>{historyDays}d</dt>
                <dd>
                  {fmt(card.dLong.clicks)} · CTR {pct(card.dLong.ctr)}
                </dd>
              </div>
            </dl>
            <div className="mt-3">
              <Sparkline
                values={card.dLong.series}
                color={
                  card.engine === "gsc" ? "var(--gsc)" : card.engine === "bing" ? "var(--bing)" : "var(--yandex)"
                }
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
