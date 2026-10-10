import { getPanelAuthFromEnv, isInsecureAppSecret } from "@/lib/panel-auth";
import { listDigests } from "@/server/digest-job";
import { latestSync, listSites, overviewMetrics } from "@/server/queries";
import { secretsStatus } from "@/server/secrets";
import { getSettings } from "@/server/settings";

export type OnboardingProgress = {
  setupComplete: boolean;
  appSecretOk: boolean;
  panelAuthEnabled: boolean;
  engines: { google: boolean; bing: boolean; yandex: boolean };
  anyEngine: boolean;
  siteCount: number;
  hasSites: boolean;
  hasSynced: boolean;
  hasMetrics: boolean;
  hasNotify: boolean;
  hasDigest: boolean;
  /** True when Overview would be empty / misleading without guidance. */
  needsFirstRunHelp: boolean;
};

export function getOnboardingProgress(): OnboardingProgress {
  const settings = getSettings();
  const engines = secretsStatus();
  const anyEngine = engines.google || engines.bing || engines.yandex;
  const siteCount = listSites().filter((s) => s.enabled).length;
  const sync = latestSync();
  const metrics = overviewMetrics(28);
  const hasMetrics = metrics.some((m) => Number(m.clicks) > 0 || Number(m.impressions) > 0);
  const hasSynced = sync?.status === "ok" || hasMetrics;
  const hasNotify = engines.webhook || engines.smtp;
  const hasDigest = listDigests(1).length > 0;

  return {
    setupComplete: settings.setupComplete,
    appSecretOk: !isInsecureAppSecret(process.env.APP_SECRET),
    panelAuthEnabled: Boolean(getPanelAuthFromEnv()),
    engines: { google: engines.google, bing: engines.bing, yandex: engines.yandex },
    anyEngine,
    siteCount,
    hasSites: siteCount > 0,
    hasSynced: hasSynced || hasMetrics,
    hasMetrics,
    hasNotify,
    hasDigest,
    needsFirstRunHelp: !anyEngine || siteCount === 0 || (!hasSynced && !hasMetrics),
  };
}
