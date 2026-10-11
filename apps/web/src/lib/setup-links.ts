/** Shared console URLs, redirect paths, and repo facts — keep CredentialsHelp + AI prompts in sync. */

export const SETUP_DEFAULT_ORIGIN = "http://localhost:3847";

export const SETUP_REPO = {
  githubUrl: "https://github.com/chainepic/gsc-bing-yandex-dashboard",
  cloneDir: "gsc-bing-yandex-dashboard",
  productName: "Search Triad (GSC · Bing · Yandex Dashboard)",
} as const;

export const SETUP_PATHS = {
  googleCallback: "/api/oauth/google/callback",
  yandexCallback: "/api/oauth/yandex/callback",
  setup: "/setup",
  guide: "/guide",
  prompt: "/prompt",
  settings: "/settings",
  health: "/api/health",
} as const;

export const SETUP_SCOPES = {
  google: "webmasters.readonly",
  yandex: ["webmaster:hostinfo", "webmaster:verify"] as const,
} as const;

export const SETUP_LINKS = {
  googleCredentials: "https://console.cloud.google.com/apis/credentials",
  googleSearchConsoleApi:
    "https://console.cloud.google.com/apis/library/searchconsole.googleapis.com",
  googleSearchConsole: "https://search.google.com/search-console",
  bingWebmaster: "https://www.bing.com/webmasters/home",
  bingApiHelp:
    "https://www.bing.com/webmasters/help/how-to-use-bing-webmaster-api-a2d3cbec",
  yandexOauth: "https://oauth.yandex.com/",
  yandexOauthNew: "https://oauth.yandex.com/client/new",
  yandexWebmaster: "https://webmaster.yandex.com/",
} as const;

export function setupOrigin(origin?: string): string {
  const o = (origin || "").replace(/\/$/, "");
  return o || SETUP_DEFAULT_ORIGIN;
}

export function googleRedirectUri(origin?: string): string {
  return `${setupOrigin(origin)}${SETUP_PATHS.googleCallback}`;
}

export function yandexRedirectUri(origin?: string): string {
  return `${setupOrigin(origin)}${SETUP_PATHS.yandexCallback}`;
}

export function setupShellOneLiner(): string {
  const { githubUrl, cloneDir } = SETUP_REPO;
  return [
    `git clone ${githubUrl}.git`,
    `cd ${cloneDir}`,
    "pnpm install",
    "cp .env.example apps/web/.env",
    'SECRET=$(openssl rand -hex 32)',
    'printf "\\nAPP_SECRET=%s\\n" "$SECRET" >> apps/web/.env',
    "pnpm trial:up",
    `echo "Open ${SETUP_DEFAULT_ORIGIN}${SETUP_PATHS.setup}"`,
  ].join(" && ");
}
