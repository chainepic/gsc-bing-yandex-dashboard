"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Props = {
  initialSettings: {
    timeZone: string;
    digestHour: number;
    digestMinute: number;
    setupComplete: boolean;
  };
  status: {
    google: boolean;
    bing: boolean;
    yandex: boolean;
    webhook: boolean;
    smtp: boolean;
  };
  sites: Array<{
    id: number;
    engine: string;
    host: string;
    propertyId: string;
    enabled: boolean;
  }>;
  lastSync: { status: string; message: string | null; at: string } | null;
};

export function SettingsForm({ initialSettings, status, sites, lastSync }: Props) {
  const router = useRouter();
  const [settings, setSettings] = useState(initialSettings);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function saveSettings() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setMsg("Settings saved; cron rescheduled.");
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function saveNotify() {
    setBusy(true);
    try {
      const res = await fetch("/api/secrets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notify: { webhookUrl } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setMsg("Webhook saved.");
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function toggleSite(id: number, enabled: boolean) {
    await fetch("/api/sites", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, enabled }),
    });
    router.refresh();
  }

  async function runSync() {
    setBusy(true);
    setMsg("Syncing…");
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed");
      setMsg(data.message);
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="panel grid gap-4 p-4 md:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-ink/50">Google</p>
          <p className="mt-1">{status.google ? "Connected" : "Not connected"}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-ink/50">Bing</p>
          <p className="mt-1">{status.bing ? "Connected" : "Not connected"}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-ink/50">Yandex</p>
          <p className="mt-1">{status.yandex ? "Connected" : "Not connected"}</p>
        </div>
      </section>

      <section className="panel space-y-3 p-4">
        <h2 className="font-display text-xl">Schedule</h2>
        <label className="block text-sm">
          Timezone
          <input
            className="mt-1 w-full border border-line bg-paper px-3 py-2"
            value={settings.timeZone}
            onChange={(e) => setSettings({ ...settings, timeZone: e.target.value })}
          />
        </label>
        <div className="flex gap-3">
          <label className="block text-sm">
            Hour
            <input
              type="number"
              min={0}
              max={23}
              className="mt-1 w-24 border border-line bg-paper px-3 py-2"
              value={settings.digestHour}
              onChange={(e) => setSettings({ ...settings, digestHour: Number(e.target.value) })}
            />
          </label>
          <label className="block text-sm">
            Minute
            <input
              type="number"
              min={0}
              max={59}
              className="mt-1 w-24 border border-line bg-paper px-3 py-2"
              value={settings.digestMinute}
              onChange={(e) => setSettings({ ...settings, digestMinute: Number(e.target.value) })}
            />
          </label>
        </div>
        <button disabled={busy} onClick={saveSettings} className="bg-accent px-3 py-1.5 text-sm text-paper">
          Save schedule
        </button>
      </section>

      <section className="panel space-y-3 p-4">
        <h2 className="font-display text-xl">Webhook</h2>
        <p className="text-sm text-ink/60">Slack / Discord / generic HTTP. Current: {status.webhook ? "configured" : "none"}</p>
        <input
          className="w-full border border-line bg-paper px-3 py-2 text-sm"
          placeholder="https://hooks.slack.com/..."
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
        />
        <button disabled={busy} onClick={saveNotify} className="border border-line bg-mist px-3 py-1.5 text-sm">
          Save webhook
        </button>
      </section>

      <section className="panel space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl">Sync</h2>
          <button disabled={busy} onClick={runSync} className="bg-accent px-3 py-1.5 text-sm text-paper">
            Run sync now
          </button>
        </div>
        <p className="text-sm text-ink/60">
          Last: {lastSync?.at || "never"} · {lastSync?.status || "—"} · {lastSync?.message || ""}
        </p>
        <Link href="/setup" className="text-sm text-accent">
          Re-run setup wizard →
        </Link>
      </section>

      <section className="panel overflow-x-auto p-4">
        <h2 className="font-display text-xl">Sites</h2>
        <table className="mt-3 w-full min-w-[640px] text-left text-sm">
          <thead className="text-ink/55">
            <tr>
              <th className="pb-2">Enabled</th>
              <th className="pb-2">Engine</th>
              <th className="pb-2">Host</th>
              <th className="pb-2">Property</th>
            </tr>
          </thead>
          <tbody>
            {sites.map((s) => (
              <tr key={s.id} className="border-t border-line/70">
                <td className="py-2">
                  <input type="checkbox" checked={s.enabled} onChange={(e) => toggleSite(s.id, e.target.checked)} />
                </td>
                <td>{s.engine}</td>
                <td>{s.host}</td>
                <td className="font-mono text-xs">{s.propertyId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {msg && <p className="text-sm text-ink/70">{msg}</p>}
    </div>
  );
}
