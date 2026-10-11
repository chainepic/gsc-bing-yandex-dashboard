"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useT } from "@/components/LocaleProvider";
import type { SyncRunDetail } from "@/server/queries";

type SyncProp = {
  status: string;
  message: string | null;
  finishedAt: string | null;
  startedAt: string;
  detail: SyncRunDetail | null;
} | null;

function dismissKey(sync: NonNullable<SyncProp>) {
  return `st-sync-banner:${sync.finishedAt || sync.startedAt}:${sync.message || ""}`;
}

export function SyncStatusBanner({ sync }: { sync: SyncProp }) {
  const t = useT();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!sync) {
      setDismissed(false);
      return;
    }
    try {
      setDismissed(sessionStorage.getItem(dismissKey(sync)) === "1");
    } catch {
      setDismissed(false);
    }
  }, [sync?.finishedAt, sync?.startedAt, sync?.message]);

  function dismiss() {
    if (!sync) return;
    try {
      sessionStorage.setItem(dismissKey(sync), "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }

  if (!sync) {
    return (
      <div className="border border-line bg-mist/50 p-3 text-sm" role="status">
        <p className="font-medium">{t("sync_none_title")}</p>
        <p className="mt-1 text-ink/65">{t("sync_none_body")}</p>
        <p className="mt-2 flex flex-wrap gap-3">
          <Link href="/settings" className="text-accent underline decoration-line underline-offset-2">
            {t("common_settings_sync")}
          </Link>
          <Link href="/guide" className="text-ink/55 underline decoration-line underline-offset-2 hover:text-accent">
            {t("common_guide")}
          </Link>
        </p>
      </div>
    );
  }

  const errors = sync.detail?.errors || [];
  if (!(sync.status === "error" || errors.length) || dismissed) {
    return null;
  }

  return (
    <div className="relative border border-warn/40 bg-mist/60 p-3 pr-10 text-sm" role="alert">
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-2 top-2 px-2 py-0.5 text-ink/50 hover:bg-mist hover:text-ink"
        aria-label={t("sync_dismiss")}
      >
        ×
      </button>
      <p className="font-medium">
        {sync.status === "error" ? t("sync_failed") : t("sync_with_errors")}
      </p>
      <p className="mt-1 text-ink/70">{sync.message || t("sync_sites_failed")}</p>
      {errors.length > 0 && (
        <ul className="mt-2 list-inside list-disc text-xs text-ink/65">
          {errors.slice(0, 5).map((e, i) => (
            <li key={`${e.engine}-${e.host}-${i}`}>
              [{e.engine}] {e.host}: {e.message}
            </li>
          ))}
          {errors.length > 5 && <li>{t("sync_more", { n: errors.length - 5 })}</li>}
        </ul>
      )}
      <p className="mt-2 flex flex-wrap gap-3">
        <Link href="/settings" className="text-accent underline decoration-line underline-offset-2">
          {t("sync_retry")}
        </Link>
        <Link href="/faq" className="text-ink/55 underline decoration-line underline-offset-2 hover:text-accent">
          {t("nav_faq")}
        </Link>
        <button type="button" onClick={dismiss} className="text-ink/55 underline decoration-line underline-offset-2 hover:text-accent">
          {t("sync_dismiss")}
        </button>
      </p>
    </div>
  );
}
