import type { ReactNode } from "react";
import Link from "next/link";
import { GuideCredentialsSections } from "@/components/CredentialsHelp";
import { t, type UiLocale } from "@/lib/i18n";
import { getRequestUiLocale } from "@/lib/locale-server";
import { getOnboardingProgress, type OnboardingProgress } from "@/lib/onboarding";

export const dynamic = "force-dynamic";

export default async function GuidePage() {
  const locale = await getRequestUiLocale();
  const p = getOnboardingProgress();
  const doneCount = [
    p.appSecretOk,
    p.anyEngine,
    p.hasSites,
    p.hasSynced,
    p.hasNotify || p.hasDigest,
  ].filter(Boolean).length;

  return (
    <div className="mx-auto max-w-2xl space-y-12">
      <header className="space-y-3 border-b border-line pb-8">
        <p className="font-display text-4xl tracking-tight">GSC · Bing · Yandex</p>
        <h1 className="font-display text-2xl">{t(locale, "guide_title")}</h1>
        <p className="max-w-xl text-sm text-ink/70">{t(locale, "guide_sub")}</p>
        <p className="text-sm">
          {t(locale, "guide_also")}{" "}
          <Link href="/prompt" className="text-accent underline decoration-line underline-offset-2">
            {t(locale, "guide_prompt_link")}
          </Link>{" "}
          {t(locale, "guide_also_after")}
          {" · "}
          <Link href="/faq" className="text-accent underline decoration-line underline-offset-2">
            {t(locale, "nav_faq")}
          </Link>
        </p>
        <p className="font-mono text-xs text-ink/50">
          {t(locale, "guide_progress", { n: doneCount })}
          {p.setupComplete ? "" : t(locale, "guide_setup_incomplete")}
        </p>
      </header>

      <GuideStep locale={locale} n={1} title={t(locale, "guide_s1_title")} done={p.appSecretOk}>
        <p>{t(locale, "guide_s1_p1")}</p>
        <p className="mt-2">{t(locale, "guide_s1_p2")}</p>
        <StatusLine ok={p.appSecretOk} okLabel={t(locale, "guide_s1_ok_secret")} pendingLabel={t(locale, "guide_s1_pending_secret")} />
        <StatusLine
          ok={p.panelAuthEnabled}
          okLabel={t(locale, "guide_s1_ok_auth")}
          pendingLabel={t(locale, "guide_s1_pending_auth")}
          soft
        />
      </GuideStep>

      <GuideStep
        locale={locale}
        n={2}
        title={t(locale, "guide_s2_title")}
        done={p.anyEngine}
        href="/setup"
        hrefLabel={t(locale, "guide_s2_href")}
      >
        <p>{t(locale, "guide_s2_p1")}</p>
        <ul className="mt-3 space-y-1.5 text-ink/75">
          <li>
            <EngineDot color="var(--gsc)" /> <strong className="font-medium">Google</strong> — {t(locale, "guide_s2_g").replace("Google — ", "")}
          </li>
          <li>
            <EngineDot color="var(--bing)" /> <strong className="font-medium">Bing</strong> — {t(locale, "guide_s2_b").replace("Bing — ", "")}
          </li>
          <li>
            <EngineDot color="var(--yandex)" /> <strong className="font-medium">Yandex</strong> — {t(locale, "guide_s2_y").replace("Yandex — ", "")}
          </li>
        </ul>
        <GuideCredentialsSections />
        <EngineStatus progress={p} />
      </GuideStep>

      <GuideStep
        locale={locale}
        n={3}
        title={t(locale, "guide_s3_title")}
        done={p.hasSites}
        href="/setup"
        hrefLabel={t(locale, "guide_s3_href")}
      >
        <p>{t(locale, "guide_s3_p")}</p>
        <StatusLine
          ok={p.hasSites}
          okLabel={t(locale, "guide_s3_ok", { n: p.siteCount })}
          pendingLabel={t(locale, "guide_s3_pending")}
        />
      </GuideStep>

      <GuideStep
        locale={locale}
        n={4}
        title={t(locale, "guide_s4_title")}
        done={p.hasSynced}
        href="/settings"
        hrefLabel={t(locale, "guide_s4_href")}
      >
        <p>{t(locale, "guide_s4_p")}</p>
        <StatusLine ok={p.hasSynced} okLabel={t(locale, "guide_s4_ok")} pendingLabel={t(locale, "guide_s4_pending")} />
      </GuideStep>

      <GuideStep locale={locale} n={5} title={t(locale, "guide_s5_title")} done={p.hasMetrics}>
        <p>
          <Link href="/" className="text-accent underline decoration-line underline-offset-2">
            {t(locale, "nav_overview")}
          </Link>
          {" — "}
          {t(locale, "guide_s5_overview").replace(/^Overview — /, "").replace(/^总览 — /, "")}
        </p>
        <p className="mt-2">
          <Link href="/sites" className="text-accent underline decoration-line underline-offset-2">
            {t(locale, "nav_sites")}
          </Link>{" "}
          — {t(locale, "guide_s5_sites").replace(/^Sites — /, "").replace(/^站点 — /, "")}
        </p>
        <p className="mt-2">
          <Link href="/keywords" className="text-accent underline decoration-line underline-offset-2">
            {t(locale, "nav_keywords")}
          </Link>{" "}
          — {t(locale, "guide_s5_keywords").replace(/^Keywords — /, "").replace(/^关键词 — /, "")}
        </p>
        <p className="mt-2">
          <Link href="/recommendations" className="text-accent underline decoration-line underline-offset-2">
            {t(locale, "nav_recommendations")}
          </Link>{" "}
          — {t(locale, "guide_s5_recs").replace(/^Recommendations — /, "").replace(/^建议 — /, "")}
        </p>
        <p className="mt-2">{t(locale, "guide_s5_onpage")}</p>
        <StatusLine ok={p.hasMetrics} okLabel={t(locale, "guide_s5_ok")} pendingLabel={t(locale, "guide_s5_pending")} />
      </GuideStep>

      <GuideStep
        locale={locale}
        n={6}
        title={t(locale, "guide_s6_title")}
        done={p.hasNotify}
        href="/settings"
        hrefLabel={t(locale, "guide_s6_href")}
      >
        <p>{t(locale, "guide_s6_p")}</p>
        <StatusLine ok={p.hasNotify} okLabel={t(locale, "guide_s6_ok")} pendingLabel={t(locale, "guide_s6_pending")} soft />
      </GuideStep>

      <GuideStep
        locale={locale}
        n={7}
        title={t(locale, "guide_s7_title")}
        done={p.hasDigest}
        href="/digest"
        hrefLabel={t(locale, "guide_s7_href")}
      >
        <p>{t(locale, "guide_s7_p")}</p>
        <StatusLine ok={p.hasDigest} okLabel={t(locale, "guide_s7_ok")} pendingLabel={t(locale, "guide_s7_pending")} soft />
      </GuideStep>

      <GuideStep
        locale={locale}
        n={8}
        title={t(locale, "guide_s8_title")}
        done={p.hasSynced}
        href="/inspect"
        hrefLabel={t(locale, "guide_s8_href")}
      >
        <p>{t(locale, "guide_s8_p")}</p>
      </GuideStep>

      <GuideStep
        locale={locale}
        n={9}
        title={t(locale, "guide_s9_title")}
        done={p.hasMetrics}
        href="/recommendations"
        hrefLabel={t(locale, "guide_s9_href")}
      >
        <p>{t(locale, "guide_s9_p")}</p>
      </GuideStep>

      <GuideStep
        locale={locale}
        n={10}
        title={t(locale, "guide_s10_title")}
        done={p.hasSites}
        href="/settings"
        hrefLabel={t(locale, "guide_s10_href")}
      >
        <p>{t(locale, "guide_s10_p")}</p>
      </GuideStep>

      <footer className="border-t border-line pt-6 text-sm text-ink/60">
        <p>{t(locale, "guide_footer")}</p>
      </footer>
    </div>
  );
}

