"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "generate" | "push" | null;

export function DigestActions() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [failed, setFailed] = useState(false);
  const [lastDeliver, setLastDeliver] = useState(false);
  const [confirmMode, setConfirmMode] = useState<Mode>(null);

  async function run(deliver: boolean) {
    setBusy(true);
    setMsg("");
    setFailed(false);
    setConfirmMode(null);
    setLastDeliver(deliver);
    try {
      const res = await fetch("/api/digest/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syncFirst: true, deliver }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" && data.error
            ? data.error
            : `Digest failed (HTTP ${res.status})`
        );
      }
      setMsg(`Saved #${data.id}${data.deliveryNote ? ` · ${data.deliveryNote}` : ""}`);
      router.refresh();
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      setFailed(true);
      setMsg(
        `Digest generation failed: ${detail}. Check connectors and Settings, then retry.`
      );
    } finally {
      setBusy(false);
    }
  }

  function requestRun(deliver: boolean) {
    setMsg("");
    setFailed(false);
    setConfirmMode(deliver ? "push" : "generate");
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {confirmMode ? (
        <div className="panel max-w-sm space-y-3 p-3 text-left text-sm">
          <p>
            {confirmMode === "push"
              ? "Generate a digest now, then push via webhook/SMTP if configured?"
              : "Generate a digest now? This will sync first, then save Markdown/JSON."}
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmMode(null)}
              className="border border-line bg-mist px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => run(confirmMode === "push")}
              className="bg-accent px-3 py-1.5 text-sm text-paper disabled:opacity-50"
            >
              {busy ? "Working…" : "Confirm"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            disabled={busy}
            onClick={() => requestRun(false)}
            className="border border-line bg-mist px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Generate
          </button>
          <button
            disabled={busy}
            onClick={() => requestRun(true)}
            className="bg-accent px-3 py-1.5 text-sm text-paper disabled:opacity-50"
          >
            Generate & push
          </button>
        </div>
      )}
      {msg && (
        <div className="flex flex-col items-end gap-1">
          <p className={`text-xs ${failed ? "text-[var(--warn)]" : "text-ink/60"}`}>{msg}</p>
          {failed && (
            <button
              type="button"
              disabled={busy}
              onClick={() => run(lastDeliver)}
              className="border border-line bg-mist px-2 py-1 text-xs disabled:opacity-50"
            >
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}
