"use client";

import { useMemo, useState } from "react";
import { matchesAnomalyPreset, type AnomalyPresetId } from "@search-triad/connectors/filters";
import { AnomalyPresetBar } from "@/components/AnomalyPresetBar";
import { useT } from "@/components/LocaleProvider";
import { Delta, EngineBadge, Sparkline, fmt, pct } from "@/components/Stat";

type Mover = {
  id: number;
  query: string;
  clicks: number;
  clickDelta: number;
  impressions: number;
  impressionDelta: number;
  position: number | null;
  ctr: number;
};

type EngineBlock = {
  site: { id: number; engine: string; propertyId: string };
  daily: Array<{ clicks: number }>;
  keywords: Mover[];
  pages: Mover[];
};

const ENGINE_ORDER = ["gsc", "bing", "yandex"] as const;

function MoverList({ title, rows }: { title: string; rows: Mover[] }) {
  const t = useT();
  return (
    <div>
      <h3 className="text-sm font-medium text-ink/70">{title}</h3>
      <ul className="mt-2 space-y-2 text-sm">
        {rows.slice(0, 12).map((k) => (
          <li key={k.id} className="border-b border-line/40 pb-2 last:border-0">
            <div className="flex justify-between gap-3">
              <span className="truncate" title={k.query}>
                {k.query}
              </span>
              <span className="flex shrink-0 gap-2 font-mono">
                {fmt(k.clicks)} <Delta value={k.clickDelta} />
              </span>
            </div>
            <p className="mt-0.5 font-mono text-xs text-ink/55">
              CTR {pct(k.ctr)} · impr. {fmt(k.impressions)}{" "}
              <Delta value={k.impressionDelta} /> · pos {k.position ? k.position.toFixed(1) : "—"}
            </p>
          </li>
        ))}
        {!rows.length && <li className="text-ink/50">{t("common_none")}</li>}
      </ul>
    </div>
  );
}

export function SiteEngineTabs({ engines }: { engines: EngineBlock[] }) {
  const t = useT();
  const ordered = useMemo(() => {
    return [...engines].sort((a, b) => {
      const ai = ENGINE_ORDER.indexOf(a.site.engine as (typeof ENGINE_ORDER)[number]);
      const bi = ENGINE_ORDER.indexOf(b.site.engine as (typeof ENGINE_ORDER)[number]);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  }, [engines]);

  const [activeId, setActiveId] = useState(ordered[0]?.site.id ?? 0);
  const [kwFilter, setKwFilter] = useState("");
  const [preset, setPreset] = useState<AnomalyPresetId>("all");

  const active = ordered.find((e) => e.site.id === activeId) || ordered[0];
  if (!active) return null;

  const { site, daily, keywords, pages } = active;
  const needle = kwFilter.trim().toLowerCase();
  const matchText = (q: string) => !needle || q.toLowerCase().includes(needle);
  const apply = (rows: Mover[]) =>
    rows.filter((k) => matchText(k.query) && matchesAnomalyPreset(k, preset));
  const kwList = apply(keywords);
  const pageList = apply(pages);

  return (
    <div className="space-y-4">
      {ordered.length > 1 && (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label={t("site_tabs_engine_aria")}>
          {ordered.map(({ site: s }) => {
            const selected = s.id === active.site.id;
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => {
                  setActiveId(s.id);
                  setKwFilter("");
                  setPreset("all");
                }}
                className={`border px-3 py-1.5 text-sm ${
                  selected ? "border-accent bg-accent text-paper" : "border-line bg-mist"
                }`}
              >
                <EngineBadge engine={s.engine} />
              </button>
            );
          })}
        </div>
      )}

      <section className="panel space-y-4 p-4" role="tabpanel">
        <div className="flex items-center justify-between">
          <EngineBadge engine={site.engine} />
          <span className="font-mono text-xs text-ink/50">{site.propertyId}</span>
        </div>
        <Sparkline
          values={daily.map((d) => d.clicks)}
          color={site.engine === "gsc" ? "var(--gsc)" : site.engine === "bing" ? "var(--bing)" : "var(--yandex)"}
        />

        <div className="space-y-2">
          <p className="text-xs text-ink/55">{t("site_tabs_anomaly")}</p>
          <AnomalyPresetBar value={preset} onChange={setPreset} />
        </div>

        <label className="block text-sm">
          {t("site_tabs_filter")}
          <input
            className="mt-1 w-full max-w-md border border-line bg-paper px-3 py-2 text-sm"
            placeholder={t("site_tabs_filter_ph")}
            value={kwFilter}
            onChange={(e) => setKwFilter(e.target.value)}
            aria-label={t("site_tabs_filter")}
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <MoverList title={t("site_tabs_q_gains")} rows={kwList.filter((k) => k.clickDelta > 0)} />
          <MoverList title={t("site_tabs_q_losses")} rows={kwList.filter((k) => k.clickDelta < 0)} />
        </div>
        <div className="grid gap-4 border-t border-line/70 pt-4 md:grid-cols-2">
          <MoverList title={t("site_tabs_p_gains")} rows={pageList.filter((k) => k.clickDelta > 0)} />
          <MoverList title={t("site_tabs_p_losses")} rows={pageList.filter((k) => k.clickDelta < 0)} />
        </div>
        {!kwList.length && !pageList.length && (preset !== "all" || needle) && (
          <p className="text-sm text-ink/55">{t("site_tabs_no_match")}</p>
        )}
      </section>
    </div>
  );
}
