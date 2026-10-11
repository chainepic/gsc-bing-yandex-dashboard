"use client";

import { useMemo, useState } from "react";
import { matchesAnomalyPreset, type AnomalyPresetId } from "@search-triad/connectors/filters";

type EngineId = "gsc" | "bing" | "yandex";
import { AnomalyPresetBar } from "@/components/AnomalyPresetBar";
import { Delta, fmt, pct } from "@/components/Stat";
import { useT } from "@/components/LocaleProvider";

type Cell = {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number | null;
  clickDelta: number;
  impressionDelta: number;
};

export type CrossMoverRow = {
  key: string;
  kind: "query" | "page";
  host: string;
  byEngine: Partial<Record<EngineId, Cell>>;
};

const ENGINES: EngineId[] = ["gsc", "bing", "yandex"];
const LABELS: Record<EngineId, string> = { gsc: "Google", bing: "Bing", yandex: "Yandex" };

function EngineCell({ cell }: { cell?: Cell }) {
  if (!cell) return <span className="text-ink/35">—</span>;
  return (
    <span className="font-mono text-xs">
      <Delta value={cell.clickDelta} />
      <span className="ml-1 text-ink/50">
        ({fmt(cell.clicks)} · {pct(cell.ctr)})
      </span>
    </span>
  );
}

export function CrossEngineMovers({
  queryRows,
  pageRows,
}: {
  queryRows: CrossMoverRow[];
  pageRows: CrossMoverRow[];
}) {
  const t = useT();
  const [kind, setKind] = useState<"query" | "page">("query");
  const [preset, setPreset] = useState<AnomalyPresetId>("all");

  const rows = useMemo(() => {
    const source = kind === "query" ? queryRows : pageRows;
    return source.filter((row) => {
      const cells = ENGINES.map((e) => row.byEngine[e]).filter(Boolean) as Cell[];
      if (!cells.length) return false;
      if (preset === "all") return true;
      return cells.some((c) => matchesAnomalyPreset(c, preset));
    });
  }, [kind, pageRows, preset, queryRows]);

  if (!queryRows.length && !pageRows.length) {
    return (
      <section className="panel p-4">
        <h2 className="font-display text-xl">{t("cross_title")}</h2>
<p className="mt-2 text-sm text-ink/60">{t("cross_empty")}</p>
      </section>
    );
  }

  return (
    <section className="panel space-y-3 overflow-x-auto p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl">{t("cross_title")}</h2>
          <p className="mt-1 text-sm text-ink/60">{t("cross_sub")}</p>
        </div>
        <div className="flex gap-2">
          {(["query", "page"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`border px-2.5 py-1 text-xs ${
                kind === k ? "border-accent bg-accent text-paper" : "border-line bg-mist"
              }`}
            >
              {k === "query" ? t("cross_queries") : t("cross_pages")}
            </button>
          ))}
        </div>
      </div>
      <AnomalyPresetBar value={preset} onChange={setPreset} />
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="text-ink/55">
          <tr>
            <th className="pb-2 font-medium">{kind === "query" ? t("common_query") : t("common_page")}</th>
            {ENGINES.map((e) => (
              <th key={e} className="pb-2 font-medium">
                {LABELS[e]} Δ
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 30).map((row) => (
            <tr key={row.key} className="border-t border-line/70">
              <td className="max-w-[280px] truncate py-2" title={row.key}>
                {row.key}
              </td>
              {ENGINES.map((e) => (
                <td key={e} className="py-2">
                  <EngineCell cell={row.byEngine[e]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <p className="text-sm text-ink/55">{t("cross_no_match")}</p>}
    </section>
  );
}
