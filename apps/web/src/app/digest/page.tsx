import { redirect } from "next/navigation";
import { DigestActions } from "@/components/DigestActions";
import { getSettings } from "@/server/settings";
import { listDigests } from "@/server/digest-job";

export const dynamic = "force-dynamic";

export default function DigestPage() {
  if (!getSettings().setupComplete) redirect("/setup");
  const rows = listDigests(40);

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl">Daily digest</h1>
          <p className="mt-1 text-sm text-ink/65">History of Markdown/JSON digests. Generate and push on demand.</p>
        </div>
        <DigestActions />
      </section>

      <section className="space-y-4">
        {rows.map((d) => (
          <article key={d.id} className="panel p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg">{d.generatedOn}</h2>
              <p className="font-mono text-xs text-ink/50">
                #{d.id} · {d.delivered ? "delivered" : "saved"} · {d.deliveryNote || "—"}
              </p>
            </div>
            <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-ink/80">
              {d.markdown}
            </pre>
          </article>
        ))}
        {!rows.length && <p className="text-sm text-ink/60">No digests yet.</p>}
      </section>
    </div>
  );
}
