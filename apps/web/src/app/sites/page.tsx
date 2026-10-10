import Link from "next/link";
import { redirect } from "next/navigation";
import { Delta, EngineBadge, fmt } from "@/components/Stat";
import { getSettings } from "@/server/settings";
import { siteComparison } from "@/server/queries";

export const dynamic = "force-dynamic";

export default function SitesPage() {
  if (!getSettings().setupComplete) redirect("/setup");
  const rows = siteComparison();
  const hosts = [...new Set(rows.map((r) => r.host))].sort();

  return (
    <div className="space-y-6">
      <section>
        <h1 className="font-display text-2xl">Sites</h1>
        <p className="mt-1 text-sm text-ink/65">Week clicks and week-over-week deltas by engine.</p>
      </section>
      <section className="panel overflow-x-auto p-4">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-ink/55">
            <tr>
              <th className="pb-2 font-medium">Host</th>
              <th className="pb-2 font-medium">Engine</th>
              <th className="pb-2 font-medium">As of</th>
              <th className="pb-2 font-medium">Clicks</th>
              <th className="pb-2 font-medium">Δ clicks</th>
              <th className="pb-2 font-medium">Impressions</th>
              <th className="pb-2 font-medium">Δ impr.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={`${s.engine}-${s.id}`} className="border-t border-line/70">
                <td className="py-2">
                  <Link className="underline decoration-line underline-offset-2" href={`/sites/${encodeURIComponent(s.host)}`}>
                    {s.host}
                  </Link>
                </td>
                <td>
                  <EngineBadge engine={s.engine} />
                </td>
                <td className="font-mono text-xs">{s.asOf || "—"}</td>
                <td className="font-mono">{fmt(s.weekClicks)}</td>
                <td>
                  <Delta value={s.clickDelta} />
                </td>
                <td className="font-mono">{fmt(s.weekImpressions)}</td>
                <td>
                  <Delta value={s.impressionDelta} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <div className="space-y-2 text-sm text-ink/60">
            <p>No sites yet. Connect engines, select properties in Setup, then run a sync.</p>
            <p className="flex flex-wrap gap-3">
              <Link href="/setup" className="text-accent underline decoration-line underline-offset-2">
                Open Setup →
              </Link>
              <Link href="/guide" className="text-ink/55 underline decoration-line underline-offset-2 hover:text-accent">
                Guide
              </Link>
            </p>
          </div>
        )}
      </section>
      <p className="text-xs text-ink/50">{hosts.length} hosts · {rows.length} engine bindings</p>
    </div>
  );
}
