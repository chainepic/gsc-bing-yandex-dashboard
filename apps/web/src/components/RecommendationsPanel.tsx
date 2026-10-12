"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  matchesAnyEngineFilter,
  type EngineFilterId,
} from "@search-triad/connectors/filters";
import { EngineFilterBar } from "@/components/EngineFilterBar";
import { useT } from "@/components/LocaleProvider";
import { EngineBadge } from "@/components/Stat";

export type RecCard = {
  id: string;
  ruleId: string;
  title: string;
  summary: string;
  severity: "high" | "medium" | "low";
  score: number;
  host: string;
  engines: string[];
  kind?: "query" | "page" | "site";
  subject?: string;
  evidence: Array<{ label: string; value: string }>;
  hrefs: Array<{ label: string; href: string }>;
  engineSpecific?: boolean;
};

function severityClass(s: RecCard["severity"]) {
  if (s === "high") return "text-[color:var(--warn)]";
  if (s === "medium") return "text-ink/80";
  return "text-ink/55";
}

export function RecommendationsPanel({
  recommendations,
  compact = false,
}: {
  recommendations: RecCard[];
  compact?: boolean;
  /** @deprecated ignored — use Export → Report AI */
  llmEnabled?: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "engine" | "high">("all");
  const [engine, setEngine] = useState<EngineFilterId>("all");

  const rows = useMemo(() => {
    return recommendations.filter((r) => {
      if (!matchesAnyEngineFilter(r.engines, engine)) return false;
      if (filter === "engine") return Boolean(r.engineSpecific);
      if (filter === "high") return r.severity === "high";
      return true;
    });
  }, [recommendations, filter, engine]);

  const visible = compact ? rows.slice(0, 6) : rows;

  async function act(id: string, action: "snooze" | "done") {
    setBusyId(id);
    try {
      await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, days: 7 }),
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (!recommendations.length) {
    return (
      <section className="panel p-4">
        <h2 className="font-display text-xl">{t("recommendations_title")}</h2>
        <p className="mt-2 text-sm text-ink/60">{t("recs_empty")}</p>
        <p className="mt-2 flex flex-wrap gap-3 text-sm">
          <Link href="/settings" className="text-accent underline decoration-line underline-offset-2">
            {t("common_settings_sync")}
          </Link>
          <Link href="/guide" className="text-ink/55 underline decoration-line underline-offset-2 hover:text-accent">
            {t("common_guide")}
          </Link>
        </p>
      </section>
    );
  }

  return (
    <section className="panel space-y-3 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl">{t("recommendations_title")}</h2>
          <p className="mt-1 text-sm text-ink/60">{t("recs_sub")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", t("recs_filter_all")],
              ["high", t("recs_filter_high")],
              ["engine", t("recs_filter_engine")],
            ] as Array<["all" | "high" | "engine", string]>
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`border px-2.5 py-1 text-xs ${
                filter === id ? "border-accent bg-accent text-paper" : "border-line bg-mist"
              }`}
            >
              {label}
            </button>
          ))}
          {!compact && (
            <a
              href="/api/recommendations?format=csv"
              className="border border-line bg-mist px-2.5 py-1 text-xs"
            >
              {t("recs_export_csv")}
            </a>
          )}
          {compact && (
            <Link href="/recommendations" className="border border-line bg-mist px-2.5 py-1 text-xs">
              {t("recs_all_arrow")}
            </Link>
          )}
        </div>
      </div>
      <EngineFilterBar value={engine} onChange={setEngine} />
      {!compact && (
        <p className="text-xs text-ink/45">
          {t("recs_export_hint")}{" "}
          <Link href="/export" className="text-accent underline decoration-line underline-offset-2">
            {t("nav_export")}
          </Link>
        </p>
      )}

      <ul className="space-y-3">
        {visible.map((r) => (
          <li key={r.id} className="border border-line/70 bg-mist/30 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 space-y-1">
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  <span className={`font-mono text-xs uppercase ${severityClass(r.severity)}`}>
                    {t(`severity_${r.severity}` as "severity_high" | "severity_medium" | "severity_low")}
                  </span>
                  <span className="font-mono text-xs text-ink/45">{t("recs_score", { n: r.score })}</span>
                  {r.engineSpecific && (
                    <span className="font-mono text-[11px] text-accent">{t("recs_engine_tip")}</span>
                  )}
                </p>
                <h3 className="font-medium text-ink">{r.title}</h3>
                <p className="text-sm text-ink/70">{r.summary}</p>
                {r.subject && (
                  <p className="truncate font-mono text-xs text-ink/55" title={r.subject}>
                    {r.kind}: {r.subject}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {r.engines.map((e) => (
                  <EngineBadge key={e} engine={e} />
                ))}
              </div>
            </div>
            <dl className="mt-2 grid gap-1 text-xs text-ink/60 sm:grid-cols-2">
              {r.evidence.map((e) => (
                <div key={`${r.id}-${e.label}`} className="flex gap-2">
                  <dt className="shrink-0 font-medium text-ink/45">{e.label}</dt>
                  <dd className="font-mono">{e.value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 flex flex-wrap gap-3 text-xs">
              <Link
                href={`/sites/${encodeURIComponent(r.host)}`}
                className="text-accent underline decoration-line underline-offset-2"
              >
                {r.host}
              </Link>
              {r.hrefs.map((h) => (
                <Link
                  key={h.href + h.label}
                  href={h.href}
                  className="text-ink/55 underline decoration-line underline-offset-2 hover:text-accent"
                >
                  {h.label}
                </Link>
              ))}
              <button
                type="button"
                disabled={busyId === r.id}
                onClick={() => void act(r.id, "snooze")}
                className="text-ink/55 underline decoration-line underline-offset-2 hover:text-accent disabled:opacity-50"
              >
                {t("recs_snooze")}
              </button>
              <button
                type="button"
                disabled={busyId === r.id}
                onClick={() => void act(r.id, "done")}
                className="text-ink/55 underline decoration-line underline-offset-2 hover:text-accent disabled:opacity-50"
              >
                {t("recs_done")}
              </button>
            </p>
          </li>
        ))}
      </ul>
      {!visible.length && <p className="text-sm text-ink/55">{t("recs_no_filter")}</p>}
      {compact && rows.length > 6 && (
        <p className="text-xs text-ink/50">
          {t("recs_showing", { n: rows.length })}{" "}
          <Link href="/recommendations" className="text-accent underline decoration-line underline-offset-2">
            {t("recs_view_all")}
          </Link>
        </p>
      )}
    </section>
  );
}
