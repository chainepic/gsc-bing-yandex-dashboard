import { redirect } from "next/navigation";
import { KeywordTable } from "@/components/KeywordTable";
import { t } from "@/lib/i18n";
import { getRequestUiLocale } from "@/lib/locale-server";
import { getSettings } from "@/server/settings";
import { listKeywords } from "@/server/queries";

export const dynamic = "force-dynamic";

export default async function KeywordsPage() {
  if (!getSettings().setupComplete) redirect("/setup");
  const locale = await getRequestUiLocale();
  const rows = listKeywords(250).map((r) => ({
    id: r.id,
    query: r.query,
    engine: r.engine,
    host: r.host,
    clicks: r.clicks,
    clickDelta: r.clickDelta,
    impressions: r.impressions,
    impressionDelta: r.impressionDelta,
    position: r.position,
    ctr: r.ctr || (r.impressions ? r.clicks / r.impressions : 0),
  }));

  return (
    <div className="space-y-6">
      <section>
        <h1 className="font-display text-2xl">{t(locale, "keywords_title")}</h1>
        <p className="mt-1 text-sm text-ink/65">{t(locale, "keywords_sub")}</p>
      </section>
      <KeywordTable rows={rows} />
    </div>
  );
}
