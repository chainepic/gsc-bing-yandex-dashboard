import { redirect } from "next/navigation";
import { ExportPanel } from "@/components/ExportPanel";
import { t } from "@/lib/i18n";
import { getRequestUiLocale } from "@/lib/locale-server";
import { listSites } from "@/server/queries";
import { reportAiStatus } from "@/server/report-ai";
import { getSettings } from "@/server/settings";

export const dynamic = "force-dynamic";

export default async function ExportPage() {
  if (!getSettings().setupComplete) redirect("/setup");
  const locale = await getRequestUiLocale();
  const settings = getSettings();
  const hosts = [...new Set(listSites().map((s) => s.host))].sort();
  const ai = reportAiStatus();

  return (
    <div className="space-y-6">
      <section>
        <h1 className="font-display text-2xl">{t(locale, "export_title")}</h1>
        <p className="mt-1 text-sm text-ink/65">{t(locale, "export_sub")}</p>
      </section>
      <ExportPanel
        historyDays={settings.historyDays}
        hosts={hosts}
        reportAiConfigured={ai.configured}
      />
    </div>
  );
}
