export function fmt(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

export function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

/** Format an ISO timestamp for UI: `2026-10-11 09:00` in the given timezone. */
export function formatDateTime(
  iso: string | null | undefined,
  timeZone = "Asia/Shanghai",
  fallback = "—"
): string {
  if (!iso) return fallback;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  // sv-SE yields `YYYY-MM-DD HH:mm` (24h).
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}
