# Commercial track (not part of the MIT panel)

This directory is the **composition home** for Chainepic-only adapters later
(metered Report AI, billing, hosted control plane).

## Rules

1. **Never** import this folder from `packages/core`, `packages/connectors`,
   `packages/adapters-oss`, or the default OSS `apps/web` wire-up.
2. Commercial code may depend on `@search-triad/core` ports and implement them
   (e.g. `MeteredReportAiProvider`).
3. Public GitHub / Docker OSS images must not ship proprietary sources from here.
   Until real Pro code exists, this folder only holds stubs and docs pointers.

## Planned packages (not implemented yet)

| Path | Purpose |
| --- | --- |
| `adapters/metered-report-ai` | Chainepic credits for report interpretation |
| `billing/` | Stripe / entitlements |
| `host/` | Multi-tenant control plane (only after Agency demand) |

OSS self-host users: ignore this directory. See [docs/OPEN-CORE.md](../docs/OPEN-CORE.md).
