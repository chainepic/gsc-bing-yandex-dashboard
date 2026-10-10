# Contributing

Thanks for helping with [gsc-bing-yandex-dashboard](https://github.com/chainepic/gsc-bing-yandex-dashboard).

1. Fork / clone this repository (keep it separate from any private SEO workspace).
2. `pnpm install` and copy `.env.example` → `apps/web/.env`.
3. Use only fictional hosts (e.g. `example.com`) in fixtures and docs.
4. Do not commit `data/`, `.env`, OAuth tokens, or production site lists.

## Scripts

- `pnpm dev` — Next.js on port 3847
- `pnpm lint` — typecheck all packages
- `pnpm build` — connectors → core → web
- `pnpm test:smoke` — panel auth unit smoke (+ optional `BASE_URL` live check)
- `pnpm screenshots` — Playwright captures into `docs/screenshots/` (app must be running with `ALLOW_DEMO_SEED=1`)

## Pull requests

- Prefer small, focused PRs.
- If you add UI screenshots, put them under `docs/screenshots/` and link them from the README.
- Never include real site names or credentials in diffs or fixtures.
