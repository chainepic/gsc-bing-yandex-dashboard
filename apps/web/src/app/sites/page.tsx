import { redirect } from "next/navigation";
import { CoverageGapTable } from "@/components/CoverageGapTable";
import { SitesTable } from "@/components/SitesTable";
import { t } from "@/lib/i18n";
import { getRequestUiLocale } from "@/lib/locale-server";
import { getSettings } from "@/server/settings";
import { coverageGapTable, siteComparison } from "@/server/queries";

export const dynamic = "force-dynamic";

export default async function SitesPage() {
  if (!getSettings().setupComplete) redirect("/setup");
  const locale = await getRequestUiLocale();
  const rows = siteComparison();
  const gaps = coverageGapTable();

  return (
    <div className="space-y-6">
      <section>
        <h1 className="font-display text-2xl">{t(locale, "sites_title")}</h1>
        <p className="mt-1 text-sm text-ink/65">{t(locale, "sites_sub")}</p>
      </section>
      <CoverageGapTable rows={gaps} />
      <SitesTable rows={rows} />
    </div>
  );
}
