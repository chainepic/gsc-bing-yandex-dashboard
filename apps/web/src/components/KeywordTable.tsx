"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Delta, EngineBadge, fmt } from "@/components/Stat";

export type KeywordRow = {
  id: number;
  query: string;
  engine: string;
  host: string;
  clicks: number;
  clickDelta: number;
  impressions: number;
  position: number | null;
};

export function KeywordTable({ rows }: { rows: KeywordRow[] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (r) =>
        r.query.toLowerCase().includes(needle) ||
        r.host.toLowerCase().includes(needle) ||
        r.engine.toLowerCase().includes(needle)
    );
  }, [rows, q]);

  return (
    <section className="panel space-y-3 overflow-x-auto p-4">
      <label className="block text-sm">
        Filter
        <input
          className="mt-1 w-full max-w-md border border-line bg-paper px-3 py-2 text-sm"
          placeholder="Search query, host, or engine…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Filter keywords"
        />
      </label>
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
          {filtered.map((r) => (
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
      {!rows.length && (
        <div className="space-y-2 text-sm text-ink/60">
          <p>No keyword snapshots yet. Select sites, then run a sync from Settings.</p>
          <p className="flex flex-wrap gap-3">
            <Link href="/settings" className="text-accent underline decoration-line underline-offset-2">
              Settings → Sync
            </Link>
            <Link href="/guide" className="text-ink/55 underline decoration-line underline-offset-2 hover:text-accent">
              Guide
            </Link>
          </p>
        </div>
      )}
      {rows.length > 0 && !filtered.length && (
        <p className="text-sm text-ink/60">No keywords match “{q.trim()}”.</p>
      )}
      {rows.length > 0 && filtered.length > 0 && q.trim() && (
        <p className="text-xs text-ink/50">
          Showing {filtered.length} of {rows.length}
        </p>
      )}
    </section>
  );
}
