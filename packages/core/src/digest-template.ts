export type DigestLocale = "en" | "zh";

export type DigestSections = {
  engines: boolean;
  watch: boolean;
  sites: boolean;
  keywords: boolean;
  recommendations: boolean;
};

export const DEFAULT_DIGEST_SECTIONS: DigestSections = {
  engines: true,
  watch: true,
  sites: true,
  keywords: true,
  recommendations: true,
};

export function parseDigestSections(raw: unknown): DigestSections {
  const base = { ...DEFAULT_DIGEST_SECTIONS };
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  for (const key of Object.keys(base) as Array<keyof DigestSections>) {
    if (typeof o[key] === "boolean") base[key] = o[key] as boolean;
  }
  return base;
}

export function digestHeading(locale: DigestLocale, key: keyof DigestSections | "title" | "timezone" | "recs_empty"): string {
  if (locale === "zh") {
    const zh: Record<string, string> = {
      title: "Search Triad 日报",
      timezone: "时区",
      engines: "引擎",
      watch: "关注",
      sites: "站点",
      keywords: "关键词变动",
      recommendations: "本周建议",
      recs_empty: "本周无规则建议。",
    };
    return zh[key] || key;
  }
  const en: Record<string, string> = {
    title: "Search Triad Daily",
    timezone: "Timezone",
    engines: "Engines",
    watch: "Watch",
    sites: "Sites",
    keywords: "Keyword movers",
    recommendations: "This week's recommendations",
    recs_empty: "No rule-based recommendations this week.",
  };
  return en[key] || key;
}
