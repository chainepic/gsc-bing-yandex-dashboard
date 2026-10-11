# Contributing

Thanks for helping with **GSC · Bing · Yandex Dashboard**  
([gsc-bing-yandex-dashboard](https://github.com/chainepic/gsc-bing-yandex-dashboard)),
maintained by **Chainepic LTD**.

Internal package / folder codename: `search-triad`. Please keep that separate
from any private SEO workspace that holds real customer data.

## Before you start

1. Read [SECURITY.md](SECURITY.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
2. Skim [docs/BRANDING.md](docs/BRANDING.md) and [docs/OPEN-CORE.md](docs/OPEN-CORE.md).
3. Use **only fictional hosts** (`example.com`, `docs.example.com`) in fixtures,
   screenshots, and issue repros.
4. Never commit `data/`, `.env`, OAuth tokens, API keys, or production site lists.

## Setup

```bash
git clone https://github.com/chainepic/gsc-bing-yandex-dashboard.git
cd gsc-bing-yandex-dashboard
pnpm install
cp .env.example apps/web/.env
# set APP_SECRET (≥16 random chars)
pnpm dev
```

Open http://localhost:3847/setup

Optional demo fixtures (fictional data only):

```bash
ALLOW_DEMO_SEED=1 curl -X POST http://localhost:3847/api/demo/seed
```

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Next.js on port 3847 |
| `pnpm lint` | Typecheck all packages |
| `pnpm build` | connectors → core → web |
| `pnpm test:smoke` | Panel auth unit smoke (+ optional `BASE_URL` live check) |
| `pnpm screenshots` | Playwright captures → `docs/screenshots/` (EN + ZH) |

Screenshots must run against a **dedicated** `DATA_DIR` with `ALLOW_DEMO_SEED=1`
(see README). Never point the capture script at a trial DB with real hosts.

## Pull requests

- Prefer small, focused PRs (one concern each).
- Describe **why**, not only what.
- Update docs/screenshots when UI changes in a user-visible way.
- Keep UI strings in `apps/web/src/lib/i18n.ts` (EN + ZH).
- Do not rename the public product brand without an issue discussion.

### PR checklist

- [ ] `pnpm lint` and `pnpm build` pass
- [ ] No real domains / keywords / secrets in the diff
- [ ] New user-facing strings have EN + ZH
- [ ] Docs updated if behavior or setup changed

## Issues

Use the GitHub issue templates:

- **Bug report** — unexpected behavior
- **Feature request** — product ideas (open-core vs hosted is noted in OPEN-CORE.md)
- **Security** — use private advisory / email, not a public issue

## License & copyright

By contributing, you agree that your contributions are licensed under the MIT
License, and copyright is assigned to **Chainepic LTD** (or licensed to
Chainepic LTD under MIT with the same terms as this repository).

## Questions

- Product / docs: open a Discussion or Feature request issue
- Security: see [SECURITY.md](SECURITY.md)
