"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useT } from "@/components/LocaleProvider";
import {
  SETUP_DEFAULT_ORIGIN,
  SETUP_LINKS,
  SETUP_PATHS,
  SETUP_SCOPES,
  googleRedirectUri,
  yandexRedirectUri,
} from "@/lib/setup-links";

type Engine = "google" | "bing" | "yandex";

type Props = {
  engine: Engine;
  /** When Google: which auth mode is selected */
  googleMode?: "oauth" | "service_account";
  /** Default open for the Google step (main friction) */
  defaultOpen?: boolean;
};

function useOrigin() {
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);
  return origin;
}

function HelpDetails({
  summary,
  defaultOpen,
  children,
}: {
  summary: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  return (
    <details
      className="border-t border-line pt-3 text-sm"
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className="cursor-pointer text-accent underline decoration-line underline-offset-2">
        {summary}
      </summary>
      <div className="mt-3 space-y-3 text-ink/75 leading-relaxed">{children}</div>
    </details>
  );
}

function ExtLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-accent underline decoration-line underline-offset-2"
    >
      {children}
    </a>
  );
}

function Code({ children }: { children: ReactNode }) {
  return <code className="break-all font-mono text-xs text-ink/85">{children}</code>;
}

function GoogleOAuthSteps({ redirectUri }: { redirectUri: string }) {
  const t = useT();
  return (
    <>
      <p className="text-xs text-ink/55">{t("creds_g_oauth_ui_note")}</p>
      <p className="flex flex-wrap gap-x-4 gap-y-1">
        <ExtLink href={SETUP_LINKS.googleCredentials}>{t("creds_open_gcp")}</ExtLink>
        <ExtLink href={SETUP_LINKS.googleSearchConsoleApi}>{t("creds_enable_gsc_api")}</ExtLink>
        <ExtLink href={SETUP_LINKS.googleSearchConsole}>Search Console</ExtLink>
      </p>
      <ol className="list-decimal space-y-1.5 pl-5">
        <li>{t("creds_g_oauth_1")}</li>
        <li>{t("creds_g_oauth_2")}</li>
        <li>{t("creds_g_oauth_3")}</li>
        <li>
          {t("creds_g_oauth_4")}
          <br />
          <Code>{redirectUri}</Code>
        </li>
        <li>{t("creds_g_oauth_5")}</li>
        <li>{t("creds_g_oauth_6")}</li>
        <li>{t("creds_g_oauth_7")}</li>
      </ol>
      <p className="rounded border border-line bg-paper px-3 py-2 text-xs text-ink/70">{t("creds_g_oauth_403")}</p>
      <p className="text-xs text-ink/55">
        {t("creds_g_oauth_note")} <Code>{SETUP_SCOPES.google}</Code>.
      </p>
    </>
  );
}

function GoogleHelp({ mode, defaultOpen }: { mode: "oauth" | "service_account"; defaultOpen?: boolean }) {
  const t = useT();
  const origin = useOrigin();
  const redirectUri = googleRedirectUri(origin || SETUP_DEFAULT_ORIGIN);

  return (
    <HelpDetails summary={t("creds_how_google")} defaultOpen={defaultOpen}>
      {mode === "oauth" ? (
        <GoogleOAuthSteps redirectUri={redirectUri} />
      ) : (
        <>
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            <ExtLink href={SETUP_LINKS.googleCredentials}>{t("creds_open_gcp")}</ExtLink>
            <ExtLink href={SETUP_LINKS.googleSearchConsoleApi}>{t("creds_enable_gsc_api")}</ExtLink>
          </p>
          <ol className="list-decimal space-y-1.5 pl-5">
            <li>{t("creds_g_sa_1")}</li>
            <li>{t("creds_g_sa_2")}</li>
            <li>
              {t("creds_g_sa_3")} (<ExtLink href={SETUP_LINKS.googleSearchConsole}>Search Console</ExtLink>)
            </li>
            <li>{t("creds_g_sa_4")}</li>
          </ol>
        </>
      )}
    </HelpDetails>
  );
}

function BingHelp({ defaultOpen }: { defaultOpen?: boolean }) {
  const t = useT();
  return (
    <HelpDetails summary={t("creds_how_bing")} defaultOpen={defaultOpen}>
      <p>
        <ExtLink href={SETUP_LINKS.bingWebmaster}>Open Bing Webmaster Tools</ExtLink>
        {" · "}
        <ExtLink href={SETUP_LINKS.bingApiHelp}>API help</ExtLink>
      </p>
      <ol className="list-decimal space-y-1.5 pl-5">
        <li>{t("creds_bing_1")}</li>
        <li>{t("creds_bing_2")}</li>
        <li>{t("creds_bing_3")}</li>
      </ol>
    </HelpDetails>
  );
}

