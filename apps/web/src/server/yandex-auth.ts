import { exchangeYandexCode, refreshYandexToken } from "@search-triad/connectors";
import { loadSecrets, mergeSecrets } from "./secrets";

const EXPIRY_SKEW_MS = 60_000;

/** Return a valid Yandex access token, refreshing via refresh_token when needed. */
export async function ensureYandexAccessToken(): Promise<string> {
  const secrets = loadSecrets().yandex;
  if (!secrets?.accessToken && !secrets?.refreshToken) {
    throw new Error("Yandex token missing");
  }

  const expiresAt = secrets.expiresAt ?? 0;
  const stillValid = secrets.accessToken && expiresAt - EXPIRY_SKEW_MS > Date.now();
  if (stillValid) return secrets.accessToken!;

  if (secrets.refreshToken && secrets.clientId && secrets.clientSecret) {
    const tokens = await refreshYandexToken(secrets.clientId, secrets.clientSecret, secrets.refreshToken);
    mergeSecrets({
      yandex: {
        clientId: secrets.clientId,
        clientSecret: secrets.clientSecret,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || secrets.refreshToken,
        expiresAt: Date.now() + tokens.expires_in * 1000,
      },
    });
    return tokens.access_token;
  }

  if (secrets.accessToken) {
    // Manual / implicit tokens have no expiry metadata — use as-is until API fails.
    return secrets.accessToken;
  }

  throw new Error("Yandex access token expired and no refresh_token is stored. Re-authorize in Setup.");
}

export async function storeYandexOAuthCode(
  code: string,
  redirectUri: string
): Promise<{ accessToken: string; hasRefresh: boolean }> {
  const secrets = loadSecrets().yandex;
  if (!secrets?.clientId || !secrets?.clientSecret) {
    throw new Error("Save Yandex client ID and secret first");
  }
  const tokens = await exchangeYandexCode(secrets.clientId, secrets.clientSecret, redirectUri, code);
  mergeSecrets({
    yandex: {
      clientId: secrets.clientId,
      clientSecret: secrets.clientSecret,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || secrets.refreshToken,
      expiresAt: Date.now() + tokens.expires_in * 1000,
    },
  });
  return { accessToken: tokens.access_token, hasRefresh: Boolean(tokens.refresh_token || secrets.refreshToken) };
}
