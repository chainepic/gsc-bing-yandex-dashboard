/**
 * Capability flags. OSS self-host is always fully entitled for local features.
 * Commercial adapters may return a restricted set for metered AI later —
 * but must never gate webmaster sync.
 */
export type Entitlements = {
  /** Selective export download */
  exportSlice: boolean;
  /** BYOK / local report interpretation */
  reportAiByok: boolean;
  /** Chainepic metered report AI (commercial only) */
  reportAiMetered: boolean;
};

export const OSS_FULL_ENTITLEMENTS: Entitlements = {
  exportSlice: true,
  reportAiByok: true,
  reportAiMetered: false,
};

export interface EntitlementsProvider {
  get(): Entitlements;
}

export class OssEntitlementsProvider implements EntitlementsProvider {
  get(): Entitlements {
    return { ...OSS_FULL_ENTITLEMENTS };
  }
}
