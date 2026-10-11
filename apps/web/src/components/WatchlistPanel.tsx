"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useT } from "@/components/LocaleProvider";

export type WatchItem = {
  id: number;
  host: string;
  watched: boolean;
  note: string;
  updatedAt: string;
};

export function WatchlistPanel({
  items,
  knownHosts,
}: {
  items: WatchItem[];
  knownHosts: string[];
}) {
  const t = useT();
  const router = useRouter();
  const [host, setHost] = useState(knownHosts[0] || "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const watched = useMemo(() => items.filter((i) => i.watched), [items]);

  async function save(nextHost: string, nextNote: string, watchedFlag = true) {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host: nextHost, note: nextNote, watched: watchedFlag }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("settings_save_failed"));
      setMsg(t("watchlist_saved"));
      setNote("");
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel space-y-3 p-4">
      <div>
        <h2 className="font-display text-xl">{t("watchlist_title")}</h2>
        <p className="mt-1 text-sm text-ink/60">{t("watchlist_sub")}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <select
          className="border border-line bg-paper px-3 py-2 text-sm"
          value={host}
          onChange={(e) => setHost(e.target.value)}
        >
          {!knownHosts.length && <option value="">{t("watchlist_no_hosts")}</option>}
          {knownHosts.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        <input
          className="min-w-[200px] flex-1 border border-line bg-paper px-3 py-2 text-sm"
          placeholder={t("watchlist_note_ph")}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button
          type="button"
          disabled={busy || !host}
          onClick={() => void save(host, note, true)}
          className="border border-accent bg-accent px-3 py-1.5 text-sm text-paper disabled:opacity-50"
        >
          {t("watchlist_watch")}
        </button>
      </div>
      {msg && <p className="text-xs text-ink/55">{msg}</p>}
      <ul className="space-y-2 text-sm">
        {watched.map((w) => (
          <li key={w.id} className="flex flex-wrap items-start justify-between gap-2 border-b border-line/50 py-2">
            <div>
              <Link
                href={`/sites/${encodeURIComponent(w.host)}`}
                className="underline decoration-line underline-offset-2"
              >
                {w.host}
              </Link>
              {w.note && <p className="mt-0.5 text-xs text-ink/60">{w.note}</p>}
            </div>
            <button
              type="button"
              className="text-xs text-ink/55 underline"
              onClick={() => void save(w.host, w.note, false)}
            >
              {t("watchlist_unwatch")}
            </button>
          </li>
        ))}
        {!watched.length && <li className="text-ink/50">{t("watchlist_empty")}</li>}
      </ul>
    </section>
  );
}
