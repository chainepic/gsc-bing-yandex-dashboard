"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { CoverageStatus, EngineFilterId } from "@search-triad/connectors/filters";
import type { EngineId } from "@search-triad/connectors";
import { EngineFilterBar } from "@/components/EngineFilterBar";
import { useT } from "@/components/LocaleProvider";
import { Delta, EngineBadge, fmt } from "@/components/Stat";
import type { I18nKey } from "@/lib/i18n";

export type CoverageGapRow = {
  host: string;
  engines: Record<
    EngineId,
    {
      engine: EngineId;
      connected: boolean;
      weekClicks: number;
      weekImpressions: number;
      clickDelta: number;
      impressionDelta: number;
      status: CoverageStatus;
      asOf: string | null;
    } | null
  >;
};

const ENGINES: EngineId[] = ["gsc", "bing", "yandex"];

function visibleEngines(filter: EngineFilterId): EngineId[] {
  if (filter === "all") return ENGINES;
  return [filter];
}

const STATUS_KEY: Record<CoverageStatus, I18nKey> = {
  has_traffic: "coverage_has_traffic",
  no_data: "coverage_no_data",
  big_drop: "coverage_big_drop",
  flat: "coverage_flat",
};

function statusClass(status: CoverageStatus) {
  if (status === "big_drop") return "text-[color:var(--warn)]";
  if (status === "no_data") return "text-ink/40";
  if (status === "has_traffic") return "text-[color:var(--ok)]";
  return "text-ink/55";
}

function Cell({
  cell,
}: {
  cell: CoverageGapRow["engines"][EngineId];
}) {
  const t = useT();
  if (!cell || !cell.connected) {
    return <span className="text-ink/40">{t("coverage_no_data")}</span>;
  }
  return (
    <div className="space-y-0.5">
      <p className={`text-xs font-medium ${statusClass(cell.status)}`}>
        {t(STATUS_KEY[cell.status])}
      </p>
      <p className="font-mono text-xs">
        {fmt(cell.weekClicks)} <Delta value={cell.clickDelta} />
      </p>
      <p className="font-mono text-[11px] text-ink/50">
        {t("coverage_impr_suffix", { n: fmt(cell.weekImpressions) })}
      </p>
    </div>
  );
}

export function CoverageGapTable({ rows }: { rows: CoverageGapRow[] }) {
  const t = useT();
  const [engine, setEngine] = useState<EngineFilterId>("all");
  const columns = visibleEngines(engine);

  const filtered = useMemo(() => {
    if (engine === "all") return rows;
    return rows.filter((row) => {
      const cell = row.engines[engine];
      return Boolean(cell?.connected);
    });
  }, [engine, rows]);

  if (!rows.length) {
    return (
      <section className="panel p-4">
        <h2 className="font-display text-xl">{t("coverage_title")}</h2>
        <p className="mt-2 text-sm text-ink/60">{t("coverage_empty")}</p>
      </section>
    );
  }

  return (
    <section className="panel space-y-3 overflow-x-auto p-4">
      <div>
        <h2 className="font-display text-xl">{t("coverage_title")}</h2>
        <p className="mt-1 text-sm text-ink/60">{t("coverage_sub")}</p>
      </div>
      <EngineFilterBar value={engine} onChange={setEngine} />
      <table className="w-full min-w-[800px] text-left text-sm">
        <thead className="text-ink/55">
          <tr>
            <th className="pb-2 font-medium">{t("common_host")}</th>
            {columns.map((e) => (
              <th key={e} className="pb-2 font-medium">
                <EngineBadge engine={e} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.map((row) => (
            <tr key={row.host} className="border-t border-line/70 align-top">
              <td className="py-3">
                <Link
                  href={`/sites/${encodeURIComponent(row.host)}`}
                  className="underline decoration-line underline-offset-2"
                >
                  {row.host}
                </Link>
              </td>
              {columns.map((e) => (
                <td key={e} className="py-3">
                  <Cell cell={row.engines[e]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!filtered.length && <p className="text-sm text-ink/55">{t("sites_no_match")}</p>}
    </section>
  );
}
