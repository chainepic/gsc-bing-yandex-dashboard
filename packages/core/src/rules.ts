import type { EngineId } from "@search-triad/connectors";
import { matchesAnomalyPreset } from "@search-triad/connectors/filters";

export type RuleSeverity = "high" | "medium" | "low";

export type RuleId =
  | "click_plunge_query"
  | "click_plunge_page"
  | "impr_up_clicks_down"
  | "impression_plunge_page"
  | "site_click_drop"
  | "engine_only_drop"
  | "engine_gap_no_data"
  | "cross_engine_drop"
  | "onpage_issue";

export type RecommendationEvidence = {
  label: string;
  value: string;
};

export type Recommendation = {
  id: string;
  ruleId: RuleId;
  title: string;
  summary: string;
  severity: RuleSeverity;
  /** 0–100 priority: severity × traffic × cross-engine */
  score: number;
  host: string;
  engines: EngineId[];
  kind?: "query" | "page" | "site";
  subject?: string;
  evidence: RecommendationEvidence[];
  hrefs: Array<{ label: string; href: string }>;
  engineSpecific?: boolean;
};

export type RuleMover = {
  engine: EngineId;
  host: string;
  key: string;
  kind: "query" | "page";
  clicks: number;
  impressions: number;
  clickDelta: number;
  impressionDelta: number;
  position: number | null;
};

export type RuleSiteMetric = {
  engine: EngineId;
  host: string;
  weekClicks: number;
  weekImpressions: number;
  clickDelta: number;
  impressionDelta: number;
  connected: boolean;
};

export type RuleOnPageAudit = {
  host: string;
  url: string;
  statusCode: number | null;
  title: string | null;
  issues: Array<{ id: string; severity: RuleSeverity; message: string }>;
  /** When available — page was also a search mover drop. */
  clickDelta?: number;
  impressionDelta?: number;
};

export type RulesInput = {
  movers: RuleMover[];
  sites: RuleSiteMetric[];
  /** Engines the user has credentials / bindings for (for gap tips). */
  connectedEngines: EngineId[];
  /** Optional local on-page snapshots (own URLs only). */
  onPage?: RuleOnPageAudit[];
  /** UI / digest locale for titles, summaries, and evidence labels. */
  locale?: "en" | "zh";
};

const SEVERITY_WEIGHT: Record<RuleSeverity, number> = {
  high: 40,
  medium: 25,
  low: 12,
};

function trafficScore(clicks: number, impressions: number): number {
  const c = Math.min(Math.abs(clicks), 500) / 500;
  const i = Math.min(Math.abs(impressions), 5000) / 5000;
  return Math.round(35 * Math.max(c, i * 0.6));
}

function scoreOf(
  severity: RuleSeverity,
  clicks: number,
  impressions: number,
  crossEngine: boolean
): number {
  return Math.min(
    100,
    SEVERITY_WEIGHT[severity] + trafficScore(clicks, impressions) + (crossEngine ? 20 : 0)
  );
}

function engineLabel(e: EngineId): string {
  return e === "gsc" ? "Google" : e === "bing" ? "Bing" : "Yandex";
}

function tr(locale: "en" | "zh", en: string, zh: string): string {
  return locale === "zh" ? zh : en;
}

function evidenceLabels(locale: "en" | "zh") {
  return {
    engine: tr(locale, "Engine", "引擎"),
    clicks: tr(locale, "Clicks", "点击"),
    impressions: tr(locale, "Impressions", "展示"),
    ctr: tr(locale, "CTR", "CTR"),
    position: tr(locale, "Position", "排名"),
    site: tr(locale, "Site", "站点"),
    keywords: tr(locale, "Keywords", "关键词"),
    urlCheck: tr(locale, "URL check", "URL 检查"),
    http: tr(locale, "HTTP", "HTTP"),
    title: tr(locale, "Title", "标题"),
    clickDelta: tr(locale, "Click Δ", "点击 Δ"),
    onpage: tr(locale, "On-page", "页面审计"),
    weekClicks: tr(locale, "Week clicks", "本周点击"),
    weekImpr: tr(locale, "Week impressions", "本周展示"),
    dropping: tr(locale, "Dropping", "下跌中"),
    missing: tr(locale, "Missing", "缺失"),
    present: tr(locale, "Present", "已有"),
    sites: tr(locale, "Sites", "站点"),
    setup: tr(locale, "Setup", "安装"),
  };
}


