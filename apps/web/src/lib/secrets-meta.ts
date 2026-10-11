/** Public (non-secret) credential meta for Setup UI — safe to import from client components. */
export type SecretsPublicMeta = {
  google: {
    connected: boolean;
    mode: "oauth" | "service_account";
    clientId: string;
    hasClientSecret: boolean;
    hasRefreshToken: boolean;
    hasServiceAccount: boolean;
  };
  bing: {
    connected: boolean;
    hasApiKey: boolean;
  };
  yandex: {
    connected: boolean;
    clientId: string;
    hasClientSecret: boolean;
    hasToken: boolean;
  };
};
