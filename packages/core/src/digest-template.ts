export type DigestLocale = "zh" | "en" | "ru";

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

export const DIGEST_LOCALES: DigestLocale[] = ["zh", "en", "ru"];

export function normalizeDigestLocale(raw: unknown): DigestLocale {
  if (raw === "en" || raw === "ru" || raw === "zh") return raw;
  return "zh";
}

export function parseDigestSections(raw: unknown): DigestSections {
  const base = { ...DEFAULT_DIGEST_SECTIONS };
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  for (const key of Object.keys(base) as Array<keyof DigestSections>) {
    if (typeof o[key] === "boolean") base[key] = o[key] as boolean;
  }
  return base;
}

type HeadingKey = keyof DigestSections | "title" | "timezone" | "recs_empty";

const HEADINGS: Record<DigestLocale, Record<HeadingKey, string>> = {
  zh: {
    title: "Search Triad 日报",
    timezone: "时区",
    engines: "引擎",
    watch: "关注",
    sites: "站点",
    keywords: "关键词变动",
    recommendations: "本周建议",
    recs_empty: "本周无规则建议。",
  },
  en: {
    title: "Search Triad Daily",
    timezone: "Timezone",
    engines: "Engines",
    watch: "Watch",
    sites: "Sites",
    keywords: "Keyword movers",
    recommendations: "This week's recommendations",
    recs_empty: "No rule-based recommendations this week.",
  },
  ru: {
    title: "Search Triad — ежедневный отчёт",
    timezone: "Часовой пояс",
    engines: "Движки",
    watch: "Наблюдение",
    sites: "Сайты",
    keywords: "Изменения запросов",
    recommendations: "Рекомендации недели",
    recs_empty: "На этой неделе нет рекомендаций по правилам.",
  },
};

export function digestHeading(locale: DigestLocale, key: HeadingKey): string {
  return HEADINGS[normalizeDigestLocale(locale)][key] || key;
}

/** Body phrases used inside digest Markdown lines (not section titles). */
export type DigestCopy = {
  asOf: string;
  clicks: string;
  impressions: string;
  sites: string;
  bothDown: (host: string) => string;
  tableHeader: string;
  tableSep: string;
  directionUp: string;
  directionDown: string;
};

const COPY: Record<DigestLocale, DigestCopy> = {
  zh: {
    asOf: "截至",
    clicks: "点击",
    impressions: "展示",
    sites: "站点",
    bothDown: (host) => `${host} 在 Google 与 Bing 周环比双降`,
    tableHeader: "| 主机 | Google | 变化 | Bing | 变化 | Yandex | 变化 |",
    tableSep: "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
    directionUp: "上涨",
    directionDown: "下跌",
  },
  en: {
    asOf: "as of",
    clicks: "clicks",
    impressions: "impressions",
    sites: "sites",
    bothDown: (host) => `${host} down on both Google and Bing week-over-week`,
    tableHeader: "| Host | Google | Δ | Bing | Δ | Yandex | Δ |",
    tableSep: "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
    directionUp: "up",
    directionDown: "down",
  },
  ru: {
    asOf: "на",
    clicks: "кликов",
    impressions: "показов",
    sites: "сайтов",
    bothDown: (host) => `${host}: падение кликов и на Google, и на Bing (неделя к неделе)`,
    tableHeader: "| Хост | Google | Δ | Bing | Δ | Yandex | Δ |",
    tableSep: "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
    directionUp: "рост",
    directionDown: "падение",
  },
};

export function digestCopy(locale: DigestLocale): DigestCopy {
  return COPY[normalizeDigestLocale(locale)];
}
