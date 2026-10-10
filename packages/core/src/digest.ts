import type { EngineId, SiteWindowStats } from "@search-triad/connectors";

export type DigestInput = {
  generatedOn: string;
  timeZone: string;
  byEngine: Record<EngineId, SiteWindowStats[]>;
};

export type DigestPayload = {
  generatedOn: string;
  timeZone: string;
  engines: Array<{
    engine: EngineId;
    asOf: string | null;
    weekClicks: number;
    weekImpressions: number;
    weekClickDelta: number;
    weekImpressionDelta: number;
    siteCount: number;
  }>;
  highlights: string[];
  sites: Array<{
    host: string;
    gsc?: { clicks: number; delta: number };
    bing?: { clicks: number; delta: number };
    yandex?: { clicks: number; delta: number };
  }>;
  topKeywordMoves: Array<{
    engine: EngineId;
    host: string;
    direction: "up" | "down";
    key: string;
    clicks: number;
    clickDelta: number;
  }>;
  markdown: string;
};

function sumSites(sites: SiteWindowStats[]) {
  return sites.reduce(
    (acc, s) => ({
      clicks: acc.clicks + s.week.clicks,
      impressions: acc.impressions + s.week.impressions,
      clickDelta: acc.clickDelta + s.clickDelta,
      impressionDelta: acc.impressionDelta + s.impressionDelta,
      asOf: acc.asOf || s.asOf,
    }),
    { clicks: 0, impressions: 0, clickDelta: 0, impressionDelta: 0, asOf: null as string | null }
  );
}

function delta(n: number) {
  return n > 0 ? `+${n}` : String(n);
}

export function buildDigest(input: DigestInput): DigestPayload {
  const engines: DigestPayload["engines"] = (["gsc", "bing", "yandex"] as EngineId[]).map((engine) => {
    const sites = input.byEngine[engine] || [];
    const totals = sumSites(sites);
    return {
      engine,
      asOf: totals.asOf,
      weekClicks: totals.clicks,
      weekImpressions: totals.impressions,
      weekClickDelta: totals.clickDelta,
      weekImpressionDelta: totals.impressionDelta,
      siteCount: sites.length,
    };
  });

  const hostMap = new Map<string, DigestPayload["sites"][number]>();
  for (const engine of ["gsc", "bing", "yandex"] as EngineId[]) {
    for (const site of input.byEngine[engine] || []) {
      const row = hostMap.get(site.host) || { host: site.host };
      row[engine] = { clicks: site.week.clicks, delta: site.clickDelta };
      hostMap.set(site.host, row);
    }
  }
  const sites = [...hostMap.values()].sort((a, b) => {
    const ac = (a.gsc?.clicks || 0) + (a.bing?.clicks || 0) + (a.yandex?.clicks || 0);
    const bc = (b.gsc?.clicks || 0) + (b.bing?.clicks || 0) + (b.yandex?.clicks || 0);
    return bc - ac;
  });

  const highlights: string[] = [];
  for (const engine of engines) {
    if (!engine.siteCount) continue;
    const drop = (input.byEngine[engine.engine] || [])
      .filter((s) => s.clickDelta <= -10 || s.impressionDelta <= -500)
      .sort((a, b) => a.clickDelta - b.clickDelta)[0];
    if (drop) {
      highlights.push(
        `${engine.engine.toUpperCase()} ${drop.host}: clicks ${delta(drop.clickDelta)}, impressions ${delta(drop.impressionDelta)}`
      );
    }
  }
  for (const row of sites) {
    if (row.gsc && row.bing && row.gsc.delta < 0 && row.bing.delta < 0) {
      highlights.push(`${row.host} down on both Google and Bing week-over-week`);
      break;
    }
  }

  const topKeywordMoves: DigestPayload["topKeywordMoves"] = [];
  for (const engine of ["gsc", "bing", "yandex"] as EngineId[]) {
    for (const site of input.byEngine[engine] || []) {
      for (const row of site.queryLosses.slice(0, 2)) {
        topKeywordMoves.push({
          engine,
          host: site.host,
          direction: "down",
          key: row.key,
          clicks: row.clicks,
          clickDelta: row.clickDelta,
        });
      }
      for (const row of site.queryGains.slice(0, 2)) {
        topKeywordMoves.push({
          engine,
          host: site.host,
          direction: "up",
          key: row.key,
          clicks: row.clicks,
          clickDelta: row.clickDelta,
        });
      }
    }
  }
  topKeywordMoves.sort((a, b) => Math.abs(b.clickDelta) - Math.abs(a.clickDelta));

  const lines: string[] = [];
  lines.push(`# Search Triad Daily ${input.generatedOn}`);
  lines.push("");
  lines.push(`Timezone: ${input.timeZone}`);
  lines.push("");
  lines.push("## Engines");
  lines.push("");
  for (const e of engines) {
    lines.push(
      `- **${e.engine.toUpperCase()}** as of ${e.asOf || "—"}: ${e.weekClicks} clicks (${delta(e.weekClickDelta)}), ${e.weekImpressions} impressions (${delta(e.weekImpressionDelta)}), ${e.siteCount} sites`
    );
  }
  lines.push("");
  if (highlights.length) {
    lines.push("## Watch");
    lines.push("");
    for (const h of highlights.slice(0, 5)) lines.push(`- ${h}`);
    lines.push("");
  }
  lines.push("## Sites");
  lines.push("");
  lines.push("| Host | Google | Δ | Bing | Δ | Yandex | Δ |");
  lines.push("| --- | ---: | ---: | ---: | ---: | ---: | ---: |");
  for (const s of sites.slice(0, 25)) {
    lines.push(
      `| ${s.host} | ${s.gsc?.clicks ?? "—"} | ${s.gsc ? delta(s.gsc.delta) : "—"} | ${s.bing?.clicks ?? "—"} | ${s.bing ? delta(s.bing.delta) : "—"} | ${s.yandex?.clicks ?? "—"} | ${s.yandex ? delta(s.yandex.delta) : "—"} |`
    );
  }
  lines.push("");
  lines.push("## Keyword movers");
  lines.push("");
  for (const row of topKeywordMoves.slice(0, 15)) {
    lines.push(
      `- [${row.engine}] ${row.host} ${row.direction} \`${row.key}\` → ${row.clicks} clicks (${delta(row.clickDelta)})`
    );
  }
  lines.push("");

  return {
    generatedOn: input.generatedOn,
    timeZone: input.timeZone,
    engines,
    highlights: highlights.slice(0, 5),
    sites,
    topKeywordMoves: topKeywordMoves.slice(0, 30),
    markdown: lines.join("\n"),
  };
}

export async function postWebhook(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Webhook HTTP ${res.status}`);
}
