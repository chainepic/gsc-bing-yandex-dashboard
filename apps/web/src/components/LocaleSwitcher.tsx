"use client";

import { useLocale, useSetLocale, useT } from "@/components/LocaleProvider";
import type { UiLocale } from "@/lib/i18n";

type Props = {
  /** `prominent` for Setup header; `compact` for Nav. */
  variant?: "compact" | "prominent";
  className?: string;
};

const OPTIONS: Array<{ value: UiLocale; label: string }> = [
  { value: "en", label: "en" },
  { value: "zh", label: "中文" },
];

export function LocaleSwitcher({ variant = "compact", className = "" }: Props) {
  const locale = useLocale();
  const setLocale = useSetLocale();
  const t = useT();
  const prominent = variant === "prominent";

  return (
    <div
      role="group"
      aria-label={t("settings_ui_lang")}
      className={`inline-flex items-center gap-0.5 ${className}`}
    >
      {OPTIONS.map((opt, i) => {
        const active = locale === opt.value;
        return (
          <span key={opt.value} className="inline-flex items-center">
            {i > 0 && <span className="mx-1 text-ink/35" aria-hidden>/</span>}
            <button
              type="button"
              aria-pressed={active}
              onClick={() => void setLocale(opt.value)}
              className={
                prominent
                  ? `rounded px-2.5 py-1 text-sm transition ${
                      active
                        ? "bg-accent text-paper"
                        : "text-ink/65 hover:bg-mist/80 hover:text-ink"
                    }`
                  : `px-1.5 py-0.5 text-xs transition ${
                      active ? "font-medium text-ink" : "text-ink/50 hover:text-ink"
                    }`
              }
            >
              {opt.label}
            </button>
          </span>
        );
      })}
    </div>
  );
}