function deltaStr(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}

function siteHref(host: string): string {
  return `/sites/${encodeURIComponent(host)}`;
}

function keywordsHref(host: string): string {
  return `/keywords?host=${encodeURIComponent(host)}`;
}

/** Local explainable rule engine v1 — no LLM, no external SEO APIs. */
export function runRules(input: RulesInput, limit = 40): Recommendation[] {
  const locale = input.locale === "zh" ? "zh" : "en";
  const L = evidenceLabels(locale);
  const out: Recommendation[] = [];
  const seen = new Set<string>();

  const push = (rec: Recommendation) => {
    if (seen.has(rec.id)) return;
    seen.add(rec.id);
    out.push(rec);
  };

  // --- Mover rules ---
  for (const m of input.movers) {
    const ctr =
      m.impressions > 0 ? ((m.clicks / m.impressions) * 100).toFixed(1) + "%" : "—";
    const baseEvidence: RecommendationEvidence[] = [
      { label: L.engine, value: engineLabel(m.engine) },
      { label: L.clicks, value: `${m.clicks} (${deltaStr(m.clickDelta)})` },
      { label: L.impressions, value: `${m.impressions} (${deltaStr(m.impressionDelta)})` },
      { label: L.ctr, value: ctr },
    ];
    if (m.position != null && m.position > 0) {
      baseEvidence.push({ label: L.position, value: m.position.toFixed(1) });
    }
    const hrefs = [
      { label: L.site, href: siteHref(m.host) },
      { label: L.keywords, href: keywordsHref(m.host) },
    ];

    if (matchesAnomalyPreset(m, "impressions_up_clicks_down")) {
      push({
        id: `impr_up_clicks_down:${m.engine}:${m.host}:${m.kind}:${m.key}`,
        ruleId: "impr_up_clicks_down",
        title: tr(locale, `Impressions up, clicks down — ${m.kind}`, `展示上升、点击下降 — ${m.kind}`),
        summary: tr(
          locale,
          `“${m.key}” is getting more exposure but fewer clicks on ${engineLabel(m.engine)}. Check title/snippet or intent mismatch.`,
          `「${m.key}」在 ${engineLabel(m.engine)} 上展示增多但点击减少。检查标题/摘要或意图是否匹配。`
        ),
        severity: Math.abs(m.clickDelta) >= 20 || m.impressions >= 1000 ? "high" : "medium",
        score: scoreOf(
          Math.abs(m.clickDelta) >= 20 || m.impressions >= 1000 ? "high" : "medium",
          m.clicks,
          m.impressions,
          false
        ),
        host: m.host,
        engines: [m.engine],
        kind: m.kind,
        subject: m.key,
        evidence: baseEvidence,
        hrefs,
      });
    }

    if (m.kind === "query" && matchesAnomalyPreset(m, "click_plunge")) {
      push({
        id: `click_plunge_query:${m.engine}:${m.host}:${m.key}`,
        ruleId: "click_plunge_query",
        title: tr(locale, "Query click plunge", "查询点击骤降"),
        summary: tr(
          locale,
          `Query “${m.key}” lost ${Math.abs(m.clickDelta)} clicks week-over-week on ${engineLabel(m.engine)}.`,
          `查询「${m.key}」在 ${engineLabel(m.engine)} 上周环比减少 ${Math.abs(m.clickDelta)} 次点击。`
        ),
        severity: Math.abs(m.clickDelta) >= 30 ? "high" : "medium",
        score: scoreOf(
          Math.abs(m.clickDelta) >= 30 ? "high" : "medium",
          m.clicks,
          m.impressions,
          false
        ),
        host: m.host,
        engines: [m.engine],
        kind: "query",
        subject: m.key,
        evidence: baseEvidence,
        hrefs,
      });
    }

    if (m.kind === "page" && matchesAnomalyPreset(m, "click_plunge")) {
      push({
        id: `click_plunge_page:${m.engine}:${m.host}:${m.key}`,
        ruleId: "click_plunge_page",
        title: tr(locale, "Page traffic drop", "页面流量下跌"),
        summary: tr(
          locale,
          `Page ${m.key} lost ${Math.abs(m.clickDelta)} clicks on ${engineLabel(m.engine)}. Inspect content freshness and index status.`,
          `页面 ${m.key} 在 ${engineLabel(m.engine)} 上减少 ${Math.abs(m.clickDelta)} 次点击。检查内容新鲜度与索引状态。`
        ),
        severity: Math.abs(m.clickDelta) >= 25 ? "high" : "medium",
        score: scoreOf(
          Math.abs(m.clickDelta) >= 25 ? "high" : "medium",
          m.clicks,
          m.impressions,
          false
        ),
        host: m.host,
        engines: [m.engine],
        kind: "page",
        subject: m.key,
        evidence: baseEvidence,
        hrefs: [...hrefs, { label: L.urlCheck, href: `${siteHref(m.host)}#url-inspect` }],
      });
    }

    if (m.kind === "page" && matchesAnomalyPreset(m, "impression_plunge")) {
      push({
        id: `impression_plunge_page:${m.engine}:${m.host}:${m.key}`,
        ruleId: "impression_plunge_page",
        title: tr(locale, "Page impression plunge", "页面展示骤降"),
        summary: tr(
          locale,
          `Page ${m.key} lost ${Math.abs(m.impressionDelta)} impressions on ${engineLabel(m.engine)} — possible ranking or coverage loss.`,
          `页面 ${m.key} 在 ${engineLabel(m.engine)} 上减少 ${Math.abs(m.impressionDelta)} 次展示 — 可能是排名或覆盖损失。`
        ),
        severity: "medium",
        score: scoreOf("medium", m.clicks, m.impressions, false),
        host: m.host,
        engines: [m.engine],
        kind: "page",
        subject: m.key,
        evidence: baseEvidence,
        hrefs,
      });
    }
  }

  // --- On-page local audit (own URLs) ---
  for (const page of input.onPage || []) {
    if (!page.issues.length) continue;
    const dropping = (page.clickDelta != null && page.clickDelta < 0) ||
      (page.impressionDelta != null && page.impressionDelta <= -500);
    const top = page.issues
      .slice()
      .sort((a, b) => SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity])[0]!;
    const severity: RuleSeverity = dropping
      ? top.severity === "low"
        ? "medium"
        : top.severity
      : top.severity;
    push({
      id: `onpage_issue:${page.host}:${page.url}`,
      ruleId: "onpage_issue",
      title: dropping
        ? tr(locale, "Dropping page has on-page issues", "下跌页存在页面问题")
        : tr(locale, "On-page audit issue", "页面审计问题"),
      summary: dropping
        ? tr(
            locale,
            `${page.url} is down in Search and the live HTML shows: ${page.issues
              .map((i) => i.message)
              .slice(0, 3)
              .join("; ")}.`,
            `${page.url} 在搜索中下跌，实时 HTML 显示：${page.issues
              .map((i) => i.message)
              .slice(0, 3)
              .join("；")}。`
          )
        : tr(
            locale,
            `${page.url}: ${page.issues
              .map((i) => i.message)
              .slice(0, 3)
              .join("; ")}.`,
            `${page.url}：${page.issues
              .map((i) => i.message)
              .slice(0, 3)
              .join("；")}。`
          ),
      severity,
      score: scoreOf(
        severity,
        Math.abs(page.clickDelta || 0),
        Math.abs(page.impressionDelta || 0),
        false
      ),
      host: page.host,
      engines: [],
      kind: "page",
      subject: page.url,
      evidence: [
        { label: L.http, value: page.statusCode != null ? String(page.statusCode) : "—" },
        { label: L.title, value: page.title || tr(locale, "(missing)", "（缺失）") },
        ...page.issues.slice(0, 4).map((i) => ({ label: i.id, value: i.message })),
        ...(page.clickDelta != null
          ? [{ label: L.clickDelta, value: deltaStr(page.clickDelta) }]
          : []),
      ],
      hrefs: [
        { label: L.site, href: siteHref(page.host) },
        { label: L.onpage, href: `${siteHref(page.host)}#onpage-audit` },
      ],
    });
  }

  // --- Site-level + engine-specific ---
  const byHost = new Map<string, RuleSiteMetric[]>();
  for (const s of input.sites) {
    const list = byHost.get(s.host) || [];
    list.push(s);
    byHost.set(s.host, list);
  }

  for (const [host, rows] of byHost) {
    const connected = rows.filter((r) => r.connected);
    const dropping = connected.filter(
      (r) => r.clickDelta <= -10 || r.impressionDelta <= -500
    );

    for (const s of dropping) {
      push({
        id: `site_click_drop:${s.engine}:${host}`,
        ruleId: "site_click_drop",
        title: tr(locale, "Site week-over-week drop", "站点周环比下跌"),
        summary: tr(
          locale,
          `${host} dropped on ${engineLabel(s.engine)}: clicks ${deltaStr(s.clickDelta)}, impressions ${deltaStr(s.impressionDelta)}.`,
          `${host} 在 ${engineLabel(s.engine)} 上下跌：点击 ${deltaStr(s.clickDelta)}，展示 ${deltaStr(s.impressionDelta)}。`
        ),
        severity: s.clickDelta <= -50 || s.impressionDelta <= -2000 ? "high" : "medium",
        score: scoreOf(
          s.clickDelta <= -50 || s.impressionDelta <= -2000 ? "high" : "medium",
          s.weekClicks,
          s.weekImpressions,
          false
        ),
        host,
        engines: [s.engine],
        kind: "site",
        evidence: [
          { label: L.engine, value: engineLabel(s.engine) },
          { label: L.weekClicks, value: `${s.weekClicks} (${deltaStr(s.clickDelta)})` },
          {
            label: L.weekImpr,
            value: `${s.weekImpressions} (${deltaStr(s.impressionDelta)})`,
          },
        ],
        hrefs: [{ label: L.site, href: siteHref(host) }],
      });
    }

    // Engine-only drop: one engine down, others flat/up or missing traffic contrast
    if (dropping.length === 1 && connected.length >= 2) {
      const only = dropping[0]!;
      const others = connected.filter((r) => r.engine !== only.engine);
      const othersOk = others.every((r) => r.clickDelta > -10 && r.impressionDelta > -500);
      if (othersOk) {
        push({
          id: `engine_only_drop:${only.engine}:${host}`,
          ruleId: "engine_only_drop",
          title: tr(
            locale,
            `Only ${engineLabel(only.engine)} is dropping`,
            `仅 ${engineLabel(only.engine)} 在下跌`
          ),
          summary: tr(
            locale,
            `${host} is down on ${engineLabel(only.engine)} while ${others
              .map((o) => engineLabel(o.engine))
              .join(" / ")} look stable. Prefer engine-specific fixes (indexing, geotargeting, WMT coverage) over a full rewrite.`,
            `${host} 在 ${engineLabel(only.engine)} 上下跌，而 ${others
              .map((o) => engineLabel(o.engine))
              .join(" / ")} 看起来稳定。优先做引擎侧修复（索引、地域、站长覆盖），而非整站重写。`
          ),
          severity: "high",
          score: scoreOf("high", only.weekClicks, only.weekImpressions, true),
          host,
          engines: [only.engine],
          kind: "site",
          evidence: [
            {
              label: L.dropping,
              value: `${engineLabel(only.engine)} ${tr(locale, "clicks", "点击")} ${deltaStr(only.clickDelta)}`,
            },
            ...others.map((o) => ({
              label: engineLabel(o.engine),
              value: `${tr(locale, "clicks", "点击")} ${deltaStr(o.clickDelta)}`,
            })),
          ],
          hrefs: [{ label: L.site, href: siteHref(host) }],
          engineSpecific: true,
        });
      }
    }

    // Cross-engine drop
    if (dropping.length >= 2) {
      push({
        id: `cross_engine_drop:${host}`,
        ruleId: "cross_engine_drop",
        title: tr(locale, "Down across multiple engines", "多引擎同时下跌"),
        summary: tr(
          locale,
          `${host} is dropping on ${dropping
            .map((d) => engineLabel(d.engine))
            .join(" and ")}. Likely site-wide (content, outage, robots) rather than one WMT quirk.`,
          `${host} 在 ${dropping
            .map((d) => engineLabel(d.engine))
            .join(" 与 ")} 上下跌。更可能是全站问题（内容、故障、robots），而非单一站长工具异常。`
        ),
        severity: "high",
        score: scoreOf(
          "high",
          dropping.reduce((s, d) => s + d.weekClicks, 0),
          dropping.reduce((s, d) => s + d.weekImpressions, 0),
          true
        ),
        host,
        engines: dropping.map((d) => d.engine),
        kind: "site",
        evidence: dropping.map((d) => ({
          label: engineLabel(d.engine),
          value: `${tr(locale, "clicks", "点击")} ${deltaStr(d.clickDelta)}, ${tr(locale, "impr.", "展示")} ${deltaStr(d.impressionDelta)}`,
        })),
        hrefs: [{ label: L.site, href: siteHref(host) }],
        engineSpecific: true,
      });
    }

    // Gap: connected elsewhere but missing on an engine the user uses
    for (const engine of input.connectedEngines) {
      const hit = rows.find((r) => r.engine === engine && r.connected);
      const othersHaveTraffic = connected.some(
        (r) => r.engine !== engine && (r.weekClicks > 0 || r.weekImpressions > 0)
      );
      if (!hit && othersHaveTraffic) {
        push({
          id: `engine_gap_no_data:${engine}:${host}`,
          ruleId: "engine_gap_no_data",
          title: tr(
            locale,
            `No ${engineLabel(engine)} data for this host`,
            `该主机没有 ${engineLabel(engine)} 数据`
          ),
          summary: tr(
            locale,
            `${host} has traffic on other engines but no enabled ${engineLabel(
              engine
            )} binding (or no synced metrics). Add/verify the property if you care about parity.`,
            `${host} 在其他引擎有流量，但没有已启用的 ${engineLabel(
              engine
            )} 绑定（或尚未同步指标）。若需要对齐覆盖，请添加/验证该资源。`
          ),
          severity: "low",
          score: scoreOf("low", 0, 0, true),
          host,
          engines: [engine],
          kind: "site",
          evidence: [
            { label: L.missing, value: engineLabel(engine) },
            {
              label: L.present,
              value: connected.map((c) => engineLabel(c.engine)).join(", ") || "—",
            },
          ],
          hrefs: [
            { label: L.sites, href: "/sites" },
            { label: L.setup, href: "/setup" },
          ],
          engineSpecific: true,
        });
      } else if (hit && hit.weekClicks === 0 && hit.weekImpressions === 0 && othersHaveTraffic) {
        push({
          id: `engine_gap_quiet:${engine}:${host}`,
          ruleId: "engine_gap_no_data",
          title: tr(
            locale,
            `${engineLabel(engine)} has no traffic (others do)`,
            `${engineLabel(engine)} 无流量（其他引擎有）`
          ),
          summary: tr(
            locale,
            `${host} is quiet on ${engineLabel(
              engine
            )} this week while other engines report clicks/impressions. Check verification, indexing, or geo coverage.`,
            `${host} 本周在 ${engineLabel(
              engine
            )} 上安静，而其他引擎有点击/展示。检查验证、索引或地域覆盖。`
          ),
          severity: "medium",
          score: scoreOf("medium", 0, 0, true),
          host,
          engines: [engine],
          kind: "site",
          evidence: [
            { label: engineLabel(engine), value: tr(locale, "0 clicks / 0 impressions", "0 点击 / 0 展示") },
            ...connected
              .filter((c) => c.engine !== engine)
              .map((c) => ({
                label: engineLabel(c.engine),
                value: `${c.weekClicks} ${tr(locale, "clicks", "点击")}`,
              })),
          ],
          hrefs: [{ label: L.site, href: siteHref(host) }],
          engineSpecific: true,
        });
      }
    }
  }

  return out.sort((a, b) => b.score - a.score || a.host.localeCompare(b.host)).slice(0, limit);
}

