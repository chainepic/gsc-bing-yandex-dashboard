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
};

function appSecret() {
  const s = process.env.APP_SECRET;
  if (!s || s.length < 16) {
    throw new Error("APP_SECRET must be set (min 16 chars)");
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

export function mergeSecrets(patch: Partial<AppSecrets>) {
  const current = loadSecrets();
  const next: AppSecrets = {
    ...current,
    ...patch,
    google: patch.google ? { ...current.google, ...patch.google } : current.google,
    bing: patch.bing ? { ...current.bing, ...patch.bing } : current.bing,
    yandex: patch.yandex ? { ...current.yandex, ...patch.yandex } : current.yandex,
    notify: patch.notify
      ? {
          ...current.notify,
          ...patch.notify,
          smtp: patch.notify.smtp ? { ...current.notify?.smtp, ...patch.notify.smtp } : current.notify?.smtp,
        }
      : current.notify,
  };
  saveSecrets(next);
  return next;
}

export function secretsStatus() {
  const s = loadSecrets();
  return {
    google: Boolean(s.google?.refreshToken || s.google?.serviceAccountJson),
    bing: Boolean(s.bing?.apiKey),
    yandex: Boolean(s.yandex?.accessToken),
    webhook: Boolean(s.notify?.webhookUrl),
    smtp: Boolean(s.notify?.smtp?.host && s.notify?.smtp?.to),
  };
}
