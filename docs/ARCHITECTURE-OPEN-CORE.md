# Open-core architecture (OSS ∥ Commercial)

Product boundary: [OPEN-CORE.md](./OPEN-CORE.md) · Cadence: [DUAL-TRACK.md](./DUAL-TRACK.md)

## Dependency direction

```text
connectors ← core (domain + ports) ← adapters-oss
                     ↑                      ↑
                apps/web (OSS)        commercial/* (Pro, later)
```

- MIT packages **must not** import `commercial/`.
- Gate: `pnpm check:deps` → `scripts/check-deps-direction.mjs`.

## Layout

| Path | License surface | Role |
| --- | --- | --- |
| `packages/connectors` | MIT | Webmaster API clients |
| `packages/core` | MIT | Rules, digest, **ports** (`export-slice`, `report-ai`, `entitlements`), prompt templates |
| `packages/adapters-oss` | MIT | `ByokReportAiProvider`, `NoopReportAiProvider` |
| `apps/web` | MIT | Single-user panel; wires OSS adapters |
| `commercial/` | Not MIT publish | Metered adapters / billing later — stubs only today |

## Ports (OSS shipped)

1. **ExportSlice** — selective download (JSON / CSV / Markdown) with inventory.
2. **ReportAiProvider** — interpret a slice with preset prompts (`digest_brief`, `weekly_narrative`, `export_summary`).
   - OSS: BYOK Chat Completions (`adapters-oss`).
   - Pro (planned): metered provider in `commercial/`.

## Product rules encoded here

- Single-operator panel (Basic Auth optional) — no multi-login seats in MIT.
- Share via **Export**, not multi-user accounts.
- No OpenSEO (or other third-party SEO SaaS) in the product path.
- Recommendation-card LLM polish is deprecated; narrative AI goes through Export → Report AI.
