/** Selective export contract — single-tenant panel; share via download, not multi-login. */

export type ExportFormat = "json" | "csv" | "markdown";

export type ExportInclude = {
  metricsDaily: boolean;
  movers: boolean;
  recommendations: boolean;
  digests: boolean;
  pageSnapshots: boolean;
};

export const DEFAULT_EXPORT_INCLUDE: ExportInclude = {
  metricsDaily: true,
  movers: true,
  recommendations: true,
  digests: false,
  pageSnapshots: false,
};

export type ExportSliceSpec = {
  /** Empty / omit = all hosts in this instance. */
  hosts?: string[];
  dateFrom: string;
  dateTo: string;
  include: ExportInclude;
  format: ExportFormat;
};

export type ExportSliceMeta = {
  generatedAt: string;
  dateFrom: string;
  dateTo: string;
  hosts: string[] | "all";
  include: ExportInclude;
  /** Human-readable inventory of what left the panel (for UI + AI audit). */
  inventory: string[];
};

export type ExportSlicePayload = {
  meta: ExportSliceMeta;
  metricsDaily?: Array<{
    engine: string;
    host: string;
    date: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
  movers?: Array<{
    engine: string;
    host: string;
    asOf: string;
    kind: string;
    query: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
    clickDelta: number;
    impressionDelta: number;
    window: string;
  }>;
  recommendations?: Array<{
    id: string;
    title: string;
    summary: string;
    severity: string;
    host: string;
    score?: number;
  }>;
  digests?: Array<{
    id: number;
    generatedOn: string;
    markdown: string;
  }>;
  pageSnapshots?: Array<{
    host: string;
    url: string;
    fetchedAt: string;
    statusCode: number | null;
    title: string | null;
    h1: string | null;
    issuesJson: string;
  }>;
};

export function parseExportInclude(raw: unknown): ExportInclude {
  const base = { ...DEFAULT_EXPORT_INCLUDE };
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  for (const key of Object.keys(base) as Array<keyof ExportInclude>) {
    if (typeof o[key] === "boolean") base[key] = o[key];
  }
  return base;
}

export function parseExportFormat(raw: unknown): ExportFormat {
  if (raw === "csv" || raw === "markdown" || raw === "json") return raw;
  return "json";
}

/** ISO date YYYY-MM-DD; returns null if invalid. */
export function parseIsoDate(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const t = Date.parse(`${raw}T00:00:00Z`);
  if (Number.isNaN(t)) return null;
  return raw;
}

export function defaultDateRange(days = 28): { dateFrom: string; dateTo: string } {
  const to = new Date();
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - Math.max(1, days));
  return {
    dateFrom: from.toISOString().slice(0, 10),
    dateTo: to.toISOString().slice(0, 10),
  };
}

export function buildExportInventory(spec: ExportSliceSpec, counts: Record<string, number>): string[] {
  const lines: string[] = [
    `Range: ${spec.dateFrom} → ${spec.dateTo}`,
    `Hosts: ${spec.hosts?.length ? spec.hosts.join(", ") : "all"}`,
    `Format: ${spec.format}`,
  ];
  for (const [key, on] of Object.entries(spec.include) as Array<[keyof ExportInclude, boolean]>) {
    if (!on) continue;
    lines.push(`${key}: ${counts[key] ?? 0} row(s)`);
  }
  return lines;
}

