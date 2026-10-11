"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLocale, useT } from "@/components/LocaleProvider";
import { formatDateTime } from "@/lib/format";

type DigestSections = {
  engines: boolean;
  watch: boolean;
  sites: boolean;
  keywords: boolean;
  recommendations: boolean;
};

type Props = {
  initialSettings: {
    timeZone: string;
    digestHour: number;
    digestMinute: number;
    setupComplete: boolean;
    digestIncludeRecommendations: boolean;
    crawlMaxUrlsPerHost: number;
    crawlConcurrency: number;
    bingUrlSubmitEnabled: boolean;
    historyDays: number;
    uiLocale: "en" | "zh";
    digestLocale: "en" | "zh";
    digestSections: DigestSections;
    llmPolishEnabled: boolean;
    llmBaseUrl: string;
    llmModel: string;
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
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [settings, setSettings] = useState(initialSettings);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [smtp, setSmtp] = useState<SmtpForm>(emptySmtp);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [liveDetail, setLiveDetail] = useState(lastSync?.detail ?? null);

  // Keep the Settings select in sync when locale is changed from Nav / Setup toggles.
  useEffect(() => {
    setSettings((s) => (s.uiLocale === locale ? s : { ...s, uiLocale: locale }));
  }, [locale]);

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
      if (!res.ok) throw new Error(data.error || t("settings_save_failed"));
      setMsg(t("settings_saved"));
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
      if (!res.ok) throw new Error(data.error || t("settings_save_failed"));
      setMsg(t("settings_webhook_saved"));
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
      if (!smtp.host.trim()) throw new Error(t("settings_smtp_host_req"));
      if (!Number.isFinite(port) || port < 1 || port > 65535) throw new Error(t("settings_smtp_port_bad"));
      if (!smtp.to.trim()) throw new Error(t("settings_smtp_to_req"));
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
      if (!res.ok) throw new Error(data.error || t("settings_save_failed"));
      setMsg(t("settings_smtp_saved"));
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
    setMsg(t("settings_syncing"));
    setLiveDetail(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("settings_sync_failed"));
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
          <p className="mt-1">{status.google ? t("common_connected") : t("common_not_connected")}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-ink/50">Bing</p>
          <p className="mt-1">{status.bing ? t("common_connected") : t("common_not_connected")}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-ink/50">Yandex</p>
          <p className="mt-1">{status.yandex ? t("common_connected") : t("common_not_connected")}</p>
        </div>
      </section>

      <section className="panel space-y-3 p-4">
        <h2 className="font-display text-xl">{t("settings_schedule")}</h2>
        <label className="block text-sm">
          {t("settings_timezone")}
          <input
            className="mt-1 w-full border border-line bg-paper px-3 py-2"
            value={settings.timeZone}
            onChange={(e) => setSettings({ ...settings, timeZone: e.target.value })}
          />
        </label>
        <div className="flex gap-3">
          <label className="block text-sm">
            {t("settings_hour")}
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
            {t("settings_minute")}
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
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={settings.digestIncludeRecommendations}
            onChange={(e) =>
              setSettings({ ...settings, digestIncludeRecommendations: e.target.checked })
            }
          />
          <span>
            {t("settings_include_recs")}
            <span className="mt-0.5 block text-xs text-ink/55">{t("settings_include_recs_hint")}</span>
          </span>
        </label>
        <button disabled={busy} onClick={saveSettings} className="bg-accent px-3 py-1.5 text-sm text-paper">
          {t("settings_save_schedule")}
        </button>
      </section>

      <section className="panel space-y-3 p-4">
        <h2 className="font-display text-xl">{t("settings_crawl")}</h2>
        <p className="text-sm text-ink/60">{t("settings_crawl_body")}</p>
        <div className="flex flex-wrap gap-3">
          <label className="block text-sm">
            {t("settings_max_urls")}
            <input
              type="number"
              min={1}
              max={50}
              className="mt-1 w-28 border border-line bg-paper px-3 py-2"
              value={settings.crawlMaxUrlsPerHost}
              onChange={(e) =>
                setSettings({ ...settings, crawlMaxUrlsPerHost: Number(e.target.value) })
              }
            />
          </label>
          <label className="block text-sm">
            {t("settings_concurrency")}
            <input
              type="number"
              min={1}
              max={8}
              className="mt-1 w-28 border border-line bg-paper px-3 py-2"
              value={settings.crawlConcurrency}
              onChange={(e) => setSettings({ ...settings, crawlConcurrency: Number(e.target.value) })}
            />
          </label>
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={settings.bingUrlSubmitEnabled}
            onChange={(e) => setSettings({ ...settings, bingUrlSubmitEnabled: e.target.checked })}
          />
          <span>
            {t("settings_bing_submit")}
            <span className="mt-0.5 block text-xs text-ink/55">{t("settings_bing_submit_hint")}</span>
          </span>
        </label>
        <button disabled={busy} onClick={saveSettings} className="border border-line bg-mist px-3 py-1.5 text-sm">
          {t("settings_save_crawl")}
        </button>
      </section>

      <section className="panel space-y-3 p-4">
        <h2 className="font-display text-xl">{t("settings_history_locale")}</h2>
        <label className="block text-sm">
          {t("settings_history_window")}
          <select
            className="mt-1 block border border-line bg-paper px-3 py-2"
            value={settings.historyDays}
            onChange={(e) => setSettings({ ...settings, historyDays: Number(e.target.value) })}
          >
            <option value={28}>{t("settings_days", { n: 28 })}</option>
            <option value={56}>{t("settings_days", { n: 56 })}</option>
            <option value={90}>{t("settings_days", { n: 90 })}</option>
          </select>
        </label>
        <div className="flex flex-wrap gap-3">
          <label className="block text-sm">
            {t("settings_ui_lang")}
            <select
              className="mt-1 block border border-line bg-paper px-3 py-2"
              value={settings.uiLocale}
              onChange={(e) =>
                setSettings({ ...settings, uiLocale: e.target.value as "en" | "zh" })
              }
            >
              <option value="en">English</option>
              <option value="zh">中文</option>
            </select>
          </label>
          <label className="block text-sm">
            {t("settings_digest_lang")}
            <select
              className="mt-1 block border border-line bg-paper px-3 py-2"
              value={settings.digestLocale}
              onChange={(e) =>
                setSettings({ ...settings, digestLocale: e.target.value as "en" | "zh" })
              }
            >
              <option value="en">English</option>
              <option value="zh">中文</option>
            </select>
          </label>
        </div>
        <p className="text-xs text-ink/55">{t("settings_digest_sections")}</p>
        <p className="text-xs text-ink/45">{t("settings_ui_lang_hint")}</p>
        <p className="text-xs text-ink/45">{t("settings_digest_lang_hint")}</p>
        <div className="flex flex-wrap gap-3 text-sm">
          {(
            [
              ["engines", t("settings_sec_engines")],
              ["watch", t("settings_sec_watch")],
              ["sites", t("settings_sec_sites")],
              ["keywords", t("settings_sec_keywords")],
              ["recommendations", t("settings_sec_recs")],
            ] as Array<[keyof DigestSections, string]>
          ).map(([key, label]) => (
            <label key={key} className="inline-flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={settings.digestSections[key]}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    digestSections: { ...settings.digestSections, [key]: e.target.checked },
                    digestIncludeRecommendations:
                      key === "recommendations" ? e.target.checked : settings.digestIncludeRecommendations,
                  })
                }
              />
              {label}
            </label>
          ))}
        </div>
        <button disabled={busy} onClick={saveSettings} className="border border-line bg-mist px-3 py-1.5 text-sm">
          {t("settings_save_history")}
        </button>
      </section>

      <section className="panel space-y-3 p-4">
        <h2 className="font-display text-xl">{t("settings_llm")}</h2>
        <p className="text-sm text-ink/60">{t("settings_llm_body")}</p>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={settings.llmPolishEnabled}
            onChange={(e) => setSettings({ ...settings, llmPolishEnabled: e.target.checked })}
          />
          <span>{t("settings_llm_enable")}</span>
        </label>
        <label className="block text-sm">
          {t("settings_llm_base")}
          <input
            className="mt-1 w-full border border-line bg-paper px-3 py-2"
            value={settings.llmBaseUrl}
            onChange={(e) => setSettings({ ...settings, llmBaseUrl: e.target.value })}
            placeholder="http://127.0.0.1:11434"
          />
        </label>
        <label className="block text-sm">
          {t("settings_llm_model")}
          <input
            className="mt-1 w-full max-w-sm border border-line bg-paper px-3 py-2"
            value={settings.llmModel}
            onChange={(e) => setSettings({ ...settings, llmModel: e.target.value })}
            placeholder="llama3.2"
          />
        </label>
        <button disabled={busy} onClick={saveSettings} className="border border-line bg-mist px-3 py-1.5 text-sm">
          {t("settings_save_llm")}
        </button>
      </section>

      <section className="panel space-y-3 p-4">
        <h2 className="font-display text-xl">{t("settings_webhook")}</h2>
        <p className="text-sm text-ink/60">{t("settings_webhook_body", { status: status.webhook ? t("common_configured") : t("common_none_lower") })}</p>
        <input
          className="w-full border border-line bg-paper px-3 py-2 text-sm"
          placeholder="https://hooks.slack.com/..."
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
        />
        <button disabled={busy} onClick={saveNotify} className="border border-line bg-mist px-3 py-1.5 text-sm">
          {t("settings_save_webhook")}
        </button>
      </section>

      <section className="panel space-y-3 p-4">
        <h2 className="font-display text-xl">{t("settings_smtp")}</h2>
        <p className="text-sm text-ink/60">
          {t("settings_smtp_body", { status: status.smtp ? t("common_configured") : t("common_none_lower") })}
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block text-sm md:col-span-2">
            {t("settings_smtp_host")}
            <input
              className="mt-1 w-full border border-line bg-paper px-3 py-2 text-sm"
              placeholder="smtp.example.com"
              value={smtp.host}
              onChange={(e) => setSmtp({ ...smtp, host: e.target.value })}
              autoComplete="off"
            />
          </label>
          <label className="block text-sm">
            {t("settings_smtp_port")}
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
            {t("settings_smtp_secure")}
          </label>
          <label className="block text-sm">
            {t("settings_smtp_user")}
            <input
              className="mt-1 w-full border border-line bg-paper px-3 py-2 text-sm"
              value={smtp.user}
              onChange={(e) => setSmtp({ ...smtp, user: e.target.value })}
              autoComplete="username"
            />
          </label>
          <label className="block text-sm">
            {t("settings_smtp_pass")}
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
            {t("settings_smtp_from")}
            <input
              className="mt-1 w-full border border-line bg-paper px-3 py-2 text-sm"
              placeholder="alerts@example.com"
              value={smtp.from}
              onChange={(e) => setSmtp({ ...smtp, from: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            {t("settings_smtp_to")}
            <input
              className="mt-1 w-full border border-line bg-paper px-3 py-2 text-sm"
              placeholder="you@example.com"
              value={smtp.to}
              onChange={(e) => setSmtp({ ...smtp, to: e.target.value })}
            />
          </label>
        </div>
        <button disabled={busy} onClick={saveSmtp} className="border border-line bg-mist px-3 py-1.5 text-sm">
          {t("settings_save_smtp")}
        </button>
      </section>

      <section className="panel space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl">{t("settings_sync")}</h2>
          <button disabled={busy} onClick={runSync} className="bg-accent px-3 py-1.5 text-sm text-paper">
            {t("settings_run_sync")}
          </button>
        </div>
        <p className="text-sm text-ink/60">
          {t("settings_last_sync", {
            at: lastSync?.at
              ? formatDateTime(lastSync.at, settings.timeZone, t("common_never"))
              : t("common_never"),
            status: lastSync?.status || "—",
            message: lastSync?.message || "",
          })}
        </p>
        {syncDetail && (
          <p className="text-sm text-ink/70">
            {t("settings_progress", {
              ok: syncDetail.ok,
              completed: syncDetail.completed,
              total: syncDetail.total,
            })}
            {syncErrors.length ? t("settings_failed_n", { n: syncErrors.length }) : ""}
          </p>
        )}
        {syncErrors.length > 0 && (
          <div className="space-y-3 border-t border-line/70 pt-3">
            <p className="text-sm font-medium text-ink/80">{t("settings_failures")}</p>
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
            {t("settings_rerun_setup")}
          </Link>
          <Link href="/guide" className="text-sm text-ink/55 hover:text-accent">
            {t("settings_usage_guide")}
          </Link>
        </div>
      </section>

      <section className="panel overflow-x-auto p-4">
        <h2 className="font-display text-xl">{t("settings_sites")}</h2>
        <table className="mt-3 w-full min-w-[640px] text-left text-sm">
          <thead className="text-ink/55">
            <tr>
              <th className="pb-2">{t("common_enabled")}</th>
              <th className="pb-2">{t("common_engine")}</th>
              <th className="pb-2">{t("common_host")}</th>
              <th className="pb-2">{t("common_property")}</th>
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
