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
  lastSync: {
    status: string;
    message: string | null;
    at: string;
    detail: {
      total: number;
      completed: number;
      ok: number;
      errors: Array<{ engine: string; host: string; propertyId?: string; message: string }>;
    } | null;
  } | null;
};

type SmtpForm = {
  host: string;
  port: string;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  to: string;
};

const emptySmtp: SmtpForm = {
  host: "",
  port: "587",
  secure: false,
  user: "",
  pass: "",
  from: "",
  to: "",
};

export function SettingsForm({ initialSettings, status, sites, lastSync }: Props) {
  const router = useRouter();
  const [settings, setSettings] = useState(initialSettings);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [smtp, setSmtp] = useState<SmtpForm>(emptySmtp);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [liveDetail, setLiveDetail] = useState(lastSync?.detail ?? null);

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
    setMsg("");
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

  async function saveSmtp() {
    setBusy(true);
    setMsg("");
    try {
      const port = Number(smtp.port);
      if (!smtp.host.trim()) throw new Error("SMTP host is required");
      if (!Number.isFinite(port) || port < 1 || port > 65535) throw new Error("SMTP port must be 1–65535");
      if (!smtp.to.trim()) throw new Error("SMTP “to” address is required");
      const smtpPayload: Record<string, string | number | boolean> = {
        host: smtp.host.trim(),
        port,
        secure: smtp.secure,
        user: smtp.user,
        from: smtp.from.trim() || smtp.user,
        to: smtp.to.trim(),
      };
      // Omit blank password so mergeSecrets keeps the existing secret.
      if (smtp.pass) smtpPayload.pass = smtp.pass;
      const res = await fetch("/api/secrets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notify: { smtp: smtpPayload } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setMsg("SMTP saved.");
      setSmtp((s) => ({ ...s, pass: "" }));
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
    setLiveDetail(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed");
      setMsg(data.message);
      if (data.detail) setLiveDetail(data.detail);
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const syncDetail = liveDetail ?? lastSync?.detail;
  const syncErrors = syncDetail?.errors || [];
  const errorsByEngine = syncErrors.reduce<Record<string, typeof syncErrors>>((acc, e) => {
    (acc[e.engine] ||= []).push(e);
    return acc;
  }, {});

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
        <h2 className="font-display text-xl">SMTP</h2>
        <p className="text-sm text-ink/60">
          Email digests via Nodemailer. Current: {status.smtp ? "configured" : "none"}. Password is write-only; leave it blank to keep
          the existing one.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block text-sm md:col-span-2">
            Host
            <input
              className="mt-1 w-full border border-line bg-paper px-3 py-2 text-sm"
              placeholder="smtp.example.com"
              value={smtp.host}
              onChange={(e) => setSmtp({ ...smtp, host: e.target.value })}
              autoComplete="off"
            />
          </label>
          <label className="block text-sm">
            Port
            <input
              type="number"
              min={1}
              max={65535}
              className="mt-1 w-full border border-line bg-paper px-3 py-2 text-sm"
              value={smtp.port}
              onChange={(e) => setSmtp({ ...smtp, port: e.target.value })}
            />
          </label>
          <label className="flex items-end gap-2 pb-2 text-sm">
            <input
              type="checkbox"
              checked={smtp.secure}
              onChange={(e) => setSmtp({ ...smtp, secure: e.target.checked })}
            />
            TLS / SSL (secure)
          </label>
          <label className="block text-sm">
            User
            <input
              className="mt-1 w-full border border-line bg-paper px-3 py-2 text-sm"
              value={smtp.user}
              onChange={(e) => setSmtp({ ...smtp, user: e.target.value })}
              autoComplete="username"
            />
          </label>
          <label className="block text-sm">
            Password
            <input
              type="password"
              className="mt-1 w-full border border-line bg-paper px-3 py-2 text-sm"
              value={smtp.pass}
              onChange={(e) => setSmtp({ ...smtp, pass: e.target.value })}
              autoComplete="current-password"
              placeholder={status.smtp ? "••••••••" : ""}
            />
          </label>
          <label className="block text-sm">
            From
            <input
              className="mt-1 w-full border border-line bg-paper px-3 py-2 text-sm"
              placeholder="alerts@example.com"
              value={smtp.from}
              onChange={(e) => setSmtp({ ...smtp, from: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            To
            <input
              className="mt-1 w-full border border-line bg-paper px-3 py-2 text-sm"
              placeholder="you@example.com"
              value={smtp.to}
              onChange={(e) => setSmtp({ ...smtp, to: e.target.value })}
            />
          </label>
        </div>
        <button disabled={busy} onClick={saveSmtp} className="border border-line bg-mist px-3 py-1.5 text-sm">
          Save SMTP
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
        {syncDetail && (
          <p className="text-sm text-ink/70">
            Progress: {syncDetail.ok} ok / {syncDetail.completed} completed / {syncDetail.total} total
            {syncErrors.length ? ` · ${syncErrors.length} failed` : ""}
          </p>
        )}
        {syncErrors.length > 0 && (
          <div className="space-y-3 border-t border-line/70 pt-3">
            <p className="text-sm font-medium text-ink/80">Failures by engine</p>
            {Object.entries(errorsByEngine).map(([engine, rows]) => (
              <div key={engine}>
                <p className="text-xs uppercase tracking-wide text-ink/50">{engine}</p>
                <ul className="mt-1 space-y-1 text-sm">
                  {rows.map((e, i) => (
                    <li key={`${e.host}-${i}`} className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-3">
                      <span className="font-medium">{e.host}</span>
                      <span className="text-ink/65 sm:max-w-[70%] sm:text-right">{e.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-4">
          <Link href="/setup" className="text-sm text-accent">
            Re-run setup wizard →
          </Link>
          <Link href="/guide" className="text-sm text-ink/55 hover:text-accent">
            Usage guide →
          </Link>
        </div>
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
