import { Suspense } from "react";
import { SetupWizard } from "@/components/SetupWizard";
import { t } from "@/lib/i18n";
import { getRequestUiLocale } from "@/lib/locale-server";
import { getSettings } from "@/server/settings";
import { secretsPublicMeta, secretsStatus } from "@/server/secrets";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const locale = await getRequestUiLocale();
  return (
    <Suspense fallback={<p className="py-8 text-sm text-ink/60">{t(locale, "setup_loading")}</p>}>
      <SetupWizard
        initialSettings={getSettings()}
        status={secretsStatus()}
        secretsMeta={secretsPublicMeta()}
      />
    </Suspense>
  );
}
