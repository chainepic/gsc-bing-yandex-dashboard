import { redirect } from "next/navigation";
import { RecommendationsPanel } from "@/components/RecommendationsPanel";
import { t } from "@/lib/i18n";
import { getRequestUiLocale } from "@/lib/locale-server";
import { getSettings } from "@/server/settings";
import { generateRecommendations } from "@/server/recommendations";

export const dynamic = "force-dynamic";

export default async function RecommendationsPage() {
  const settings = getSettings();
  if (!settings.setupComplete) redirect("/setup");
  const locale = await getRequestUiLocale();
  const recommendations = generateRecommendations({ limit: 50, locale });

  return (
    <div className="space-y-6">
      <section>
        <h1 className="font-display text-2xl">{t(locale, "recommendations_title")}</h1>
        <p className="mt-1 text-sm text-ink/65">{t(locale, "recommendations_sub")}</p>
      </section>
      <RecommendationsPanel recommendations={recommendations} llmEnabled={settings.llmPolishEnabled} />
    </div>
  );
}
