import { redirect } from "next/navigation";
import { Delta, EngineBadge, fmt } from "@/components/Stat";
import { getSettings } from "@/server/settings";
import { listKeywords } from "@/server/queries";

export const dynamic = "force-dynamic";

export default function KeywordsPage() {
  if (!getSettings().setupComplete) redirect("/setup");
  const rows = listKeywords(250);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="font-display text-2xl">Keywords</h1>
        <p className="mt-1 text-sm text-ink/65">Week movers across connected engines.</p>
      </section>
      <section className="panel overflow-x-auto p-4">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="text-ink/55">
            <tr>
              <th className="pb-2 font-medium">Query</th>
              <th className="pb-2 font-medium">Engine</th>
              <th className="pb-2 font-medium">Host</th>
              <th className="pb-2 font-medium">Clicks</th>
              <th className="pb-2 font-medium">Δ</th>
              <th className="pb-2 font-medium">Impr.</th>
              <th className="pb-2 font-medium">Pos</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-line/70">
                <td className="max-w-[280px] truncate py-2">{r.query}</td>
                <td>
                  <EngineBadge engine={r.engine} />
                </td>
                <td>{r.host}</td>
                <td className="font-mono">{fmt(r.clicks)}</td>
                <td>
                  <Delta value={r.clickDelta} />
                </td>
                <td className="font-mono">{fmt(r.impressions)}</td>
                <td className="font-mono">{r.position ? r.position.toFixed(1) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="text-sm text-ink/60">No keyword snapshots yet. Run a sync.</p>}
      </section>
    </div>
  );
}
