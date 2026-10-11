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
    id: "sync-rate-limit",
    tags: ["sync", "quota", "rate-limit", "gsc", "bing", "yandex"],
    q: "Sync stalls or fails with 429 / quota / rate limit",
    see: "One or more hosts fail; message may mention HTTP 429, 503, or quota.",
    fix: [
      "The panel syncs hosts one-by-one and does not auto-backoff on 429 yet — wait, then Run sync again.",
      "Prefer daily cron over hammering Sync when you have many properties.",
      "API calls use fixed row caps (not a full multi-page query export). See Guide step 4 and docs/ops/SYNC-AND-HISTORY.md.",
    ],
  },
  {
    id: "history-windows",
    tags: ["sync", "history", "settings", "gsc"],
    q: "What do 28 / 56 / 90 history days mean?",
    see: "Settings → Sync / UI history window; Overview shows 7d / 28d / Nd.",
    fix: [
      "Those values set how many days GSC/Yandex refill on sync and how far Overview looks back in SQLite.",
      "Bing often already returns a longer rank series; movers stay week-over-week.",
      "After raising the window, Run sync again. Local SQLite is your ledger for digests/rules — not a live GSC tab. Details: Guide step 11 · docs/ops/SYNC-AND-HISTORY.md.",
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
  {
    id: "export-share",
    tags: ["export", "share"],
    q: "How do I share data with someone else?",
    see: "Single-user panel — no multi-login seats.",
    fix: [
      "Open Export → pick hosts / date range / tables → Download (JSON, CSV, or Markdown).",
      "Send the file. Inventory lists exactly what left the panel.",
    ],
  },
  {
    id: "report-ai-byok",
    tags: ["ai", "export", "byok"],
    q: "How does Report AI work?",
    see: "Settings → Report AI; Export → Generate interpretation.",
    fix: [
      "Enable Report AI, set an OpenAI-compatible base URL (…/v1), model, and your API key (encrypted locally).",
      "On Export, choose the same slice, pick a prompt preset, Generate interpretation.",
      "Rules and sync never require AI. Chainepic metering is a separate commercial offer.",
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
    id: "sync-rate-limit",
    tags: ["sync", "quota", "rate-limit", "gsc", "bing", "yandex"],
    q: "同步卡住或报 429 / 配额 / 限流",
    see: "部分主机失败；信息可能含 HTTP 429、503 或 quota。",
    fix: [
      "面板按主机逐个同步，目前不会对 429 自动退避 — 先等待再点「立即同步」。",
      "主机较多时优先依赖每日定时任务，避免连续猛点同步。",
      "API 使用固定行数上限（不会翻页导出全部 query）。见指南第 4 步与 docs/ops/SYNC-AND-HISTORY.md。",
    ],
  },
  {
    id: "history-windows",
    tags: ["sync", "history", "settings", "gsc"],
    q: "28 / 56 / 90 天历史窗口是什么意思？",
    see: "设置 → 同步 / 界面历史窗口；总览有 7 天 / 28 天 / N 天。",
    fix: [
      "该值决定 GSC/Yandex 每次同步回填多少天，以及总览在 SQLite 里往回看多远。",
      "Bing 的排名序列往往本来就更长；变动词始终是周环比。",
      "加长窗口后请再同步。本地 SQLite 是日报/规则用的账本，不是一直开着的 GSC 网页。详见指南第 11 步 · docs/ops/SYNC-AND-HISTORY.md。",
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
  {
    id: "export-share",
    tags: ["export", "share"],
    q: "怎么把数据给别人看？",
    see: "单人面板 — 没有多人登录席位。",
    fix: [
      "打开「导出」→ 勾选站点 / 日期 / 表格 → 下载（JSON、CSV 或 Markdown）。",
      "把文件发出去。Inventory 会列出本次离开面板的内容。",
    ],
  },
  {
    id: "report-ai-byok",
    tags: ["ai", "export", "byok"],
    q: "报告解读 AI 怎么用？",
    see: "设置 → 报告解读；导出 → 生成解读。",
    fix: [
      "启用报告解读，填写 OpenAI 兼容 Base URL（…/v1）、模型与自备 API Key（本地加密）。",
      "在导出页选同一切片与提示词预设，生成解读。",
      "规则与同步从不依赖 AI。Chainepic 计量属于另售商业能力。",
    ],
  },
];

export function getFaqItems(locale: UiLocale): FaqItem[] {
  return locale === "zh" ? zh : en;
}
