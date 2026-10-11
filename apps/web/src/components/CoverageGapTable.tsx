"use client";

import Link from "next/link";
import type { CoverageStatus } from "@search-triad/connectors/filters";
import { useT } from "@/components/LocaleProvider";
import { Delta, EngineBadge, fmt } from "@/components/Stat";
import type { I18nKey } from "@/lib/i18n";

type EngineId = "gsc" | "bing" | "yandex";

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
  if (!rows.length) {
    return (
      <section className="panel p-4">
        <h2 className="font-display text-xl">{t("coverage_title")}</h2>
        <p className="mt-2 text-sm text-ink/60">{t("coverage_empty")}</p>
      </section>
    );
  }

  return (
    <section className="panel overflow-x-auto p-4">
      <h2 className="font-display text-xl">{t("coverage_title")}</h2>
      <p className="mt-1 text-sm text-ink/60">{t("coverage_sub")}</p>
      <table className="mt-3 w-full min-w-[800px] text-left text-sm">
        <thead className="text-ink/55">
          <tr>
            <th className="pb-2 font-medium">{t("common_host")}</th>
            {ENGINES.map((e) => (
              <th key={e} className="pb-2 font-medium">
                <EngineBadge engine={e} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.host} className="border-t border-line/70 align-top">
              <td className="py-3">
                <Link
                  href={`/sites/${encodeURIComponent(row.host)}`}
                  className="underline decoration-line underline-offset-2"
                >
                  {row.host}
                </Link>
              </td>
              {ENGINES.map((e) => (
                <td key={e} className="py-3">
                  <Cell cell={row.engines[e]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
