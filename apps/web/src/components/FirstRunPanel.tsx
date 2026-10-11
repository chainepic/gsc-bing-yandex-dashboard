"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useT } from "@/components/LocaleProvider";
import type { OnboardingProgress } from "@/lib/onboarding";

type Props = {
  progress: OnboardingProgress;
};

export function FirstRunPanel({ progress }: Props) {
  const t = useT();
  const nextHref = !progress.anyEngine || !progress.hasSites ? "/setup" : "/settings";
  const nextLabel = !progress.anyEngine
    ? t("firstrun_cta_connect")
    : !progress.hasSites
      ? t("firstrun_cta_sites")
      : t("firstrun_cta_sync");

  return (
    <section className="space-y-6 border-b border-line pb-8">
      <div>
        <p className="font-display text-3xl tracking-tight md:text-4xl">GSC · Bing · Yandex</p>
        <h1 className="mt-3 font-display text-2xl">{t("firstrun_title")}</h1>
        <p className="mt-2 max-w-xl text-sm text-ink/70">{t("firstrun_body")}</p>
      </div>

      <ol className="space-y-3 text-sm">
        <Step done={progress.anyEngine} n={1}>
          {t("firstrun_step1_before")}{" "}
          <Link href="/setup" className="text-accent underline decoration-line underline-offset-2">
            {t("firstrun_step1_link")}
          </Link>{" "}
          {t("firstrun_step1_after")}
        </Step>
        <Step done={progress.hasSites} n={2}>
          {t("firstrun_step2")}
        </Step>
        <Step done={progress.hasSynced} n={3}>
          {t("firstrun_step3_before")}{" "}
          <Link href="/settings" className="text-accent underline decoration-line underline-offset-2">
            {t("firstrun_step3_link")}
          </Link>{" "}
          {t("firstrun_step3_after")}
        </Step>
      </ol>

      <div className="flex flex-wrap items-center gap-3">
        <Link href={nextHref} className="bg-accent px-4 py-2 text-sm text-paper">
          {nextLabel}
        </Link>
        <Link href="/guide" className="border border-line px-4 py-2 text-sm text-ink/80 hover:bg-mist/70">
          {t("firstrun_full_guide")}
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
