import Link from "next/link";
import { redirect } from "next/navigation";
import { DigestActions } from "@/components/DigestActions";
import { DigestCopyButton } from "@/components/DigestCopyButton";
import { t } from "@/lib/i18n";
import { getRequestUiLocale } from "@/lib/locale-server";
import { getSettings } from "@/server/settings";
import { listDigests } from "@/server/digest-job";

export const dynamic = "force-dynamic";

export default async function DigestPage() {
  if (!getSettings().setupComplete) redirect("/setup");
  const locale = await getRequestUiLocale();
  const rows = listDigests(40);

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl">{t(locale, "digest_title")}</h1>
          <p className="mt-1 text-sm text-ink/65">{t(locale, "digest_sub")}</p>
        </div>
        <DigestActions />
      </section>

      <section className="space-y-4">
        {rows.map((d) => (
          <article key={d.id} className="panel p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg">{d.generatedOn}</h2>
              <div className="flex flex-wrap items-center gap-2">
                <DigestCopyButton markdown={d.markdown} />
                <p className="font-mono text-xs text-ink/50">
                  #{d.id} · {d.delivered ? t(locale, "common_delivered") : t(locale, "common_saved")} ·{" "}
                  {d.deliveryNote || "—"}
                </p>
              </div>
            </div>
            <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-ink/80">
              {d.markdown}
            </pre>
          </article>
        ))}
        {!rows.length && (
          <div className="space-y-2 text-sm text-ink/60">
            <p>{t(locale, "digest_empty")}</p>
            <p className="flex flex-wrap gap-3">
              <Link href="/settings#notifications" className="text-accent underline decoration-line underline-offset-2">
                {t(locale, "digest_notifications_sync")}
              </Link>
              <Link href="/guide" className="text-ink/55 underline decoration-line underline-offset-2 hover:text-accent">
                {t(locale, "common_guide")}
              </Link>
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
