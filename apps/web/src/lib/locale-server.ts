import { headers } from "next/headers";
import { resolveUiLocale, type UiLocale } from "@/lib/i18n";
import { getSettings } from "@/server/settings";

/** Resolve UI locale for the current request (persisted setting, else Accept-Language). */
export async function getRequestUiLocale(): Promise<UiLocale> {
  let stored: UiLocale | null = null;
  try {
    stored = getSettings().uiLocale;
  } catch {
    stored = null;
  }
  let accept: string | null = null;
  try {
    accept = (await headers()).get("accept-language");
  } catch {
    accept = null;
  }
  return resolveUiLocale(stored, accept);
}
