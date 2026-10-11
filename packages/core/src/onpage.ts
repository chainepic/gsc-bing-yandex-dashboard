/** Lightweight on-page HTML parse + audit hints (no full-site crawler). */

export type OnPageSnapshot = {
  url: string;
  fetchedAt: string;
  statusCode: number | null;
  finalUrl?: string | null;
  title: string | null;
  metaDescription: string | null;
  h1: string | null;
  canonical: string | null;
  robotsMeta: string | null;
  contentLength: number;
  error?: string | null;
};

export type OnPageIssueId =
  | "missing_title"
  | "title_too_long"
  | "title_too_short"
  | "missing_meta_description"
  | "meta_description_too_long"
  | "missing_h1"
  | "missing_canonical"
  | "noindex"
  | "soft_404"
  | "http_error"
  | "fetch_error";

export type OnPageIssue = {
  id: OnPageIssueId;
  severity: "high" | "medium" | "low";
  message: string;
};

const TITLE_MAX = 60;
const TITLE_MIN = 10;
const DESC_MAX = 160;

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function metaContent(html: string, name: string): string | null {
  const re1 = new RegExp(
    `<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']*)["'][^>]*>`,
    "i"
  );
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${name}["'][^>]*>`,
    "i"
  );
  return html.match(re1)?.[1]?.trim() || html.match(re2)?.[1]?.trim() || null;
}

/** Parse HTML fields used for local audit hints. */
export function parseHtmlOnPage(url: string, html: string, statusCode: number | null): OnPageSnapshot {
  const titleRaw = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const h1Raw = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  const canonical =
    html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i)?.[1]?.trim() ||
    html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["'][^>]*>/i)?.[1]?.trim() ||
    null;

  return {
    url,
    fetchedAt: new Date().toISOString(),
    statusCode,
    title: titleRaw ? stripTags(titleRaw).slice(0, 500) : null,
    metaDescription: metaContent(html, "description")?.slice(0, 1000) || null,
    h1: h1Raw ? stripTags(h1Raw).slice(0, 500) : null,
    canonical: canonical?.slice(0, 2000) || null,
    robotsMeta: metaContent(html, "robots")?.slice(0, 200) || null,
    contentLength: html.length,
    error: null,
  };
}

export function auditOnPage(snap: OnPageSnapshot): OnPageIssue[] {
  const issues: OnPageIssue[] = [];

  if (snap.error) {
    issues.push({ id: "fetch_error", severity: "high", message: snap.error });
    return issues;
  }

  if (snap.statusCode != null && snap.statusCode >= 400) {
    issues.push({
      id: "http_error",
      severity: "high",
      message: `HTTP ${snap.statusCode}`,
    });
  }

  const title = snap.title || "";
  if (!title) {
    issues.push({ id: "missing_title", severity: "high", message: "Missing <title>" });
  } else if (title.length > TITLE_MAX) {
    issues.push({
      id: "title_too_long",
      severity: "medium",
      message: `Title length ${title.length} > ${TITLE_MAX}`,
    });
  } else if (title.length < TITLE_MIN) {
    issues.push({
      id: "title_too_short",
      severity: "low",
      message: `Title length ${title.length} < ${TITLE_MIN}`,
    });
  }

  if (!snap.metaDescription) {
    issues.push({
      id: "missing_meta_description",
      severity: "medium",
      message: "Missing meta description",
    });
  } else if (snap.metaDescription.length > DESC_MAX) {
    issues.push({
      id: "meta_description_too_long",
      severity: "low",
      message: `Meta description length ${snap.metaDescription.length} > ${DESC_MAX}`,
    });
  }

  if (!snap.h1) {
    issues.push({ id: "missing_h1", severity: "medium", message: "Missing <h1>" });
  }

  if (!snap.canonical) {
    issues.push({ id: "missing_canonical", severity: "low", message: "Missing canonical link" });
  }

  const robots = (snap.robotsMeta || "").toLowerCase();
  if (robots.includes("noindex")) {
    issues.push({
      id: "noindex",
      severity: "high",
      message: `robots meta includes noindex (${snap.robotsMeta})`,
    });
  }

  // Soft 404: 2xx but title/body signals "not found"
  const softSignal = /404|not\s*found|page\s*doesn.?t\s*exist|page\s*not\s*found/i;
  if (
    snap.statusCode != null &&
    snap.statusCode >= 200 &&
    snap.statusCode < 300 &&
    (softSignal.test(title) || (snap.contentLength > 0 && snap.contentLength < 800 && softSignal.test(title)))
  ) {
    issues.push({
      id: "soft_404",
      severity: "high",
      message: "Possible soft 404 (200 OK with not-found signals in title)",
    });
  }

  return issues;
}

export type DroppingPage = {
  url: string;
  host: string;
  clickDelta: number;
  impressionDelta: number;
  clicks: number;
  impressions: number;
  engine?: string;
};

export type OnPageAuditResult = {
  snapshot: OnPageSnapshot;
  issues: OnPageIssue[];
  dropping?: DroppingPage | null;
};
