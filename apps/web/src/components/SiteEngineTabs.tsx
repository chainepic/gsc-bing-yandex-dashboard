"use client";

import { useMemo, useState } from "react";
import { Delta, EngineBadge, Sparkline, fmt } from "@/components/Stat";

type Mover = {
  id: number;
  query: string;
  clicks: number;
  clickDelta: number;
};

type EngineBlock = {
  site: { id: number; engine: string; propertyId: string };
  daily: Array<{ clicks: number }>;
  keywords: Mover[];
  pages: Mover[];
};

const ENGINE_ORDER = ["gsc", "bing", "yandex"] as const;

function MoverList({ title, rows }: { title: string; rows: Mover[] }) {
  return (
    <div>
      <h3 className="text-sm font-medium text-ink/70">{title}</h3>
      <ul className="mt-2 space-y-1 text-sm">
        {rows.slice(0, 8).map((k) => (
          <li key={k.id} className="flex justify-between gap-3">
            <span className="truncate" title={k.query}>
              {k.query}
            </span>
            <span className="flex shrink-0 gap-2 font-mono">
              {fmt(k.clicks)} <Delta value={k.clickDelta} />
            </span>
          </li>
        ))}
        {!rows.length && <li className="text-ink/50">None</li>}
      </ul>
    </div>
  );
}

export function SiteEngineTabs({ engines }: { engines: EngineBlock[] }) {
  const ordered = useMemo(() => {
    return [...engines].sort((a, b) => {
      const ai = ENGINE_ORDER.indexOf(a.site.engine as (typeof ENGINE_ORDER)[number]);
      const bi = ENGINE_ORDER.indexOf(b.site.engine as (typeof ENGINE_ORDER)[number]);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  }, [engines]);

  const [activeId, setActiveId] = useState(ordered[0]?.site.id ?? 0);
  const [kwFilter, setKwFilter] = useState("");

  const active = ordered.find((e) => e.site.id === activeId) || ordered[0];
  if (!active) return null;

  const { site, daily, keywords, pages } = active;
  const needle = kwFilter.trim().toLowerCase();
  const match = (q: string) => !needle || q.toLowerCase().includes(needle);
  const kwList = keywords.filter((k) => match(k.query));
  const pageList = pages.filter((k) => match(k.query));

  return (
    <div className="space-y-4">
      {ordered.length > 1 && (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Search engine">
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

        <label className="block text-sm">
          Filter keywords / pages
          <input
            className="mt-1 w-full max-w-md border border-line bg-paper px-3 py-2 text-sm"
            placeholder="Search queries or URLs…"
            value={kwFilter}
            onChange={(e) => setKwFilter(e.target.value)}
            aria-label="Filter site keywords and pages"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <MoverList title="Query gains" rows={kwList.filter((k) => k.clickDelta > 0)} />
          <MoverList title="Query losses" rows={kwList.filter((k) => k.clickDelta < 0)} />
        </div>
        <div className="grid gap-4 border-t border-line/70 pt-4 md:grid-cols-2">
          <MoverList title="Page gains" rows={pageList.filter((k) => k.clickDelta > 0)} />
          <MoverList title="Page losses" rows={pageList.filter((k) => k.clickDelta < 0)} />
        </div>
      </section>
    </div>
  );
}
