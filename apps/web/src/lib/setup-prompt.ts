import {
  SETUP_DEFAULT_ORIGIN,
  SETUP_LINKS,
  SETUP_PATHS,
  SETUP_REPO,
  SETUP_SCOPES,
  googleRedirectUri,
  setupShellOneLiner,
  yandexRedirectUri,
} from "@/lib/setup-links";

export type SetupPromptLocale = "en" | "zh";

/** Build a self-contained agent prompt for install + configure. */
export function buildSetupPrompt(locale: SetupPromptLocale, origin?: string): string {
  return locale === "zh" ? buildZhPrompt(origin) : buildEnPrompt(origin);
}

export function buildSetupShellOneLiner(): string {
  return setupShellOneLiner();
}

function buildEnPrompt(origin?: string): string {
  const o = origin?.replace(/\/$/, "") || SETUP_DEFAULT_ORIGIN;
  const gRedirect = googleRedirectUri(o);
  const yRedirect = yandexRedirectUri(o);
  const { githubUrl, cloneDir, productName } = SETUP_REPO;

  return `You are setting up ${productName} end-to-end for me on this machine.

## Goal
Clone (or open) the repo, install dependencies, configure secrets, start the app, then walk me through connecting Google Search Console and/or Bing Webmaster and/or Yandex Webmaster via the in-app Setup wizard. Finish by selecting sites and running a sync. Point me to the Guide for ongoing use.

## Repo
- GitHub: ${githubUrl}
- Clone into a folder named \`${cloneDir}\` (or open that directory if it already exists).
- Product UI runs on port **3847** by default (${SETUP_DEFAULT_ORIGIN}).

## Install & run (local)
1. Require Node.js 20+ and pnpm 9+.
2. From the repo root:
   \`\`\`bash
   pnpm install
   cp .env.example apps/web/.env
   \`\`\`
3. Set **APP_SECRET** in \`apps/web/.env\` to a unique random string (≥16 chars). Generate with:
   \`\`\`bash
   openssl rand -hex 32
   \`\`\`
   Do not leave the placeholder empty. APP_SECRET encrypts stored OAuth tokens / API keys.
4. Optional for public exposure: set \`PANEL_PASSWORD\` (or \`BASIC_AUTH_USER\` / \`BASIC_AUTH_PASSWORD\`) in \`.env\`. Fine to skip on localhost/LAN. \`GET ${SETUP_PATHS.health}\` stays public.
5. Start a durable local trial server (preferred for long sessions):
   \`\`\`bash
   pnpm trial:up
   \`\`\`
   Alternative: \`pnpm dev\` for a foreground Next.js process.
   Docker alternative (from README): copy \`.env.example\` → \`.env\`, set APP_SECRET (+ PANEL_PASSWORD if public), then \`docker compose up --build\`.
6. Open ${o}${SETUP_PATHS.setup} (Setup wizard). Also bookmark ${o}${SETUP_PATHS.guide} (Guide) and ${o}${SETUP_PATHS.prompt} (this AI setup prompt page).

## Connect engines (any subset is OK — skip engines I do not need)
Do **not** put engine secrets in random env vars. Use the Setup wizard UI; each step has an in-page “How to get these credentials” expander with the same links below.

### Google Search Console — use OAuth (required default for this panel)
**Do not use a service account unless I explicitly ask.** OAuth matches personal self-hosted use: one browser consent, then every GSC property on that Google account appears. Service accounts often look “connected” but list **0 sites** until the SA email is added on each property.

1. Open Google Cloud Console credentials: ${SETUP_LINKS.googleCredentials}
2. Enable Search Console API: ${SETUP_LINKS.googleSearchConsoleApi}
3. **APIs & Services → OAuth consent screen**: User type External (or Internal for Workspace). App name e.g. Search Triad → Save and Continue.
4. If **Publishing status** is **Testing**: **Test users → Add users** → add the Gmail that will click Allow. Skipping this → Error 403 access_denied / Access blocked.
5. **Credentials → + Create credentials → OAuth client ID** → **Web application**. Under **Authorized redirect URIs**, add **exactly**:
   \`${gRedirect}\`
   Critical: browser host must match (\`localhost\` vs \`127.0.0.1\` differ). Prefer one panel URL: ${SETUP_DEFAULT_ORIGIN}.
6. Scope: \`${SETUP_SCOPES.google}\`. Do not reuse OpenSEO’s client ID.
7. Setup → Google → **OAuth (recommended)** → paste Client ID + secret → Save & authorize → Continue/Allow → select properties → Sync.

### Google — service account (only if I insist)
1. Create a service account + JSON key; enable Search Console API on the same project.
2. In Search Console (${SETUP_LINKS.googleSearchConsole}), add the service account email as a user on **each** property (skip → 0 sites).
3. Paste the full JSON in Setup service-account mode. Prefer switching me back to OAuth if listing fails.

### Bing Webmaster
1. Open Bing Webmaster Tools: ${SETUP_LINKS.bingWebmaster}
2. API help: ${SETUP_LINKS.bingApiHelp}
3. Sign in → **Settings → API Access** → generate a key → paste in Setup → Connect & list sites.

### Yandex Webmaster
1. Create an OAuth app: ${SETUP_LINKS.yandexOauthNew} (console: ${SETUP_LINKS.yandexOauth})
2. Webmaster: ${SETUP_LINKS.yandexWebmaster}
3. Set Callback URI to **exactly**: \`${yRedirect}\` (same host-matching rule as Google).
4. Request scopes: \`${SETUP_SCOPES.yandex.join("`, `")}\`.
5. Paste Client ID + Client secret in Setup → Save & authorize (or paste an existing access token).

## Sites, sync, ongoing use
1. After each engine connects, check the properties/hosts to monitor and save selection (or finish the wizard).
2. Open Settings (${o}${SETUP_PATHS.settings}) → **Run sync now** to pull ~28 days of metrics into SQLite.
3. For day-to-day use, follow the Guide: ${o}${SETUP_PATHS.guide} (Overview, Sites, Keywords, Recommendations, Digest, notifications).
4. Never commit \`.env\`, \`data/\`, or real API keys.

## Constraints
- Stay actionable: run install commands when possible; for OAuth/API consoles, give me exact click paths and the redirect URI to paste.
- Prefer English UI labels as shown in the app (Setup, Guide, Settings), or Chinese if the panel locale is 中文.
- For Google, default to OAuth; do not silently fall back to a service-account JSON from my disk unless I ask.
- If something fails (port in use, APP_SECRET, OAuth redirect mismatch, Google 0 sites), diagnose and fix before continuing.
`;
}