function csvEscape(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function exportSliceToJson(slice: ExportSlicePayload): string {
  return JSON.stringify(slice, null, 2);
}

export function exportSliceToMarkdown(slice: ExportSlicePayload): string {
  const lines: string[] = [
    `# Search Triad export`,
    ``,
    `Generated: ${slice.meta.generatedAt}`,
    ``,
    `## Inventory`,
    ...slice.meta.inventory.map((l) => `- ${l}`),
    ``,
  ];

  if (slice.metricsDaily?.length) {
    lines.push(`## Daily metrics (${slice.metricsDaily.length})`, ``);
    for (const r of slice.metricsDaily.slice(0, 500)) {
      lines.push(
        `- ${r.date} · ${r.engine} · ${r.host}: clicks=${r.clicks} impr=${r.impressions} ctr=${r.ctr.toFixed(4)} pos=${r.position.toFixed(1)}`
      );
    }
    if (slice.metricsDaily.length > 500) lines.push(`- … ${slice.metricsDaily.length - 500} more`);
    lines.push(``);
  }

  if (slice.movers?.length) {
    lines.push(`## Movers (${slice.movers.length})`, ``);
    for (const r of slice.movers.slice(0, 200)) {
      lines.push(
        `- [${r.kind}] ${r.engine}/${r.host}: ${r.query} Δclicks=${r.clickDelta} Δimpr=${r.impressionDelta}`
      );
    }
    if (slice.movers.length > 200) lines.push(`- … ${slice.movers.length - 200} more`);
    lines.push(``);
  }

  if (slice.recommendations?.length) {
    lines.push(`## Recommendations (${slice.recommendations.length})`, ``);
    for (const r of slice.recommendations) {
      lines.push(`### ${r.title}`, ``, r.summary, ``, `Host: ${r.host} · Severity: ${r.severity}`, ``);
    }
  }

  if (slice.digests?.length) {
    lines.push(`## Digests (${slice.digests.length})`, ``);
    for (const d of slice.digests) {
      lines.push(`### ${d.generatedOn} (#${d.id})`, ``, d.markdown, ``);
    }
  }

  if (slice.pageSnapshots?.length) {
    lines.push(`## Page snapshots (${slice.pageSnapshots.length})`, ``);
    for (const p of slice.pageSnapshots.slice(0, 100)) {
      lines.push(`- ${p.url} · ${p.statusCode ?? "?"} · ${p.title || "(no title)"}`);
    }
    lines.push(``);
  }

  return lines.join("\n");
}

/** Flatten primary tables into CSV (metrics + movers + recommendations). Digests stay in JSON/MD. */
export function exportSliceToCsv(slice: ExportSlicePayload): string {
  const blocks: string[] = [];

  if (slice.metricsDaily?.length) {
    blocks.push(
      [
        "section,engine,host,date,clicks,impressions,ctr,position",
        ...slice.metricsDaily.map(
          (r) =>
            ["metricsDaily", r.engine, r.host, r.date, r.clicks, r.impressions, r.ctr, r.position]
              .map(csvEscape)
              .join(",")
        ),
      ].join("\n")
    );
  }

  if (slice.movers?.length) {
    blocks.push(
      [
        "section,engine,host,asOf,kind,query,clicks,impressions,ctr,position,clickDelta,impressionDelta,window",
        ...slice.movers.map((r) =>
          [
            "movers",
            r.engine,
            r.host,
            r.asOf,
            r.kind,
            r.query,
            r.clicks,
            r.impressions,
            r.ctr,
            r.position,
            r.clickDelta,
            r.impressionDelta,
            r.window,
          ]
            .map(csvEscape)
            .join(",")
        ),
      ].join("\n")
    );
  }

  if (slice.recommendations?.length) {
    blocks.push(
      [
        "section,id,host,severity,title,summary,score",
        ...slice.recommendations.map((r) =>
          ["recommendations", r.id, r.host, r.severity, r.title, r.summary, r.score ?? ""]
            .map(csvEscape)
            .join(",")
        ),
      ].join("\n")
    );
  }

  if (!blocks.length) {
    return "section,note\nmeta,no tabular rows selected (try JSON/Markdown for digests)\n";
  }
  return blocks.join("\n\n");
}

export function serializeExportSlice(slice: ExportSlicePayload, format: ExportFormat): {
  body: string;
  contentType: string;
  filename: string;
} {
  const stamp = slice.meta.generatedAt.slice(0, 10);
  if (format === "csv") {
    return {
      body: exportSliceToCsv(slice),
      contentType: "text/csv; charset=utf-8",
      filename: `search-triad-export-${stamp}.csv`,
    };
  }
  if (format === "markdown") {
    return {
      body: exportSliceToMarkdown(slice),
      contentType: "text/markdown; charset=utf-8",
      filename: `search-triad-export-${stamp}.md`,
    };
  }
  return {
    body: exportSliceToJson(slice),
    contentType: "application/json; charset=utf-8",
    filename: `search-triad-export-${stamp}.json`,
  };
}
