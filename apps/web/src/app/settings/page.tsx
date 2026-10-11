import { redirect } from "next/navigation";
import { SettingsForm } from "@/components/SettingsForm";
import { t, resolveUiLocale } from "@/lib/i18n";
import { getRequestUiLocale } from "@/lib/locale-server";
import { getSettings } from "@/server/settings";
import { secretsStatus } from "@/server/secrets";
import { latestSync, listSites, parseSyncDetail } from "@/server/queries";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  if (!getSettings().setupComplete) redirect("/setup");
  const settings = getSettings();
  const locale = await getRequestUiLocale();
  const accept = (await headers()).get("accept-language");
  const status = secretsStatus();
  const sites = listSites();
  const sync = latestSync();
  const formSettings = {
    ...settings,
    uiLocale: settings.uiLocale ?? resolveUiLocale(null, accept),
  };

  return (
    <div className="space-y-6">
      <section>
        <h1 className="font-display text-2xl">{t(locale, "settings_title")}</h1>
        <p className="mt-1 text-sm text-ink/65">{t(locale, "settings_sub")}</p>
      </section>
      <SettingsForm
        initialSettings={formSettings}
        status={status}
        sites={sites}
        lastSync={
          sync
            ? {
                status: sync.status,
                message: sync.message,
                at: sync.finishedAt || sync.startedAt,
                detail: parseSyncDetail(sync.detailJson),
              }
            : null
        }
      />
    </div>
  );
}
