import type { ReactNode } from "react";
import Link from "next/link";
import { getOnboardingProgress, type OnboardingProgress } from "@/lib/onboarding";

export const dynamic = "force-dynamic";

export default function GuidePage() {
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
        <h1 className="font-display text-2xl">How to use this panel</h1>
        <p className="max-w-xl text-sm text-ink/70">
          Self-hosted Search Console + Webmaster dashboard. Connect engines, sync ~28 days of metrics, watch
          sites and keywords, then push a daily Markdown digest.
        </p>
        <p className="font-mono text-xs text-ink/50">
          Progress {doneCount}/5 core steps
          {p.setupComplete ? "" : " · Setup not finished yet"}
        </p>
      </header>

      <GuideStep n={1} title="Secure credentials & the panel" done={p.appSecretOk}>
        <p>
          Set a unique <code className="font-mono text-xs">APP_SECRET</code> (16+ characters) in{" "}
          <code className="font-mono text-xs">.env</code> before storing OAuth tokens or API keys. Generate with{" "}
          <code className="font-mono text-xs">openssl rand -hex 32</code>.
        </p>
        <p className="mt-2">
          If this host is reachable from the public internet, also set{" "}
          <code className="font-mono text-xs">PANEL_PASSWORD</code> (or{" "}
          <code className="font-mono text-xs">BASIC_AUTH_*</code>).{" "}
          <code className="font-mono text-xs">GET /api/health</code> stays public for probes.
        </p>
        <StatusLine ok={p.appSecretOk} okLabel="APP_SECRET looks set" pendingLabel="APP_SECRET missing or insecure placeholder" />
        <StatusLine
          ok={p.panelAuthEnabled}
          okLabel="Panel Basic Auth enabled"
          pendingLabel="Panel auth unset (fine on localhost/LAN)"
          soft
        />
      </GuideStep>

      <GuideStep n={2} title="Connect search engines" done={p.anyEngine} href="/setup" hrefLabel="Open Setup wizard">
        <p>
          Use the <strong className="font-medium">Setup</strong> wizard — do not paste secrets into random env vars for
          engines. Connect any subset of Google, Bing, and Yandex; skip what you do not need.
        </p>
        <ul className="mt-3 space-y-1.5 text-ink/75">
          <li>
            <EngineDot color="var(--gsc)" /> <strong className="font-medium">Google</strong> — OAuth client (redirect{" "}
            <code className="font-mono text-xs">/api/oauth/google/callback</code>) or service account JSON
          </li>
          <li>
            <EngineDot color="var(--bing)" /> <strong className="font-medium">Bing</strong> — Webmaster API key
          </li>
          <li>
            <EngineDot color="var(--yandex)" /> <strong className="font-medium">Yandex</strong> — OAuth (scopes{" "}
            <code className="font-mono text-xs">webmaster:hostinfo</code>,{" "}
            <code className="font-mono text-xs">webmaster:verify</code>)
          </li>
        </ul>
        <EngineStatus progress={p} />
      </GuideStep>

      <GuideStep n={3} title="Select sites to monitor" done={p.hasSites} href="/setup" hrefLabel="Select sites in Setup">
        <p>
          After each engine connects, check the properties/hosts you care about. Nothing is monitored until you save
          selection and finish (or save selection mid-wizard). You can re-run Setup anytime from Settings.
        </p>
        <StatusLine
          ok={p.hasSites}
          okLabel={`${p.siteCount} enabled site binding${p.siteCount === 1 ? "" : "s"}`}
          pendingLabel="No sites selected yet"
        />
      </GuideStep>

      <GuideStep n={4} title="Run a sync" done={p.hasSynced} href="/settings" hrefLabel="Settings → Sync">
        <p>
          Open Settings and click <strong className="font-medium">Run sync now</strong>. This pulls roughly 28 days of
          performance data into SQLite. Daily cron also syncs before building the digest (default hour from Setup).
        </p>
        <StatusLine ok={p.hasSynced} okLabel="At least one successful sync (or metrics present)" pendingLabel="No successful sync yet" />
      </GuideStep>

      <GuideStep n={5} title="Read Overview, Sites, and Keywords" done={p.hasMetrics}>
        <p>
          <Link href="/" className="text-accent underline decoration-line underline-offset-2">
            Overview
          </Link>{" "}
          — per-engine 7/28-day clicks, sparklines, watchlist drops.
        </p>
        <p className="mt-2">
          <Link href="/sites" className="text-accent underline decoration-line underline-offset-2">
            Sites
          </Link>{" "}
          — week clicks and week-over-week deltas; open a host for trends and query movers.
        </p>
        <p className="mt-2">
          <Link href="/keywords" className="text-accent underline decoration-line underline-offset-2">
            Keywords
          </Link>{" "}
          — unified movers table across engines.
        </p>
        <StatusLine ok={p.hasMetrics} okLabel="Metric rows present" pendingLabel="Waiting for sync data" />
      </GuideStep>

      <GuideStep
        n={6}
        title="Notifications (webhook / SMTP)"
        done={p.hasNotify}
        href="/settings"
        hrefLabel="Configure in Settings"
      >
        <p>
          Optional. In Settings, save a webhook URL (Slack/Discord/generic HTTP) and/or SMTP so digests can be delivered
          automatically after the daily job.
        </p>
        <StatusLine ok={p.hasNotify} okLabel="Webhook and/or SMTP configured" pendingLabel="No notify channel yet (optional)" soft />
      </GuideStep>

      <GuideStep n={7} title="Run digests" done={p.hasDigest} href="/digest" hrefLabel="Open Digest">
        <p>
          Digest history lives under Digest. Use <strong className="font-medium">Generate &amp; push</strong> to build
          Markdown/JSON on demand. Cron uses your timezone and digest hour from Setup/Settings.
        </p>
        <StatusLine ok={p.hasDigest} okLabel="At least one digest saved" pendingLabel="No digests yet" soft />
      </GuideStep>

      <footer className="border-t border-line pt-6 text-sm text-ink/60">
        <p>
          Stuck mid-OAuth? Stay in{" "}
          <Link href="/setup" className="text-accent underline decoration-line underline-offset-2">
            Setup
          </Link>
          — callbacks return there. Need to change bindings later? Settings → Re-run setup wizard.
        </p>
      </footer>
    </div>
  );
}

function GuideStep({
  n,
  title,
  done,
  href,
  hrefLabel,
  children,
}: {
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
          {done ? "Done" : "Todo"}
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
