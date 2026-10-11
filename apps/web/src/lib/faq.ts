import type { UiLocale } from "@/lib/i18n";

/** Structured FAQ — short answers for humans and agents. */
export type FaqItem = {
  id: string;
  /** Topic tags for search / agents */
  tags: string[];
  q: string;
  /** One-line what you see */
  see: string;
  /** Short fix steps */
  fix: string[];
};

const en: FaqItem[] = [
  {
    id: "gsc-api-disabled",
    tags: ["google", "gsc", "setup", "oauth"],
    q: "Google connected but Overview shows 0 / no GSC sites",
    see: "OAuth OK, but listing sites fails or Google card stays 0.",
    fix: [
      "Enable “Google Search Console API” on the same Cloud project as the OAuth client.",
      "Wait 1–2 minutes, reload sites in Setup/Settings, select properties, Run sync.",
      "If API error mentions a project number, open that project’s API library link.",
    ],
  },
  {
    id: "gsc-not-in-db",
    tags: ["google", "gsc", "sites", "sync"],
    q: "Google OAuth done but sites were never saved",
    see: "Bing/Yandex have hosts; Google has none enabled.",
    fix: [
      "Setup → Google → load sites → check the properties → Save / Finish.",
      "Then Settings → Run sync. Metrics only appear after sync.",
    ],
  },
  {
    id: "yandex-unreachable",
    tags: ["yandex", "sync", "network", "proxy", "shadowrocket"],
    q: "Yandex sync: fetch failed / unreachable / ECONNRESET",
    see: "Synced N/M with Yandex hosts failing; oauth.yandex.com may still work.",
    fix: [
      "Need reachability to api.webmaster.yandex.net (not just the Webmaster website).",
      "On Shadowrocket/VPN: prefer PROXY for that host; DNS “Always Real IP” is under Config → edit config → DNS (not Settings).",
      "If your only node (e.g. Bandwagon) returns 503 / TLS reset to that API, Yandex sync cannot work from this network — Bing/Google can still sync.",
      "Workaround: run sync from a network/VPS that can open the Yandex API, or accept stale Yandex data.",
    ],
  },
  {
    id: "shadowrocket-dns",
    tags: ["shadowrocket", "dns", "fake-ip"],
    q: "Where is DNS / Always Real IP in Shadowrocket (Mac)?",
    see: "Settings page has no DNS row.",
    fix: [
      "Open 配置 (Config) → current config → DNS.",
      "“总是真实 IP / Always Real IP” lives there, not under 设置.",
    ],
  },
  {
    id: "oauth-host-mismatch",
    tags: ["google", "yandex", "oauth", "localhost"],
    q: "OAuth callback fails after login",
    see: "Redirect error or loop; tokens not saved.",
    fix: [
      "Use one panel URL only: prefer http://localhost:3847 (do not mix with 127.0.0.1).",
      "Redirect URI in Google/Yandex console must match exactly, including host.",
    ],
  },
  {
    id: "google-403-testing",
    tags: ["google", "oauth", "403"],
    q: "Google Access blocked / 403 access_denied",
    see: "Consent screen rejects the account.",
    fix: [
      "If OAuth app is in Testing, add that Gmail under Test users, then authorize again.",
    ],
  },
  {
    id: "sync-partial",
    tags: ["sync"],
    q: "Synced 3/6 sites; some failed",
    see: "Status ok/with errors; banner lists per-engine failures.",
    fix: [
      "Partial sync is normal — successful engines keep data.",
      "Fix the failed engine (credentials or network), then Run sync again.",
    ],
  },
  {
    id: "last-sync-time",
    tags: ["ui", "timezone"],
    q: "Last sync time looks like 2026-10-11T01:00:42.202Z",
    see: "Raw ISO string in Overview/Settings.",
    fix: [
      "Fixed: UI shows local timezone (e.g. 2026-10-11 09:00 for Asia/Shanghai).",
      "Refresh the page after updating the app.",
    ],
  },
];

