import Link from "next/link";
import { redirect } from "next/navigation";
import { CoverageGapTable } from "@/components/CoverageGapTable";
import { DayCalendar } from "@/components/DayCalendar";
import { FirstRunPanel } from "@/components/FirstRunPanel";
import { RecommendationsPanel } from "@/components/RecommendationsPanel";
import { EngineOverviewCards } from "@/components/EngineOverviewCards";
import { Delta, EngineBadge, fmt, pct } from "@/components/Stat";
import { SyncStatusBanner } from "@/components/SyncStatusBanner";
import { TrendCompare } from "@/components/TrendCompare";
import { WatchlistPanel } from "@/components/WatchlistPanel";
import { t } from "@/lib/i18n";
import { getRequestUiLocale } from "@/lib/locale-server";
import { getOnboardingProgress } from "@/lib/onboarding";
import { generateRecommendations } from "@/server/recommendations";
import { getSettings } from "@/server/settings";
import { formatDateTime } from "@/lib/format";
import {
  coverageGapTable,
  latestSync,
  loadDayCalendar,
  overviewMetrics,
  parseSyncDetail,
  siteComparison,
} from "@/server/queries";
import { listWatchlist } from "@/server/watchlist";

export const dynamic = "force-dynamic";

function rollup(rows: Array<{ engine: string; date: string; clicks: number; impressions: number }>, engine: string, days: number) {
  const slice = rows.filter((r) => r.engine === engine).slice(-days);
  const clicks = slice.reduce((s, r) => s + Number(r.clicks), 0);
  const impressions = slice.reduce((s, r) => s + Number(r.impressions), 0);
  const points = slice.map((r) => ({
    date: r.date,
    clicks: Number(r.clicks),
    impressions: Number(r.impressions),
  }));
  return {
    clicks,
    impressions,
    ctr: impressions > 0 ? clicks / impressions : 0,
    series: points.map((p) => p.clicks),
    points,
  };
}

export default async function OverviewPage() {
  const settings = getSettings();
  if (!settings.setupComplete) redirect("/setup");
  const locale = await getRequestUiLocale();

  const progress = getOnboardingProgress();
  if (progress.needsFirstRunHelp) {
    return <FirstRunPanel progress={progress} />;
  }

  const historyDays = settings.historyDays;
  const metrics = overviewMetrics(historyDays);
  const sites = siteComparison();
  const sync = latestSync();
  const gaps = coverageGapTable();
  const syncDetail = parseSyncDetail(sync?.detailJson);
  const recommendations = generateRecommendations({ limit: 20, locale });
  const watchItems = listWatchlist();
  const knownHosts = [...new Set(sites.map((s) => s.host))].sort();
  const calendar = loadDayCalendar(Math.max(historyDays, 90));

  const engines = ["gsc", "bing", "yandex"] as const;
  const cards = engines.map((engine) => {
    const d7 = rollup(metrics, engine, 7);
    const d28 = rollup(metrics, engine, 28);
    const dLong = rollup(metrics, engine, historyDays);
    return { engine, d7, d28, dLong };
  });

  const alerts = sites
    .filter((s) => s.clickDelta <= -10 || s.impressionDelta <= -500)
    .sort((a, b) => a.clickDelta - b.clickDelta)
    .slice(0, 6);

  const hostPairs = new Map<string, { gsc?: number; bing?: number }>();
  for (const s of sites) {
    const row = hostPairs.get(s.host) || {};
    if (s.engine === "gsc") row.gsc = s.clickDelta;
    if (s.engine === "bing") row.bing = s.clickDelta;
    hostPairs.set(s.host, row);
  }
  for (const [host, row] of hostPairs) {
    if ((row.gsc ?? 0) < 0 && (row.bing ?? 0) < 0) {
      alerts.unshift({
        id: -1,
        engine: "gsc",
        host,
        propertyId: host,
        weekClicks: 0,
        weekImpressions: 0,
        clickDelta: (row.gsc || 0) + (row.bing || 0),
        impressionDelta: 0,
        asOf: null,
      });
      break;
    }
  }

  const syncWhen = sync
    ? formatDateTime(sync.finishedAt || sync.startedAt, settings.timeZone, t(locale, "common_never"))
    : t(locale, "common_never");
  const syncMsg = sync?.message || t(locale, "overview_sync_hint");

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">{t(locale, "overview_title")}</h1>
          <p className="mt-1 text-sm text-ink/65">
            {t(locale, "overview_last_sync", { when: syncWhen, message: syncMsg })}
          </p>
        </div>
        <Link href="/guide" className="text-sm text-ink/55 hover:text-accent">
          {t(locale, "common_guide_arrow")}
        </Link>
      </section>

      <SyncStatusBanner
        sync={
          sync
            ? {
                status: sync.status,
                message: sync.message,
                finishedAt: sync.finishedAt,
                startedAt: sync.startedAt,
                detail: syncDetail,
              }
            : null
        }
      />

      <EngineOverviewCards historyDays={historyDays} cards={cards} />

      <TrendCompare historyDays={historyDays} cards={cards} />

      <DayCalendar
        summaries={calendar.summaries}
        byDate={calendar.byDate}
        locale={locale === "zh" ? "zh" : "en"}
      />

      <RecommendationsPanel
        recommendations={recommendations}
        compact
        llmEnabled={settings.llmPolishEnabled}
      />

      <CoverageGapTable rows={gaps.slice(0, 12)} />

      <WatchlistPanel items={watchItems} knownHosts={knownHosts} />

      <section className="panel p-4">
        <h2 className="font-display text-xl">{t(locale, "overview_drop_alerts")}</h2>
        {alerts.length === 0 ? (
          <p className="mt-2 text-sm text-ink/60">{t(locale, "overview_no_drops")}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {alerts.slice(0, 5).map((a, i) => (
              <li key={`${a.host}-${a.engine}-${i}`} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <Link href={`/sites/${encodeURIComponent(a.host)}`} className="underline decoration-line underline-offset-2">
                  {a.host}
                </Link>
                <span className="flex items-center gap-3">
                  <EngineBadge engine={a.engine} />
                  <Delta value={a.clickDelta} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel overflow-x-auto p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl">{t(locale, "overview_sites_week")}</h2>
          <Link href="/sites" className="text-sm text-accent">
            {t(locale, "overview_all_sites")}
          </Link>
        </div>
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-ink/55">
            <tr>
              <th className="pb-2 font-medium">{t(locale, "common_host")}</th>
              <th className="pb-2 font-medium">{t(locale, "common_engine")}</th>
              <th className="pb-2 font-medium">{t(locale, "common_clicks")}</th>
              <th className="pb-2 font-medium">{t(locale, "common_delta")}</th>
              <th className="pb-2 font-medium">{t(locale, "common_impr")}</th>
              <th className="pb-2 font-medium">{t(locale, "common_ctr")}</th>
            </tr>
          </thead>
          <tbody>
            {sites.slice(0, 12).map((s) => (
              <tr key={`${s.engine}-${s.id}`} className="border-t border-line/70">
                <td className="py-2">
                  <Link href={`/sites/${encodeURIComponent(s.host)}`}>{s.host}</Link>
                </td>
                <td>
                  <EngineBadge engine={s.engine} />
                </td>
                <td className="font-mono">{fmt(s.weekClicks)}</td>
                <td>
                  <Delta value={s.clickDelta} />
                </td>
                <td className="font-mono">{fmt(s.weekImpressions)}</td>
                <td className="font-mono">
                  {pct(s.weekImpressions > 0 ? s.weekClicks / s.weekImpressions : 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
