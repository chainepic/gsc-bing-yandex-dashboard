export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

export function todayInTz(timeZone = "Asia/Shanghai"): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function normalizeHost(value: string): string {
  return String(value || "")
    .toLowerCase()
    .replace(/^sc-domain:/, "")
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .replace(/:443$/, "")
    .replace(/:80$/, "");
}

export function pickAsOf(
  dates: string[],
  totals: Map<string, { clicks: number; impressions: number }>,
  today: string
): string | null {
  const sorted = [...dates].sort();
  if (!sorted.length) return null;
  let index = sorted.length - 1;
  let skipped = 0;
  while (index > 0 && skipped < 3) {
    const row = totals.get(sorted[index]) || { clicks: 0, impressions: 0 };
    const quiet = row.clicks === 0 && row.impressions === 0;
    const fresh = sorted[index] >= addDays(today, -2);
    if (!quiet || !fresh) break;
    index -= 1;
    skipped += 1;
  }
  return sorted[index];
}