export function recommendationsToMarkdown(recs: Recommendation[], title = "This week's recommendations"): string {
  if (!recs.length) return "";
  const lines: string[] = ["", `## ${title}`, ""];
  for (const r of recs.slice(0, 12)) {
    const engines = r.engines.map(engineLabel).join("/");
    lines.push(
      `- **[${r.severity}]** ${r.title} — ${r.host}${r.subject ? ` · \`${r.subject}\`` : ""} (${engines}, score ${r.score})`
    );
    lines.push(`  - ${r.summary}`);
    if (r.evidence.length) {
      lines.push(`  - Evidence: ${r.evidence.map((e) => `${e.label} ${e.value}`).join("; ")}`);
    }
  }
  lines.push("");
  return lines.join("\n");
}

export function recommendationsToCsv(recs: Recommendation[]): string {
  const header = [
    "id",
    "ruleId",
    "severity",
    "score",
    "host",
    "engines",
    "kind",
    "subject",
    "title",
    "summary",
    "engineSpecific",
  ];
  const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  const rows = recs.map((r) =>
    [
      r.id,
      r.ruleId,
      r.severity,
      String(r.score),
      r.host,
      r.engines.join("|"),
      r.kind || "",
      r.subject || "",
      r.title,
      r.summary,
      r.engineSpecific ? "1" : "0",
    ]
      .map(escape)
      .join(",")
  );
  return [header.join(","), ...rows].join("\n");
}

export const RULE_CATALOG: Array<{ id: RuleId; label: string; description: string }> = [
  {
    id: "impr_up_clicks_down",
    label: "Impr. ↑ clicks ↓",
    description: "More exposure, fewer clicks — CTR / snippet risk",
  },
  {
    id: "click_plunge_query",
    label: "Query click plunge",
    description: "Query lost ≥10 clicks week-over-week",
  },
  {
    id: "click_plunge_page",
    label: "Page traffic drop",
    description: "Page lost ≥10 clicks week-over-week",
  },
  {
    id: "impression_plunge_page",
    label: "Page impression plunge",
    description: "Page impressions down ≥500",
  },
  {
    id: "site_click_drop",
    label: "Site WoW drop",
    description: "Host-level click or impression drop on an engine",
  },
  {
    id: "engine_only_drop",
    label: "Single-engine drop",
    description: "Only one engine dropping while others are stable",
  },
  {
    id: "engine_gap_no_data",
    label: "Engine coverage gap",
    description: "Missing or quiet on one engine while others have traffic",
  },
  {
    id: "cross_engine_drop",
    label: "Multi-engine drop",
    description: "Same host dropping on two or more engines",
  },
  {
    id: "onpage_issue",
    label: "On-page audit",
    description: "Local HTML issues (title/H1/canonical/soft 404), especially on dropping pages",
  },
];