function GuideStep({
  locale,
  n,
  title,
  done,
  href,
  hrefLabel,
  children,
}: {
  locale: UiLocale;
  n: number;
  title: string;
  done: boolean;
  href?: string;
  hrefLabel?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-xl">
          <span className="mr-2 font-mono text-sm text-ink/45">{n}.</span>
          {title}
        </h2>
        <span className={`font-mono text-xs ${done ? "text-[var(--ok)]" : "text-ink/45"}`}>
          {done ? t(locale, "common_done") : t(locale, "common_todo")}
        </span>
      </div>
      <div className="text-sm leading-relaxed text-ink/80">{children}</div>
      {href && hrefLabel && (
        <p>
          <Link href={href} className="text-sm text-accent underline decoration-line underline-offset-2">
            {hrefLabel} →
          </Link>
        </p>
      )}
    </section>
  );
}

function StatusLine({
  ok,
  okLabel,
  pendingLabel,
  soft,
}: {
  ok: boolean;
  okLabel: string;
  pendingLabel: string;
  soft?: boolean;
}) {
  return (
    <p className={`mt-3 font-mono text-xs ${ok ? "text-[var(--ok)]" : soft ? "text-ink/45" : "text-ink/55"}`}>
      {ok ? `✓ ${okLabel}` : `○ ${pendingLabel}`}
    </p>
  );
}

function EngineStatus({ progress }: { progress: OnboardingProgress }) {
  const items = [
    { key: "google", label: "Google", ok: progress.engines.google },
    { key: "bing", label: "Bing", ok: progress.engines.bing },
    { key: "yandex", label: "Yandex", ok: progress.engines.yandex },
  ] as const;
  return (
    <ul className="mt-3 flex flex-wrap gap-3 font-mono text-xs text-ink/55">
      {items.map((i) => (
        <li key={i.key} className={i.ok ? "text-[var(--ok)]" : undefined}>
          {i.ok ? "✓" : "○"} {i.label}
        </li>
      ))}
    </ul>
  );
}

function EngineDot({ color }: { color: string }) {
  return <span className="engine-dot mr-1 align-middle" style={{ background: color }} aria-hidden />;
}