const zh: FaqItem[] = [
  {
    id: "gsc-api-disabled",
    tags: ["google", "gsc", "setup", "oauth"],
    q: "Google 已连接，但总览是 0 / 没有 GSC 站点",
    see: "OAuth 成功，但列站点失败，或 Google 卡片一直为 0。",
    fix: [
      "在 OAuth 客户端同一 Cloud 项目里启用 “Google Search Console API”。",
      "等 1–2 分钟，在安装向导/设置重新加载站点 → 勾选 → 同步。",
      "报错若带 project 编号，打开对应该项目的 API 启用页。",
    ],
  },
  {
    id: "gsc-not-in-db",
    tags: ["google", "gsc", "sites", "sync"],
    q: "Google 授权完了，但站点没保存",
    see: "Bing/Yandex 有主机，Google 没有已启用资源。",
    fix: [
      "安装向导 → Google → 加载站点 → 勾选要监控的资源 → 保存/完成。",
      "再到设置 → 立即同步。有同步才有指标。",
    ],
  },
  {
    id: "yandex-unreachable",
    tags: ["yandex", "sync", "network", "proxy", "shadowrocket"],
    q: "Yandex 同步失败：fetch failed / unreachable / ECONNRESET",
    see: "Synced N/M，Yandex 站点失败；oauth.yandex.com 可能仍可用。",
    fix: [
      "需要能访问 api.webmaster.yandex.net（能开站长网页不够）。",
      "Shadowrocket：该域名建议走 PROXY；「总是真实 IP」在 配置 → 编辑当前配置 → DNS（不在设置里）。",
      "若只有一个节点（如搬瓦工）对 API 仍是 503 / TLS 重置，则本网无法同步 Yandex；Bing/Google 仍可同步。",
      "变通：换能访问该 API 的网络/VPS 再同步，或暂时接受 Yandex 旧数据。",
    ],
  },
  {
    id: "shadowrocket-dns",
    tags: ["shadowrocket", "dns", "fake-ip"],
    q: "Mac Shadowrocket 里哪里设置 DNS / 总是真实 IP？",
    see: "「设置」页没有 DNS 一项。",
    fix: [
      "打开「配置」→ 当前配置 → DNS。",
      "「总是真实 IP」在这里，不在「设置」。",
    ],
  },
  {
    id: "oauth-host-mismatch",
    tags: ["google", "yandex", "oauth", "localhost"],
    q: "登录后 OAuth 回调失败",
    see: "重定向错误或打转，token 没落库。",
    fix: [
      "全程只用一个面板地址：推荐 http://localhost:3847（不要和 127.0.0.1 混用）。",
      "Google/Yandex 控制台里的回调 URI 必须与浏览器主机名完全一致。",
    ],
  },
  {
    id: "google-403-testing",
    tags: ["google", "oauth", "403"],
    q: "Google 禁止访问 / 403 access_denied",
    see: "同意屏幕拒绝当前账号。",
    fix: [
      "应用若在 Testing：把该 Gmail 加到 Test users，再重新授权。",
    ],
  },
  {
    id: "sync-partial",
    tags: ["sync"],
    q: "已同步 3/6 个站点，部分失败",
    see: "状态带错误；横幅按引擎列出失败项。",
    fix: [
      "部分成功是正常的 — 成功的引擎数据会保留。",
      "修好失败引擎（凭证或网络）后再点同步。",
    ],
  },
  {
    id: "last-sync-time",
    tags: ["ui", "timezone"],
    q: "上次同步显示 2026-10-11T01:00:42.202Z",
    see: "总览/设置里是原始 ISO 字符串。",
    fix: [
      "已修复：按设置时区显示（如 Asia/Shanghai → 2026-10-11 09:00）。",
      "更新后刷新页面即可。",
    ],
  },
];

export function getFaqItems(locale: UiLocale): FaqItem[] {
  return locale === "zh" ? zh : en;
}
