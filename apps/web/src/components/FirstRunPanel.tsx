import type { ReactNode } from "react";
import Link from "next/link";
import type { OnboardingProgress } from "@/lib/onboarding";

type Props = {
  progress: OnboardingProgress;
};

export function FirstRunPanel({ progress }: Props) {
  const nextHref = !progress.anyEngine || !progress.hasSites ? "/setup" : "/settings";
  const nextLabel = !progress.anyEngine
    ? "Connect engines in Setup"
    : !progress.hasSites
      ? "Select sites in Setup"
      : "Run sync in Settings";

  return (
    <section className="space-y-6 border-b border-line pb-8">
      <div>
        <p className="font-display text-3xl tracking-tight md:text-4xl">GSC · Bing · Yandex</p>
        <h1 className="mt-3 font-display text-2xl">Get your first sync running</h1>
        <p className="mt-2 max-w-xl text-sm text-ink/70">
          This panel pulls clicks, impressions, and query movers from Google Search Console, Bing Webmaster,
          and Yandex Webmaster into one SQLite-backed dashboard — plus a daily digest you can push by webhook or email.
        </p>
      </div>

      <ol className="space-y-3 text-sm">
        <Step done={progress.anyEngine} n={1}>
          Connect at least one engine in{" "}
          <Link href="/setup" className="text-accent underline decoration-line underline-offset-2">
            Setup
          </Link>{" "}
          (skip any you do not need).
        </Step>
        <Step done={progress.hasSites} n={2}>
          Check the sites/properties to monitor, then finish the wizard.
        </Step>
        <Step done={progress.hasSynced} n={3}>
          Run{" "}
          <Link href="/settings" className="text-accent underline decoration-line underline-offset-2">
            Sync
          </Link>{" "}
          once — Overview, Sites, and Keywords fill after that.
        </Step>
      </ol>

      <div className="flex flex-wrap items-center gap-3">
        <Link href={nextHref} className="bg-accent px-4 py-2 text-sm text-paper">
          {nextLabel}
        </Link>
        <Link href="/guide" className="border border-line px-4 py-2 text-sm text-ink/80 hover:bg-mist/70">
          Full guide
        </Link>
      </div>
    </section>
  );
}

function Step({ done, n, children }: { done: boolean; n: number; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center font-mono text-xs ${
          done ? "bg-accent text-paper" : "border border-line text-ink/50"
        }`}
        aria-hidden
      >
        {done ? "✓" : n}
      </span>
      <span className={done ? "text-ink/50 line-through" : "text-ink/80"}>{children}</span>
    </li>
  );
}
