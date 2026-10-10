"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DigestActions() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function run(deliver: boolean) {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/digest/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syncFirst: true, deliver }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setMsg(`Saved #${data.id}${data.deliveryNote ? ` · ${data.deliveryNote}` : ""}`);
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <button
          disabled={busy}
          onClick={() => run(false)}
          className="border border-line bg-mist px-3 py-1.5 text-sm disabled:opacity-50"
        >
          Generate
        </button>
        <button
          disabled={busy}
          onClick={() => run(true)}
          className="bg-accent px-3 py-1.5 text-sm text-paper disabled:opacity-50"
        >
          Generate & push
        </button>
      </div>
      {msg && <p className="text-xs text-ink/60">{msg}</p>}
    </div>
  );
}
