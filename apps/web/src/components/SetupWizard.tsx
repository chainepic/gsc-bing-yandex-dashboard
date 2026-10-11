"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CredentialsHelp } from "@/components/CredentialsHelp";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { useT } from "@/components/LocaleProvider";
import type { SecretsPublicMeta } from "@/lib/secrets-meta";

type SiteOption = { engine: string; host: string; siteUrl: string; label?: string };

type Props = {
  initialSettings: {
    timeZone: string;
    digestHour: number;
    digestMinute: number;
    setupComplete: boolean;
  };
  status: { google: boolean; bing: boolean; yandex: boolean };
  secretsMeta: SecretsPublicMeta;
};

export function SetupWizard({ initialSettings, status, secretsMeta }: Props) {
  const t = useT();
  const steps = [
    t("setup_step_env"),
    t("setup_step_google"),
    t("setup_step_bing"),
    t("setup_step_yandex"),
  ] as const;
  const router = useRouter();
  const search = useSearchParams();
  const [step, setStep] = useState(0);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const [timeZone, setTimeZone] = useState(initialSettings.timeZone);
  const [digestHour, setDigestHour] = useState(initialSettings.digestHour);
  const [digestMinute, setDigestMinute] = useState(initialSettings.digestMinute);

  const [gMode, setGMode] = useState<"oauth" | "service_account">(
    secretsMeta.google.mode === "service_account" ? "service_account" : "oauth"
  );
  const [gClientId, setGClientId] = useState(secretsMeta.google.clientId || "");
  const [gClientSecret, setGClientSecret] = useState("");
  const [gSaJson, setGSaJson] = useState("");
  const [gConnected, setGConnected] = useState(status.google || secretsMeta.google.connected);
  const [gHasSecret, setGHasSecret] = useState(secretsMeta.google.hasClientSecret);
  const [gHasSa, setGHasSa] = useState(secretsMeta.google.hasServiceAccount);

  const [bingKey, setBingKey] = useState("");
  const [bingConnected, setBingConnected] = useState(status.bing || secretsMeta.bing.connected);
  const [bingHasKey, setBingHasKey] = useState(secretsMeta.bing.hasApiKey);

  const [yClientId, setYClientId] = useState(secretsMeta.yandex.clientId || "");
  const [yClientSecret, setYClientSecret] = useState("");
  const [yToken, setYToken] = useState("");
  const [yConnected, setYConnected] = useState(status.yandex || secretsMeta.yandex.connected);
  const [yHasSecret, setYHasSecret] = useState(secretsMeta.yandex.hasClientSecret);

  const [options, setOptions] = useState<SiteOption[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const selectedList = useMemo(
    () => options.filter((o) => selected[`${o.engine}:${o.siteUrl}`]),
    [options, selected]
  );

  const optionsForStep = useMemo(() => {
    if (step === 1) return options.filter((o) => o.engine === "gsc");
    if (step === 2) return options.filter((o) => o.engine === "bing");
    if (step === 3) return options;
    return [];
  }, [options, step]);

  function friendlyEngineError(err: string, engine: "gsc" | "yandex", fallback: string) {
    if (
      engine === "gsc" &&
      /GSC_API_DISABLED|Search Console API has not been used|it is disabled/i.test(err)
    ) {
      return t("setup_err_gsc_api_disabled");
    }
    if (engine === "yandex" && /unreachable|fetch failed|Connect Timeout|UND_ERR_CONNECT/i.test(err)) {
      return t("setup_err_yandex_network");
    }
    return err || fallback;
  }

  useEffect(() => {
    const err = search.get("error");
    if (err) setMsg(err);
    if (search.get("google") === "ok") {
      setGConnected(true);
      setStep(1);
      setMsg(t("setup_msg_google_ok"));
      fetch("/api/engines/gsc/sites")
        .then(async (r) => {
          const data = await r.json();
          if (data.sites) {
            mergeOptions(data.sites);
            return;
          }
          if (data.error) setMsg(friendlyEngineError(String(data.error), "gsc", t("setup_err_list_sites")));
        })
        .catch(() => undefined);
    }
    if (search.get("yandex") === "ok") {
      setYConnected(true);
      setStep(3);
      setMsg(t("setup_msg_yandex_ok"));
      fetch("/api/engines/yandex/sites")
        .then(async (r) => {
          const data = await r.json();
          if (data.sites) {
            mergeOptions(data.sites);
            return;
          }
          if (data.error) setMsg(friendlyEngineError(String(data.error), "yandex", t("setup_err_list_hosts")));
        })
        .catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function saveEnv() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeZone, digestHour, digestMinute }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("setup_err_failed"));
      setStep(1);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function saveGoogle() {
    setBusy(true);
    setMsg("");
    try {
      if (gMode === "oauth") {
        const clientId = gClientId.trim() || secretsMeta.google.clientId;
        if (!clientId) throw new Error(t("setup_err_need_client_id"));
        if (!gClientSecret.trim() && !gHasSecret && !secretsMeta.google.hasClientSecret) {
          throw new Error(t("setup_err_need_client_secret"));
        }
        const google: Record<string, string> = { mode: "oauth", clientId };
        if (gClientSecret.trim()) google.clientSecret = gClientSecret.trim();
        const res = await fetch("/api/secrets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ google }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || t("setup_err_failed"));
        if (gClientSecret.trim()) setGHasSecret(true);
        setGClientSecret("");
        const auth = await fetch("/api/oauth/google/start");
        const authData = await auth.json();
        if (!auth.ok) throw new Error(authData.error || t("setup_err_oauth"));
        window.location.href = authData.url;
        return;
      }

      if (!gSaJson.trim() && !gHasSa) throw new Error(t("setup_err_need_sa"));
      const google: Record<string, string> = { mode: "service_account" };
      if (gSaJson.trim()) google.serviceAccountJson = gSaJson.trim();
      const res = await fetch("/api/secrets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ google }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("setup_err_failed"));
      if (gSaJson.trim()) {
        setGHasSa(true);
        setGSaJson("");
      }

      const list = await fetch("/api/engines/gsc/sites");
      const listData = await list.json();
      if (!list.ok) {
        throw new Error(friendlyEngineError(String(listData.error || ""), "gsc", t("setup_err_list_sites")));
      }
      mergeOptions(listData.sites || []);
      setGConnected(true);
      setMsg(t("setup_msg_loaded_gsc", { n: (listData.sites || []).length }));
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function saveBing() {
    setBusy(true);
    setMsg("");
    try {
      if (!bingKey.trim() && !bingHasKey) throw new Error(t("setup_err_need_api_key"));
      const bing = bingKey.trim() ? { apiKey: bingKey.trim() } : undefined;
      if (bing) {
        const res = await fetch("/api/secrets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bing }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || t("setup_err_failed"));
        setBingHasKey(true);
        setBingKey("");
      }
      const list = await fetch("/api/engines/bing/sites");
      const listData = await list.json();
      if (!list.ok) throw new Error(listData.error || t("setup_err_list_sites"));
      mergeOptions(listData.sites || []);
      setBingConnected(true);
      setMsg(t("setup_msg_loaded_bing", { n: (listData.sites || []).length }));
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function saveYandex() {
    setBusy(true);
    setMsg("");
    try {
      const clientId = yClientId.trim() || secretsMeta.yandex.clientId;
      if (!yToken.trim()) {
        if (!clientId) throw new Error(t("setup_err_need_client_id"));
        if (!yClientSecret.trim() && !yHasSecret) throw new Error(t("setup_err_need_client_secret"));
      }
      const yandex: Record<string, string> = {};
      if (clientId) yandex.clientId = clientId;
      if (yClientSecret.trim()) yandex.clientSecret = yClientSecret.trim();
      if (yToken.trim()) yandex.accessToken = yToken.trim();
      if (Object.keys(yandex).length) {
        const res = await fetch("/api/secrets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ yandex }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || t("setup_err_failed"));
        if (yClientSecret.trim()) {
          setYHasSecret(true);
          setYClientSecret("");
        }
      }

      if (!yToken.trim()) {
        const auth = await fetch("/api/oauth/yandex/start");
        const authData = await auth.json();
        if (!auth.ok) throw new Error(authData.error || t("setup_err_oauth"));
        window.location.href = authData.url;
        return;
      }

      const list = await fetch("/api/engines/yandex/sites");
      const listData = await list.json();
      if (!list.ok) {
        throw new Error(
          friendlyEngineError(String(listData.error || ""), "yandex", t("setup_err_list_hosts"))
        );
      }
      mergeOptions(listData.sites || []);
      setYConnected(true);
      setYToken("");
      setMsg(t("setup_msg_loaded_yandex", { n: (listData.sites || []).length }));
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function mergeOptions(incoming: SiteOption[]) {
    setOptions((prev) => {
      const map = new Map(prev.map((p) => [`${p.engine}:${p.siteUrl}`, p]));
      for (const s of incoming) map.set(`${s.engine}:${s.siteUrl}`, s);
      return [...map.values()];
    });
    setSelected((sel) => {
      const copy = { ...sel };
      for (const s of incoming) {
        const key = `${s.engine}:${s.siteUrl}`;
        if (copy[key] === undefined) copy[key] = true;
      }
      return copy;
    });
  }

  async function saveSelectionOnly() {
    setBusy(true);
    setMsg("");
    try {
      if (!selectedList.length) throw new Error(t("setup_err_select_one"));
      const res = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sites: selectedList.map((s) => ({
            engine: s.engine,
            host: s.host,
            propertyId: s.siteUrl,
            enabled: true,
            label: s.label,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("setup_err_save_sites"));
      setMsg(t("setup_msg_saved_sites", { n: selectedList.length }));
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    setBusy(true);
    setMsg("");
    try {
      if (selectedList.length) {
        const res = await fetch("/api/sites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sites: selectedList.map((s) => ({
              engine: s.engine,
              host: s.host,
              propertyId: s.siteUrl,
              enabled: true,
              label: s.label,
            })),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || t("setup_err_save_sites"));
      }
      const done = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setupComplete: true, timeZone, digestHour, digestMinute }),
      });
      const doneData = await done.json();
      if (!done.ok) throw new Error(doneData.error || t("setup_err_finalize"));
      router.push("/");
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function SitePicker({ list, showAllEngines }: { list: SiteOption[]; showAllEngines?: boolean }) {
    if (!list.length) return null;
    return (
      <div className="mt-4 space-y-2 border-t border-line pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-medium">{t("setup_select_sites")}</h3>
          <div className="flex gap-2 text-xs">
            <button
              type="button"
              className="text-accent"
              onClick={() =>
                setSelected((sel) => {
                  const copy = { ...sel };
                  for (const o of list) copy[`${o.engine}:${o.siteUrl}`] = true;
                  return copy;
                })
              }
            >
              {t("setup_select_all")}
            </button>
            <button
              type="button"
              className="text-ink/55"
              onClick={() =>
                setSelected((sel) => {
                  const copy = { ...sel };
                  for (const o of list) copy[`${o.engine}:${o.siteUrl}`] = false;
                  return copy;
                })
              }
            >
              {t("setup_clear")}
            </button>
          </div>
        </div>
        <ul className="max-h-64 space-y-1 overflow-auto text-sm">
          {list.map((o) => {
            const key = `${o.engine}:${o.siteUrl}`;
            return (
              <li key={key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(selected[key])}
                  onChange={(e) => setSelected((s) => ({ ...s, [key]: e.target.checked }))}
                />
                {(showAllEngines || step === 3) && <span className="uppercase text-ink/50">{o.engine}</span>}
                <span className="truncate">{o.host}</span>
              </li>
            );
          })}
        </ul>
        <div className="flex flex-wrap gap-2">
          <button disabled={busy} onClick={saveSelectionOnly} className="border border-line px-3 py-1.5 text-sm">
            {t("setup_save_selection", { n: list.filter((o) => selected[`${o.engine}:${o.siteUrl}`]).length })}
          </button>
          {step === 3 && (
            <button disabled={busy} onClick={finish} className="bg-accent px-3 py-1.5 text-sm text-paper">
              {t("setup_finish_n", { n: selectedList.length })}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-8">
      <header>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="font-display text-4xl tracking-tight">GSC · Bing · Yandex</p>
          <LocaleSwitcher variant="prominent" className="shrink-0 border border-line px-1 py-0.5" />
        </div>
        <p className="mt-2 text-ink/65">{t("setup_sub")}</p>
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <Link href="/guide" className="text-accent underline decoration-line underline-offset-2">
            {t("setup_how_to")}
          </Link>
          <Link href="/prompt" className="text-accent underline decoration-line underline-offset-2">
            {t("setup_ai_prompt")}
          </Link>
        </p>
      </header>

      <ol className="flex flex-wrap gap-2 text-sm">
        {steps.map((label, i) => (
          <li
            key={label}
            className={`px-3 py-1 ${i === step ? "bg-accent text-paper" : i < step ? "bg-mist" : "border border-line"}`}
          >
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <section className="panel space-y-3 p-5">
          <h2 className="font-display text-xl">{t("setup_step_env")}</h2>
          <label className="block text-sm">
            {t("settings_timezone")}
            <input className="mt-1 w-full border border-line bg-paper px-3 py-2" value={timeZone} onChange={(e) => setTimeZone(e.target.value)} />
          </label>
          <div className="flex gap-3">
            <label className="block text-sm">
              {t("setup_digest_hour")}
              <input type="number" min={0} max={23} className="mt-1 w-24 border border-line bg-paper px-3 py-2" value={digestHour} onChange={(e) => setDigestHour(Number(e.target.value))} />
            </label>
            <label className="block text-sm">
              {t("settings_minute")}
              <input type="number" min={0} max={59} className="mt-1 w-24 border border-line bg-paper px-3 py-2" value={digestMinute} onChange={(e) => setDigestMinute(Number(e.target.value))} />
            </label>
          </div>
          <div className="flex gap-2">
            <button disabled={busy} onClick={saveEnv} className="bg-accent px-3 py-1.5 text-sm text-paper">
              {t("setup_continue")}
            </button>
            <button disabled={busy} onClick={() => setStep(1)} className="border border-line px-3 py-1.5 text-sm">
              {t("setup_skip")}
            </button>
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="panel space-y-3 p-5">
          <h2 className="font-display text-xl">{t("setup_gsc_title")}</h2>
          <p className="text-sm text-ink/65 leading-relaxed">{t("setup_gsc_oauth_prefer")}</p>
          {gConnected && (
            <p className="rounded border border-line bg-paper px-3 py-2 text-sm text-ink/80">{t("setup_google_connected_banner")}</p>
          )}
          <div className="flex flex-wrap gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" checked={gMode === "oauth"} onChange={() => setGMode("oauth")} /> {t("setup_oauth_client")}
            </label>
            <label className="flex items-center gap-2 text-ink/70">
              <input type="radio" checked={gMode === "service_account"} onChange={() => setGMode("service_account")} /> {t("setup_sa_json")}
            </label>
          </div>
          {gMode === "oauth" ? (
            <>
              <input
                className="w-full border border-line bg-paper px-3 py-2 text-sm"
                placeholder={t("setup_client_id")}
                value={gClientId}
                onChange={(e) => setGClientId(e.target.value)}
                autoComplete="off"
              />
              <input
                className="w-full border border-line bg-paper px-3 py-2 text-sm"
                type="password"
                placeholder={gHasSecret ? t("setup_client_secret_kept") : t("setup_client_secret")}
                value={gClientSecret}
                onChange={(e) => setGClientSecret(e.target.value)}
                autoComplete="new-password"
              />
              {(gHasSecret || gClientId) && (
                <p className="text-xs text-ink/55">{t("setup_creds_saved")}</p>
              )}
              <p className="text-xs text-ink/55">
                {t("setup_redirect_uri")}{" "}
                <code className="font-mono">
                  {typeof window !== "undefined" ? `${window.location.origin}/api/oauth/google/callback` : "/api/oauth/google/callback"}
                </code>
              </p>
            </>
          ) : (
            <>
              {gHasSa && <p className="text-xs text-ink/55">{t("setup_sa_kept")}</p>}
              <textarea
                className="h-40 w-full border border-line bg-paper px-3 py-2 font-mono text-xs"
                placeholder={gHasSa ? t("setup_sa_kept") : '{"type":"service_account",...}'}
                value={gSaJson}
                onChange={(e) => setGSaJson(e.target.value)}
              />
            </>
          )}
          <CredentialsHelp engine="google" googleMode={gMode} defaultOpen={!gConnected} />
          <div className="flex gap-2">
            <button disabled={busy} onClick={saveGoogle} className="bg-accent px-3 py-1.5 text-sm text-paper">
              {gMode === "oauth"
                ? gConnected
                  ? t("setup_reconnect")
                  : t("setup_save_authorize")
                : t("setup_connect_list")}
            </button>
            <button disabled={busy} onClick={() => setStep(2)} className="border border-line px-3 py-1.5 text-sm">
              {t("setup_skip")}
            </button>
            {gConnected && (
              <button disabled={busy} onClick={() => setStep(2)} className="border border-line px-3 py-1.5 text-sm">
                {t("setup_next")}
              </button>
            )}
          </div>
          <SitePicker list={optionsForStep} />
        </section>
      )}

      {step === 2 && (
        <section className="panel space-y-3 p-5">
          <h2 className="font-display text-xl">{t("setup_bing_title")}</h2>
          {bingConnected && (
            <p className="rounded border border-line bg-paper px-3 py-2 text-sm text-ink/80">{t("setup_bing_connected_banner")}</p>
          )}
          <input
            className="w-full border border-line bg-paper px-3 py-2 text-sm"
            type="password"
            placeholder={bingHasKey ? t("setup_api_key_kept") : t("setup_api_key")}
            value={bingKey}
            onChange={(e) => setBingKey(e.target.value)}
            autoComplete="new-password"
          />
          <CredentialsHelp engine="bing" defaultOpen={!bingConnected} />
          <div className="flex gap-2">
            <button disabled={busy} onClick={saveBing} className="bg-accent px-3 py-1.5 text-sm text-paper">
              {t("setup_connect_list")}
            </button>
            <button disabled={busy} onClick={() => setStep(3)} className="border border-line px-3 py-1.5 text-sm">
              {t("setup_skip")}
            </button>
            {bingConnected && (
              <button disabled={busy} onClick={() => setStep(3)} className="border border-line px-3 py-1.5 text-sm">
                {t("setup_next")}
              </button>
            )}
          </div>
          <SitePicker list={optionsForStep} />
        </section>
      )}

      {step === 3 && (
        <section className="panel space-y-3 p-5">
          <h2 className="font-display text-xl">{t("setup_yandex_title")}</h2>
          <p className="text-xs text-ink/55">{t("setup_yandex_hint")}</p>
          {yConnected && (
            <p className="rounded border border-line bg-paper px-3 py-2 text-sm text-ink/80">{t("setup_yandex_connected_banner")}</p>
          )}
          <input
            className="w-full border border-line bg-paper px-3 py-2 text-sm"
            placeholder={t("setup_client_id")}
            value={yClientId}
            onChange={(e) => setYClientId(e.target.value)}
            autoComplete="off"
          />
          <input
            className="w-full border border-line bg-paper px-3 py-2 text-sm"
            type="password"
            placeholder={yHasSecret ? t("setup_client_secret_kept") : t("setup_client_secret")}
            value={yClientSecret}
            onChange={(e) => setYClientSecret(e.target.value)}
            autoComplete="new-password"
          />
          <input
            className="w-full border border-line bg-paper px-3 py-2 text-sm"
            placeholder={t("setup_token_optional")}
            value={yToken}
            onChange={(e) => setYToken(e.target.value)}
          />
          <CredentialsHelp engine="yandex" defaultOpen={!yConnected} />
          <div className="flex flex-wrap gap-2">
            <button disabled={busy} onClick={saveYandex} className="bg-accent px-3 py-1.5 text-sm text-paper">
              {yToken ? t("setup_connect_hosts") : yConnected ? t("setup_reconnect") : t("setup_save_authorize")}
            </button>
            <button disabled={busy} onClick={finish} className="border border-line px-3 py-1.5 text-sm">
              {t("setup_skip_finish")}
            </button>
          </div>

          <SitePicker list={optionsForStep} showAllEngines />
          {(gConnected || bingConnected || yConnected) && !options.length && (
            <button disabled={busy} onClick={finish} className="bg-accent px-3 py-1.5 text-sm text-paper">
              {t("setup_finish")}
            </button>
          )}
        </section>
      )}

      {msg && <p className="text-sm text-ink/70">{msg}</p>}
    </div>
  );
}
