import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteEngineTabs } from "@/components/SiteEngineTabs";
import { getSettings } from "@/server/settings";
import { siteDetail } from "@/server/queries";

export const dynamic = "force-dynamic";

export default async function SiteDetailPage({ params }: { params: Promise<{ host: string }> }) {
  if (!getSettings().setupComplete) redirect("/setup");
  const { host: raw } = await params;
  const host = decodeURIComponent(raw);
  const engines = siteDetail(host);

  if (!engines.length) {
    return (
      <div>
        <Link href="/sites" className="text-sm text-accent">
          ← Sites
        </Link>
        <p className="mt-4">No data for {host}</p>
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
    })),
    pages: pages.map((k) => ({
      id: k.id,
      query: k.query,
      clicks: k.clicks,
      clickDelta: k.clickDelta,
    })),
  }));

  return (
    <div className="space-y-8">
      <section>
        <Link href="/sites" className="text-sm text-accent">
          ← Sites
        </Link>
        <h1 className="mt-2 font-display text-2xl">{host}</h1>
      </section>

      <SiteEngineTabs engines={blocks} />
    </div>
  );
}