function YandexHelp({ defaultOpen }: { defaultOpen?: boolean }) {
  const t = useT();
  const origin = useOrigin();
  const redirectUri = yandexRedirectUri(origin || SETUP_DEFAULT_ORIGIN);

  return (
    <HelpDetails summary={t("creds_how_yandex")} defaultOpen={defaultOpen}>
      <p>
        <ExtLink href={SETUP_LINKS.yandexOauth}>Open Yandex OAuth</ExtLink>
        {" · "}
        <ExtLink href={SETUP_LINKS.yandexWebmaster}>Yandex Webmaster</ExtLink>
      </p>
      <ol className="list-decimal space-y-1.5 pl-5">
        <li>
          {t("creds_yandex_1")} (<ExtLink href={SETUP_LINKS.yandexOauthNew}>oauth.yandex.com</ExtLink>)
        </li>
        <li>
          {t("creds_yandex_2")} <br />
          <Code>{redirectUri}</Code>
        </li>
        <li>
          {t("creds_yandex_3")} <Code>{SETUP_SCOPES.yandex[0]}</Code> / <Code>{SETUP_SCOPES.yandex[1]}</Code>.
        </li>
        <li>{t("creds_yandex_4")}</li>
      </ol>
      <p className="text-xs text-ink/55">{t("creds_yandex_note")}</p>
    </HelpDetails>
  );
}

/** Expandable “how to get credentials” under Setup engine fields. */
export function CredentialsHelp({ engine, googleMode = "oauth", defaultOpen }: Props) {
  if (engine === "google") {
    return <GoogleHelp mode={googleMode} defaultOpen={defaultOpen} />;
  }
  if (engine === "bing") {
    return <BingHelp defaultOpen={defaultOpen} />;
  }
  return <YandexHelp defaultOpen={defaultOpen} />;
}

/** Guide / help sections — Google OAuth checklist matches Setup expander (en + zh). */
export function GuideCredentialsSections() {
  const t = useT();
  const origin = useOrigin();
  const gRedirect = googleRedirectUri(origin || SETUP_DEFAULT_ORIGIN);
  return (
    <div className="mt-4 space-y-5 border-t border-line pt-4">
      <div className="space-y-3">
        <h3 className="font-medium">
          <span className="engine-dot mr-1.5 align-middle" style={{ background: "var(--gsc)" }} aria-hidden />
          Google Search Console — OAuth
        </h3>
        <p className="text-sm text-ink/75">{t("creds_guide_g_oauth")}</p>
        <div className="space-y-3 text-sm text-ink/75 leading-relaxed">
          <GoogleOAuthSteps redirectUri={gRedirect} />
        </div>
        <p className="text-sm text-ink/55">{t("creds_guide_g_sa")}</p>
      </div>

      <div className="space-y-2">
        <h3 className="font-medium">
          <span className="engine-dot mr-1.5 align-middle" style={{ background: "var(--bing)" }} aria-hidden />
          Bing Webmaster
        </h3>
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <ExtLink href={SETUP_LINKS.bingWebmaster}>Bing Webmaster Tools</ExtLink>
          <ExtLink href={SETUP_LINKS.bingApiHelp}>Get API key help</ExtLink>
        </p>
<p className="text-sm text-ink/75">{t("creds_guide_bing")}</p>
      </div>

      <div className="space-y-2">
        <h3 className="font-medium">
          <span className="engine-dot mr-1.5 align-middle" style={{ background: "var(--yandex)" }} aria-hidden />
          Yandex Webmaster
        </h3>
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <ExtLink href={SETUP_LINKS.yandexOauth}>Yandex OAuth</ExtLink>
          <ExtLink href={SETUP_LINKS.yandexWebmaster}>Yandex Webmaster</ExtLink>
        </p>
        <p className="text-sm text-ink/75">
          {t("creds_guide_yandex", {
            path: `{your-origin}${SETUP_PATHS.yandexCallback}`,
            example: yandexRedirectUri(),
            s1: SETUP_SCOPES.yandex[0],
            s2: SETUP_SCOPES.yandex[1],
          })}
        </p>
      </div>
    </div>
  );
}
