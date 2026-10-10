import Link from "next/link";
import { redirect } from "next/navigation";
import { Delta, EngineBadge, Sparkline, fmt } from "@/components/Stat";
import { getSettings } from "@/server/settings";
import { latestSync, overviewMetrics, siteComparison } from "@/server/queries";

export const dynamic = "force-dynamic";

function rollup(rows: Array<{ engine: string; date: string; clicks: number; impressions: number }>, engine: string, days: number) {
  const slice = rows.filter((r) => r.engine === engine).slice(-days);
  return {
    clicks: slice.reduce((s, r) => s + Number(r.clicks), 0),
    impressions: slice.reduce((s, r) => s + Number(r.impressions), 0),
    series: slice.map((r) => Number(r.clicks)),
  };
}

export default function OverviewPage() {
  const settings = getSettings();
  if (!settings.setupComplete) redirect("/setup");

  const metrics = overviewMetrics(28);
  const sites = siteComparison();
  const sync = latestSync();

  const engines = ["gsc", "bing", "yandex"] as const;
  const cards = engines.map((engine) => {
    const d7 = rollup(metrics, engine, 7);
    const d28 = rollup(metrics, engine, 28);
    return { engine, d7, d28 };
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

  return (
    <div className="space-y-8">
      <section>
        <h1 className="font-display text-2xl">Overview</h1>
        <p className="mt-1 text-sm text-ink/65">
          Last sync: {sync?.finishedAt || sync?.startedAt || "never"} · {sync?.message || "Run sync from Settings or Digest"}
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <div key={card.engine} className="panel p-4">
            <div className="flex items-center justify-between">
              <EngineBadge engine={card.engine} />
              <span className="font-mono text-xs text-ink/50">28d</span>
            </div>
            <p className="mt-3 font-display text-3xl">{fmt(card.d28.clicks)}</p>
            <p className="text-sm text-ink/60">{fmt(card.d28.impressions)} impressions</p>
            <div className="mt-3">
              <Sparkline
                values={card.d28.series}
                color={card.engine === "gsc" ? "var(--gsc)" : card.engine === "bing" ? "var(--bing)" : "var(--yandex)"}
              />
            </div>
            <p className="mt-2 text-xs text-ink/55">7d clicks {fmt(card.d7.clicks)}</p>
          </div>
        ))}
      </section>

      <section className="panel p-4">
        <h2 className="font-display text-xl">Watchlist</h2>
        {alerts.length === 0 ? (
          <p className="mt-2 text-sm text-ink/60">No large week-over-week drops yet.</p>
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
          <h2 className="font-display text-xl">Sites (week)</h2>
          <Link href="/sites" className="text-sm text-accent">
            All sites →
          </Link>
        </div>
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-ink/55">
            <tr>
              <th className="pb-2 font-medium">Host</th>
              <th className="pb-2 font-medium">Engine</th>
              <th className="pb-2 font-medium">Clicks</th>
              <th className="pb-2 font-medium">Δ</th>
              <th className="pb-2 font-medium">Impr.</th>
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
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
