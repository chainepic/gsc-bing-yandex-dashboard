import Link from "next/link";
import { redirect } from "next/navigation";
import { Delta, EngineBadge, Sparkline, fmt } from "@/components/Stat";
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

  return (
    <div className="space-y-8">
      <section>
        <Link href="/sites" className="text-sm text-accent">
          ← Sites
        </Link>
        <h1 className="mt-2 font-display text-2xl">{host}</h1>
      </section>

      {engines.map(({ site, daily, keywords }) => (
        <section key={site.id} className="panel space-y-4 p-4">
          <div className="flex items-center justify-between">
            <EngineBadge engine={site.engine} />
            <span className="font-mono text-xs text-ink/50">{site.propertyId}</span>
          </div>
          <Sparkline
            values={daily.map((d) => d.clicks)}
            color={site.engine === "gsc" ? "var(--gsc)" : site.engine === "bing" ? "var(--bing)" : "var(--yandex)"}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-medium text-ink/70">Query gains</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {keywords
                  .filter((k) => k.clickDelta > 0)
                  .slice(0, 8)
                  .map((k) => (
                    <li key={k.id} className="flex justify-between gap-3">
                      <span className="truncate">{k.query}</span>
                      <span className="flex gap-2 font-mono">
                        {fmt(k.clicks)} <Delta value={k.clickDelta} />
                      </span>
                    </li>
                  ))}
                {!keywords.some((k) => k.clickDelta > 0) && <li className="text-ink/50">None</li>}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-medium text-ink/70">Query losses</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {keywords
                  .filter((k) => k.clickDelta < 0)
                  .slice(0, 8)
                  .map((k) => (
                    <li key={k.id} className="flex justify-between gap-3">
                      <span className="truncate">{k.query}</span>
                      <span className="flex gap-2 font-mono">
                        {fmt(k.clicks)} <Delta value={k.clickDelta} />
                      </span>
                    </li>
                  ))}
                {!keywords.some((k) => k.clickDelta < 0) && <li className="text-ink/50">None</li>}
              </ul>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
