"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type SiteOption = { engine: string; host: string; siteUrl: string; label?: string };

type Props = {
  initialSettings: {
    timeZone: string;
    digestHour: number;
    digestMinute: number;
    setupComplete: boolean;
  };
  status: { google: boolean; bing: boolean; yandex: boolean };
};

const steps = ["Environment", "Google", "Bing", "Yandex"] as const;

export function SetupWizard({ initialSettings, status }: Props) {
  const router = useRouter();
  const search = useSearchParams();
  const [step, setStep] = useState(0);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const [timeZone, setTimeZone] = useState(initialSettings.timeZone);
  const [digestHour, setDigestHour] = useState(initialSettings.digestHour);
  const [digestMinute, setDigestMinute] = useState(initialSettings.digestMinute);

  const [gMode, setGMode] = useState<"oauth" | "service_account">("oauth");
  const [gClientId, setGClientId] = useState("");
  const [gClientSecret, setGClientSecret] = useState("");
  const [gSaJson, setGSaJson] = useState("");
  const [gConnected, setGConnected] = useState(status.google);

  const [bingKey, setBingKey] = useState("");
  const [bingConnected, setBingConnected] = useState(status.bing);

  const [yClientId, setYClientId] = useState("");
  const [yClientSecret, setYClientSecret] = useState("");
  const [yToken, setYToken] = useState("");
  const [yConnected, setYConnected] = useState(status.yandex);

  const [options, setOptions] = useState<SiteOption[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const selectedList = useMemo(
    () => options.filter((o) => selected[`${o.engine}:${o.siteUrl}`]),
    [options, selected]
  );

  useEffect(() => {
    const err = search.get("error");
    if (err) setMsg(err);
    if (search.get("google") === "ok") {
      setGConnected(true);
      setStep(1);
      setMsg("Google connected. Sites were saved; continue to Bing or finish later from Yandex step to multi-select.");
      fetch("/api/engines/gsc/sites")
        .then((r) => r.json())
        .then((data) => {
          if (data.sites) mergeOptions(data.sites);
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
      if (!res.ok) throw new Error(data.error || "Failed");
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
      const body =
        gMode === "oauth"
          ? { google: { mode: "oauth", clientId: gClientId, clientSecret: gClientSecret } }
          : { google: { mode: "service_account", serviceAccountJson: gSaJson } };
      const res = await fetch("/api/secrets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");

      if (gMode === "oauth") {
        const auth = await fetch("/api/oauth/google/start");
        const authData = await auth.json();
        if (!auth.ok) throw new Error(authData.error || "OAuth start failed");
        window.location.href = authData.url;
        return;
      }

      const list = await fetch("/api/engines/gsc/sites");
      const listData = await list.json();
      if (!list.ok) throw new Error(listData.error || "List sites failed");
      mergeOptions(listData.sites || []);
      setGConnected(true);
      setMsg(`Loaded ${(listData.sites || []).length} Google properties`);
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
      const res = await fetch("/api/secrets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bing: { apiKey: bingKey } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      const list = await fetch("/api/engines/bing/sites");
      const listData = await list.json();
      if (!list.ok) throw new Error(listData.error || "List sites failed");
      mergeOptions(listData.sites || []);
      setBingConnected(true);
      setMsg(`Loaded ${(listData.sites || []).length} Bing sites`);
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
      const res = await fetch("/api/secrets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          yandex: {
            clientId: yClientId,
            clientSecret: yClientSecret,
            accessToken: yToken || undefined,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");

      if (!yToken) {
        const auth = await fetch("/api/oauth/yandex/start");
        const authData = await auth.json();
        if (!auth.ok) throw new Error(authData.error || "OAuth start failed");
        window.open(authData.url, "_blank", "noopener,noreferrer");
        setMsg("Authorize in the opened window, paste the access_token below, then Connect again.");
        return;
      }

      const list = await fetch("/api/engines/yandex/sites");
      const listData = await list.json();
      if (!list.ok) throw new Error(listData.error || "List hosts failed");
      mergeOptions(listData.sites || []);
      setYConnected(true);
      setMsg(`Loaded ${(listData.sites || []).length} Yandex hosts`);
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
      const next = [...map.values()];
      setSelected((sel) => {
        const copy = { ...sel };
        for (const s of incoming) copy[`${s.engine}:${s.siteUrl}`] = true;
        return copy;
      });
      return next;
    });
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
        if (!res.ok) throw new Error(data.error || "Save sites failed");
      }
      const done = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setupComplete: true, timeZone, digestHour, digestMinute }),
      });
      const doneData = await done.json();
      if (!done.ok) throw new Error(doneData.error || "Finalize failed");
      router.push("/");
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-8">
      <header>
        <p className="font-display text-4xl tracking-tight">GSC · Bing · Yandex</p>
        <p className="mt-2 text-ink/65">Connect Google Search Console, Bing Webmaster Tools, and Yandex Webmaster.</p>
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
          <h2 className="font-display text-xl">Environment</h2>
          <label className="block text-sm">
            Timezone
            <input className="mt-1 w-full border border-line bg-paper px-3 py-2" value={timeZone} onChange={(e) => setTimeZone(e.target.value)} />
          </label>
          <div className="flex gap-3">
            <label className="block text-sm">
              Digest hour
              <input type="number" min={0} max={23} className="mt-1 w-24 border border-line bg-paper px-3 py-2" value={digestHour} onChange={(e) => setDigestHour(Number(e.target.value))} />
            </label>
            <label className="block text-sm">
              Minute
              <input type="number" min={0} max={59} className="mt-1 w-24 border border-line bg-paper px-3 py-2" value={digestMinute} onChange={(e) => setDigestMinute(Number(e.target.value))} />
            </label>
          </div>
          <div className="flex gap-2">
            <button disabled={busy} onClick={saveEnv} className="bg-accent px-3 py-1.5 text-sm text-paper">
              Continue
            </button>
            <button disabled={busy} onClick={() => setStep(1)} className="border border-line px-3 py-1.5 text-sm">
              Skip
            </button>
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="panel space-y-3 p-5">
          <h2 className="font-display text-xl">Google Search Console</h2>
          <div className="flex gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" checked={gMode === "oauth"} onChange={() => setGMode("oauth")} /> OAuth client
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={gMode === "service_account"} onChange={() => setGMode("service_account")} /> Service account JSON
            </label>
          </div>
          {gMode === "oauth" ? (
            <>
              <input className="w-full border border-line bg-paper px-3 py-2 text-sm" placeholder="Client ID" value={gClientId} onChange={(e) => setGClientId(e.target.value)} />
              <input className="w-full border border-line bg-paper px-3 py-2 text-sm" placeholder="Client secret" value={gClientSecret} onChange={(e) => setGClientSecret(e.target.value)} />
              <p className="text-xs text-ink/55">Redirect URI: {typeof window !== "undefined" ? `${window.location.origin}/api/oauth/google/callback` : "/api/oauth/google/callback"}</p>
            </>
          ) : (
            <textarea className="h-40 w-full border border-line bg-paper px-3 py-2 font-mono text-xs" placeholder='{"type":"service_account",...}' value={gSaJson} onChange={(e) => setGSaJson(e.target.value)} />
          )}
          <div className="flex gap-2">
            <button disabled={busy} onClick={saveGoogle} className="bg-accent px-3 py-1.5 text-sm text-paper">
              {gMode === "oauth" ? "Save & authorize" : "Connect & list sites"}
            </button>
            <button disabled={busy} onClick={() => setStep(2)} className="border border-line px-3 py-1.5 text-sm">
              Skip
            </button>
            {gConnected && (
              <button disabled={busy} onClick={() => setStep(2)} className="border border-line px-3 py-1.5 text-sm">
                Next
              </button>
            )}
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="panel space-y-3 p-5">
          <h2 className="font-display text-xl">Bing Webmaster</h2>
          <input className="w-full border border-line bg-paper px-3 py-2 text-sm" placeholder="API key" value={bingKey} onChange={(e) => setBingKey(e.target.value)} />
          <div className="flex gap-2">
            <button disabled={busy} onClick={saveBing} className="bg-accent px-3 py-1.5 text-sm text-paper">
              Connect & list sites
            </button>
            <button disabled={busy} onClick={() => setStep(3)} className="border border-line px-3 py-1.5 text-sm">
              Skip
            </button>
            {bingConnected && (
              <button disabled={busy} onClick={() => setStep(3)} className="border border-line px-3 py-1.5 text-sm">
                Next
              </button>
            )}
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="panel space-y-3 p-5">
          <h2 className="font-display text-xl">Yandex Webmaster</h2>
          <p className="text-xs text-ink/55">Scopes: webmaster:hostinfo, webmaster:verify</p>
          <input className="w-full border border-line bg-paper px-3 py-2 text-sm" placeholder="Client ID" value={yClientId} onChange={(e) => setYClientId(e.target.value)} />
          <input className="w-full border border-line bg-paper px-3 py-2 text-sm" placeholder="Client secret" value={yClientSecret} onChange={(e) => setYClientSecret(e.target.value)} />
          <input className="w-full border border-line bg-paper px-3 py-2 text-sm" placeholder="Access token (after browser authorize)" value={yToken} onChange={(e) => setYToken(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <button disabled={busy} onClick={saveYandex} className="bg-accent px-3 py-1.5 text-sm text-paper">
              {yToken ? "Connect & list hosts" : "Open authorize URL"}
            </button>
            <button disabled={busy} onClick={finish} className="border border-line px-3 py-1.5 text-sm">
              Skip & finish
            </button>
          </div>

          {options.length > 0 && (
            <div className="mt-4 space-y-2 border-t border-line pt-4">
              <h3 className="text-sm font-medium">Select sites to monitor</h3>
              <ul className="max-h-64 space-y-1 overflow-auto text-sm">
                {options.map((o) => {
                  const key = `${o.engine}:${o.siteUrl}`;
                  return (
                    <li key={key} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={Boolean(selected[key])}
                        onChange={(e) => setSelected((s) => ({ ...s, [key]: e.target.checked }))}
                      />
                      <span className="uppercase text-ink/50">{o.engine}</span>
                      <span>{o.host}</span>
                    </li>
                  );
                })}
              </ul>
              <button disabled={busy} onClick={finish} className="bg-accent px-3 py-1.5 text-sm text-paper">
                Finish setup ({selectedList.length} sites)
              </button>
            </div>
          )}
          {(gConnected || bingConnected || yConnected) && !options.length && (
            <button disabled={busy} onClick={finish} className="bg-accent px-3 py-1.5 text-sm text-paper">
              Finish setup
            </button>
          )}
        </section>
      )}

      {msg && <p className="text-sm text-ink/70">{msg}</p>}
    </div>
  );
}