function buildZhPrompt(origin?: string): string {
  const o = origin?.replace(/\/$/, "") || SETUP_DEFAULT_ORIGIN;
  const gRedirect = googleRedirectUri(o);
  const yRedirect = yandexRedirectUri(o);
  const { githubUrl, cloneDir, productName } = SETUP_REPO;

  return `请你在本机把 ${productName} 从安装到配置完整跑通。

## 目标
克隆（或打开已有仓库）、安装依赖、配置密钥、启动应用，然后带我在应用内 Setup 向导里连接 Google Search Console / Bing Webmaster / Yandex Webmaster（可只连需要的引擎），选站点并执行 Sync。最后指向 Guide 作为日常使用说明。

## 仓库
- GitHub：${githubUrl}
- 目录名：\`${cloneDir}\`（已有则直接打开）
- 默认端口 **3847**（${SETUP_DEFAULT_ORIGIN}）

## 安装与启动（本地）
1. 需要 Node.js 20+ 与 pnpm 9+。
2. 在仓库根目录执行：
   \`\`\`bash
   pnpm install
   cp .env.example apps/web/.env
   \`\`\`
3. 在 \`apps/web/.env\` 设置 **APP_SECRET**（≥16 位随机字符串）。可用：
   \`\`\`bash
   openssl rand -hex 32
   \`\`\`
   不要留空占位符。APP_SECRET 用于加密存储的 OAuth token / API key。
4. 若面板会暴露到公网，另设 \`PANEL_PASSWORD\`（或 \`BASIC_AUTH_*\`）。本机/局域网可跳过。\`GET ${SETUP_PATHS.health}\` 无需登录。
5. 推荐用持久试验进程启动：
   \`\`\`bash
   pnpm trial:up
   \`\`\`
   也可前台跑 \`pnpm dev\`。Docker：复制 \`.env.example\` → \`.env\`，设置 APP_SECRET（公网再加 PANEL_PASSWORD），然后 \`docker compose up --build\`。
6. 打开 ${o}${SETUP_PATHS.setup}（Setup 向导）。同时记住 ${o}${SETUP_PATHS.guide}（使用指南）与 ${o}${SETUP_PATHS.prompt}（本 AI 一键安装 prompt 页）。

## 连接搜索引擎（子集即可，不需要的可跳过）
**不要**把引擎密钥随便写进无关环境变量。请在 Setup 向导里配置；每一步都有 “How to get these credentials” 展开说明，链接与下方一致。

### Google Search Console — 默认走 OAuth（本面板首选）
**除非我明确要求，不要用服务账号。** OAuth 适合个人自托管：浏览器授权一次，即可带上该 Google 账号下全部 GSC 资源。服务账号常出现「已连接但列出 0 个站点」——除非把 SA 邮箱加进每一个资源。

1. Google Cloud 凭证：${SETUP_LINKS.googleCredentials}
2. 启用 Search Console API：${SETUP_LINKS.googleSearchConsoleApi}
3. **APIs & Services → OAuth consent screen**：个人选 External（Workspace 可选 Internal），App name 如 Search Triad → Save and Continue。
4. 若 **Publishing status** 为 **Testing**：在 **Test users → Add users** 加入要点 Allow 的 Gmail。跳过会出现 Error 403 access_denied / 禁止访问。
5. **Credentials → + Create credentials → OAuth client ID** → **Web application**。在 **Authorized redirect URIs** 填**完全一致**：
   \`${gRedirect}\`
   主机名必须与浏览器一致（\`localhost\` ≠ \`127.0.0.1\`）。推荐只用 ${SETUP_DEFAULT_ORIGIN}。
6. Scope：\`${SETUP_SCOPES.google}\`。不要用 OpenSEO 的 Client ID。
7. 安装向导 → Google → **OAuth（推荐）** → 粘贴 Client ID + secret → 保存并授权 → Continue/Allow → 勾选资源 → 同步。

### Google — 服务账号（仅在我坚持时）
1. 创建服务账号并下载 JSON；同项目启用 Search Console API。
2. 在 Search Console（${SETUP_LINKS.googleSearchConsole}）把 SA 邮箱加为**每个**资源的用户（跳过 → 0 站）。
3. 在 Setup 服务账号模式粘贴完整 JSON。若列站失败，优先改回 OAuth。

### Bing Webmaster
1. Bing Webmaster Tools：${SETUP_LINKS.bingWebmaster}
2. API 说明：${SETUP_LINKS.bingApiHelp}
3. 登录 → **Settings → API Access** → 生成 key → 粘贴到 Setup → Connect & list sites。

### Yandex Webmaster
1. 创建 OAuth 应用：${SETUP_LINKS.yandexOauthNew}（控制台 ${SETUP_LINKS.yandexOauth}）
2. Webmaster：${SETUP_LINKS.yandexWebmaster}
3. Callback URI 填**完全一致**：\`${yRedirect}\`（主机匹配规则同 Google）。
4. 申请 scopes：\`${SETUP_SCOPES.yandex.join("`、`")}\`。
5. 在 Setup 粘贴 Client ID + Client secret → Save & authorize（或粘贴已有 access token）。

## 选站、同步、日常使用
1. 每个引擎连上后勾选要监控的站点/属性并保存（或完成向导）。
2. 打开 Settings（${o}${SETUP_PATHS.settings}）→ **Run sync now**，拉取约 28 天指标到 SQLite。
3. 日常使用看 Guide：${o}${SETUP_PATHS.guide}（Overview、Sites、Keywords、Recommendations、Digest、通知等）。
4. 勿提交 \`.env\`、\`data/\` 或真实密钥。

## 约束
- 尽量可执行：能跑的安装命令直接跑；OAuth/API 控制台给出精确点击路径与要粘贴的 redirect URI。
- UI 文案以应用内标签为准（界面可为中文）。
- Google 默认 OAuth；不要擅自改用我磁盘上的服务账号 JSON，除非我要求。
- 若端口占用、APP_SECRET、OAuth 回调不匹配、Google 0 站等失败，先诊断修好再继续。
`;
}
