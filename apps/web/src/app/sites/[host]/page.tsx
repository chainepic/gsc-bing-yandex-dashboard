import Link from "next/link";
import { redirect } from "next/navigation";
import { BingSubmitPanel } from "@/components/BingSubmitPanel";
import { CrossEngineMovers } from "@/components/CrossEngineMovers";
import { HostMetaCard } from "@/components/HostMetaCard";
import { OnPageAuditPanel } from "@/components/OnPageAuditPanel";
import { SiteEngineTabs } from "@/components/SiteEngineTabs";
import { SitemapPanel } from "@/components/SitemapPanel";
import { UrlInspectPanel } from "@/components/UrlInspectPanel";
import { t } from "@/lib/i18n";
import { getRequestUiLocale } from "@/lib/locale-server";
import { getSettings } from "@/server/settings";
import { crossEngineMovers, hostEngineMetaForHost, siteDetail } from "@/server/queries";

export const dynamic = "force-dynamic";

export default async function SiteDetailPage({ params }: { params: Promise<{ host: string }> }) {
  if (!getSettings().setupComplete) redirect("/setup");
  const settings = getSettings();
  const locale = await getRequestUiLocale();
  const { host: raw } = await params;
  const host = decodeURIComponent(raw);
  const engines = siteDetail(host);

  if (!engines.length) {
    return (
      <div>
        <Link href="/sites" className="text-sm text-accent">
          {t(locale, "common_back_sites")}
        </Link>
        <p className="mt-4">{t(locale, "site_no_data", { host })}</p>
        <p className="mt-2 flex flex-wrap gap-3 text-sm">
          <Link href="/settings" className="text-accent underline decoration-line underline-offset-2">
            {t(locale, "common_settings_sync")}
          </Link>
          <Link href="/guide" className="text-ink/55 underline decoration-line underline-offset-2 hover:text-accent">
            {t(locale, "common_guide")}
          </Link>
        </p>
      </div>
    );
  }

  const blocks = engines.map(({ site, daily, keywords, pages }) => ({
    site: { id: site.id, engine: site.engine, propertyId: site.propertyId },
    daily: daily.map((d) => ({ clicks: d.clicks })),
    keywords: keywords.map((k) => ({
      id: k.id,
      query: k.query,
      clicks: k.clicks,
      clickDelta: k.clickDelta,
      impressions: k.impressions,
      impressionDelta: k.impressionDelta,
      position: k.position || null,
      ctr: k.ctr || (k.impressions ? k.clicks / k.impressions : 0),
    })),
    pages: pages.map((k) => ({
      id: k.id,
      query: k.query,
      clicks: k.clicks,
      clickDelta: k.clickDelta,
      impressions: k.impressions,
      impressionDelta: k.impressionDelta,
      position: k.position || null,
      ctr: k.ctr || (k.impressions ? k.clicks / k.impressions : 0),
    })),
  }));

  const queryCross = crossEngineMovers(host, "query");
  const pageCross = crossEngineMovers(host, "page");
  const hostMeta = hostEngineMetaForHost(host);

  return (
    <div className="space-y-8">
      <section>
        <Link href="/sites" className="text-sm text-accent">
          {t(locale, "common_back_sites")}
        </Link>
        <h1 className="mt-2 font-display text-2xl">{host}</h1>
      </section>

      <HostMetaCard rows={hostMeta} />
      <SiteEngineTabs engines={blocks} />
      <CrossEngineMovers queryRows={queryCross} pageRows={pageCross} />
      <OnPageAuditPanel host={host} />
      <SitemapPanel host={host} />
      <UrlInspectPanel host={host} />
      <BingSubmitPanel host={host} enabled={settings.bingUrlSubmitEnabled} />
    </div>
  );
}
