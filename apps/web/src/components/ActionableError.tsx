"use client";

import Link from "next/link";
import { useT } from "@/components/LocaleProvider";

type Props = {
  title: string;
  message: string;
  showRetrySync?: boolean;
  showSettings?: boolean;
  showGuide?: boolean;
  onRetry?: () => void;
  retryLabel?: string;
};

export function ActionableError({
  title,
  message,
  showRetrySync = false,
  showSettings = true,
  showGuide = true,
  onRetry,
  retryLabel,
}: Props) {
  const t = useT();
  return (
    <div className="border border-warn/40 bg-mist/60 p-4 text-sm" role="alert">
      <p className="font-medium text-ink">{title}</p>
      <p className="mt-1 text-ink/70">{message}</p>
      <p className="mt-3 flex flex-wrap gap-3">
        {onRetry && (
          <button type="button" className="text-accent underline decoration-line underline-offset-2" onClick={onRetry}>
            {retryLabel || t("common_retry")}
          </button>
        )}
        {showRetrySync && (
          <Link href="/settings" className="text-accent underline decoration-line underline-offset-2">
            {t("common_settings_sync")}
          </Link>
        )}
        {showSettings && !showRetrySync && (
          <Link href="/settings" className="text-accent underline decoration-line underline-offset-2">
            {t("common_go_settings")}
          </Link>
        )}
        {showGuide && (
          <Link href="/guide" className="text-ink/55 underline decoration-line underline-offset-2 hover:text-accent">
            {t("common_guide")}
          </Link>
        )}
      </p>
    </div>
  );
}
