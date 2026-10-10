import { redirect } from "next/navigation";
import { KeywordTable } from "@/components/KeywordTable";
import { getSettings } from "@/server/settings";
import { listKeywords } from "@/server/queries";

export const dynamic = "force-dynamic";

export default function KeywordsPage() {
  if (!getSettings().setupComplete) redirect("/setup");
  const rows = listKeywords(250).map((r) => ({
    id: r.id,
    query: r.query,
    engine: r.engine,
    host: r.host,
    clicks: r.clicks,
    clickDelta: r.clickDelta,
    impressions: r.impressions,
    position: r.position,
  }));

  return (
    <div className="space-y-6">
      <section>
        <h1 className="font-display text-2xl">Keywords</h1>
        <p className="mt-1 text-sm text-ink/65">Week movers across connected engines.</p>
      </section>
      <KeywordTable rows={rows} />
    </div>
  );
}
