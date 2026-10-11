import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { secretsPath } from "./paths";

export type AppSecrets = {
  google?: {
    mode: "oauth" | "service_account";
    clientId?: string;
    clientSecret?: string;
    refreshToken?: string;
    serviceAccountJson?: string;
  };
  bing?: {
    apiKey: string;
  };
  yandex?: {
    clientId: string;
    clientSecret: string;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
  };
  notify?: {
    webhookUrl?: string;
    smtp?: {
      host: string;
      port: number;
      secure: boolean;
      user: string;
      pass: string;
      from: string;
      to: string;
    };
  };
  /** BYOK Report AI — user-owned API key; never sent to Chainepic. */
  reportAi?: {
    apiKey?: string;
  };
};

const INSECURE_APP_SECRET_PLACEHOLDERS = new Set([
  "change-me-to-a-long-random-string-at-least-32-chars",
  "change-me",
]);

function appSecret() {
  const s = process.env.APP_SECRET;
  if (!s || s.length < 16) {
    throw new Error("APP_SECRET must be set (min 16 chars)");
  }
  if (INSECURE_APP_SECRET_PLACEHOLDERS.has(s)) {
    throw new Error("APP_SECRET still uses the insecure example placeholder; set a unique secret");
  }
  return crypto.createHash("sha256").update(s).digest();
}

function encrypt(plain: string) {
  const key = appSecret();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

function decrypt(blob: string) {
  const buf = Buffer.from(blob, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", appSecret(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function loadSecrets(): AppSecrets {
  const file = secretsPath();
  if (!fs.existsSync(file)) return {};
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8")) as { v: number; data: string };
    return JSON.parse(decrypt(raw.data)) as AppSecrets;
  } catch {
    return {};
  }
}

export function saveSecrets(secrets: AppSecrets) {
  const file = secretsPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const payload = { v: 1, data: encrypt(JSON.stringify(secrets)) };
  fs.writeFileSync(file, JSON.stringify(payload, null, 2));
}

/** Drop undefined / empty-string fields so blank Setup inputs never wipe stored secrets. */
function definedFields(obj: object): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== "")
  );
}

export function mergeSecrets(patch: Partial<AppSecrets>) {
  const current = loadSecrets();
  const next: AppSecrets = { ...current };
  if (patch.google) {
    next.google = { ...current.google, ...definedFields(patch.google) } as AppSecrets["google"];
  }
  if (patch.bing) {
    next.bing = { ...current.bing, ...definedFields(patch.bing) } as AppSecrets["bing"];
  }
  if (patch.yandex) {
    next.yandex = { ...current.yandex, ...definedFields(patch.yandex) } as AppSecrets["yandex"];
  }
  if (patch.notify) {
    const { smtp: patchSmtp, ...notifyRest } = patch.notify;
    next.notify = {
      ...current.notify,
      ...definedFields(notifyRest),
      smtp: patchSmtp
        ? ({ ...current.notify?.smtp, ...definedFields(patchSmtp) } as NonNullable<AppSecrets["notify"]>["smtp"])
        : current.notify?.smtp,
    };
  }
  if (patch.reportAi) {
    next.reportAi = { ...current.reportAi, ...definedFields(patch.reportAi) } as AppSecrets["reportAi"];
  }
  saveSecrets(next);
  return next;
}

export function secretsStatus() {
  const s = loadSecrets();
  return {
    google: Boolean(s.google?.refreshToken || s.google?.serviceAccountJson),
    bing: Boolean(s.bing?.apiKey),
    yandex: Boolean(s.yandex?.accessToken || s.yandex?.refreshToken),
    webhook: Boolean(s.notify?.webhookUrl),
    smtp: Boolean(s.notify?.smtp?.host && s.notify?.smtp?.to),
    reportAiKey: Boolean(s.reportAi?.apiKey),
  };
}

import type { SecretsPublicMeta } from "@/lib/secrets-meta";

/** Non-secret fields for Setup UI prefill (never returns client secrets / tokens / JSON keys). */
export function secretsPublicMeta(): SecretsPublicMeta {
  const s = loadSecrets();
  const mode = s.google?.mode === "service_account" ? "service_account" : "oauth";
  return {
    google: {
      connected: Boolean(s.google?.refreshToken || s.google?.serviceAccountJson),
      mode,
      clientId: s.google?.clientId || "",
      hasClientSecret: Boolean(s.google?.clientSecret),
      hasRefreshToken: Boolean(s.google?.refreshToken),
      hasServiceAccount: Boolean(s.google?.serviceAccountJson),
    },
    bing: {
      connected: Boolean(s.bing?.apiKey),
      hasApiKey: Boolean(s.bing?.apiKey),
    },
    yandex: {
      connected: Boolean(s.yandex?.accessToken || s.yandex?.refreshToken),
      clientId: s.yandex?.clientId || "",
      hasClientSecret: Boolean(s.yandex?.clientSecret),
      hasToken: Boolean(s.yandex?.accessToken || s.yandex?.refreshToken),
    },
  };
}

export type { SecretsPublicMeta };
