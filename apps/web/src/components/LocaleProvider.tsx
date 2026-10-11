"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { t, type I18nKey, type UiLocale } from "@/lib/i18n";

type LocaleContextValue = {
  locale: UiLocale;
  setLocale: (next: UiLocale) => Promise<void>;
};

const LocaleContext = createContext<LocaleContextValue>({
  locale: "en",
  setLocale: async () => undefined,
});

export function LocaleProvider({ locale: initialLocale, children }: { locale: UiLocale; children: ReactNode }) {
  const [locale, setLocaleState] = useState<UiLocale>(initialLocale);

  useEffect(() => {
    setLocaleState(initialLocale);
  }, [initialLocale]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = useCallback(async (next: UiLocale) => {
    if (next !== "en" && next !== "zh") return;
    setLocaleState(next);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uiLocale: next }),
      });
      if (!res.ok) {
        // Keep client locale; persistence failed silently for UX.
        console.error("Failed to persist uiLocale", await res.text().catch(() => ""));
      }
    } catch (err) {
      console.error("Failed to persist uiLocale", err);
    }
  }, []);

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): UiLocale {
  return useContext(LocaleContext).locale;
}

export function useSetLocale(): (next: UiLocale) => Promise<void> {
  return useContext(LocaleContext).setLocale;
}

export function useT() {
  const locale = useLocale();
  return (key: I18nKey, vars?: Record<string, string | number>) => t(locale, key, vars);
}
