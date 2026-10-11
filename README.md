<p align="center">
  <strong>GSC · Bing · Yandex Dashboard</strong><br />
  Self-hosted panel for Google Search Console, Bing Webmaster Tools, and Yandex Webmaster
</p>

<p align="center">
  <a href="https://github.com/chainepic/gsc-bing-yandex-dashboard/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License" /></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white" alt="Node.js" /></a>
  <img src="https://img.shields.io/badge/Google-Search%20Console-4285F4?logo=google&logoColor=white" alt="GSC" />
  <img src="https://img.shields.io/badge/Bing-Webmaster-008373?logo=microsoftbing&logoColor=white" alt="Bing" />
  <img src="https://img.shields.io/badge/Yandex-Webmaster-FC3F1D?logo=yandex&logoColor=white" alt="Yandex" />
  <a href="https://github.com/chainepic/gsc-bing-yandex-dashboard"><img src="https://img.shields.io/badge/GitHub-gsc--bing--yandex--dashboard-181717?logo=github" alt="GitHub repo" /></a>
</p>

<p align="center">
  <a href="#screenshots">Screenshots</a> ·
  <a href="#quick-start">Quick start</a> ·
  <a href="#features">Features</a> ·
  <a href="#connect-search-engines">Connect engines</a> ·
  <a href="docs/zh/QUICKSTART.md">中文快速开始</a> ·
  <a href="docs/OPEN-CORE.md">Open core / SaaS</a> ·
  <a href="docs/DUAL-TRACK.md">Dual-track ops</a>
</p>

<p align="center">
  <sub>© 2026 <strong>Chainepic LTD</strong> · Product: <strong>GSC · Bing · Yandex Dashboard</strong> · Codename: <code>search-triad</code></sub>
</p>

---

One SQLite database, three official webmaster APIs, zero third-party SEO SaaS for GSC. Connect **Google Search Console**, **Bing Webmaster**, and **Yandex Webmaster** (any subset), sync **28 / 56 / 90** days of metrics, and get dashboards plus a **daily Markdown/JSON digest** via webhook or SMTP.

Credentials stay on your server in `./data` (encrypted with `APP_SECRET`).

## Screenshots

Demo UI with fictional **example.com** hosts and placeholder keywords only (`ALLOW_DEMO_SEED=1`) — no real customer sites. Each page is captured in **English** and **Chinese** (`*-zh.png`).

Regenerate (dedicated demo DB, keep your trial instance on `:3847` untouched):

```bash
# terminal A — fresh demo data dir on :3848
rm -rf data-screenshots && mkdir data-screenshots
cd apps/web && APP_SECRET='dev-secret-at-least-32-characters!!' \
  DATA_DIR=../../data-screenshots ALLOW_DEMO_SEED=1 \
  ./node_modules/.bin/next start --hostname 127.0.0.1 --port 3848

# terminal B
BASE_URL=http://127.0.0.1:3848 pnpm screenshots
```

### Overview

<table>
  <tr>
    <td width="50%">
      <img src="docs/screenshots/overview.png" alt="Overview (English)" />
      <p align="center"><em>Overview — EN</em></p>
    </td>
    <td width="50%">
      <img src="docs/screenshots/overview-zh.png" alt="Overview (Chinese)" />
      <p align="center"><em>总览 — 中文</em></p>
    </td>
  </tr>
</table>

### Sites · Keywords · Site detail

<table>
  <tr>
    <td width="50%">
      <img src="docs/screenshots/sites.png" alt="Sites (English)" />
      <p align="center"><em>Sites — EN</em></p>
    </td>
    <td width="50%">
      <img src="docs/screenshots/sites-zh.png" alt="Sites (Chinese)" />
      <p align="center"><em>站点 — 中文</em></p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="docs/screenshots/keywords.png" alt="Keywords (English)" />
      <p align="center"><em>Keywords — EN</em></p>
    </td>
    <td width="50%">
      <img src="docs/screenshots/keywords-zh.png" alt="Keywords (Chinese)" />
      <p align="center"><em>关键词 — 中文</em></p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="docs/screenshots/site-detail.png" alt="Site detail (English)" />
      <p align="center"><em>Site detail — EN</em></p>
    </td>
    <td width="50%">
      <img src="docs/screenshots/site-detail-zh.png" alt="Site detail (Chinese)" />
      <p align="center"><em>站点详情 — 中文</em></p>
    </td>
  </tr>
</table>

### Digest · Settings · Guide · Setup

<table>
  <tr>
    <td width="50%">
      <img src="docs/screenshots/digest.png" alt="Digest (English)" />
      <p align="center"><em>Digest — EN</em></p>
    </td>
    <td width="50%">
      <img src="docs/screenshots/digest-zh.png" alt="Digest (Chinese)" />
      <p align="center"><em>日报 — 中文</em></p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="docs/screenshots/settings.png" alt="Settings (English)" />
      <p align="center"><em>Settings — EN</em></p>
    </td>
    <td width="50%">
      <img src="docs/screenshots/settings-zh.png" alt="Settings (Chinese)" />
      <p align="center"><em>设置 — 中文</em></p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="docs/screenshots/guide.png" alt="Guide (English)" />
      <p align="center"><em>Guide — EN</em></p>
    </td>
    <td width="50%">
      <img src="docs/screenshots/guide-zh.png" alt="Guide (Chinese)" />
      <p align="center"><em>指南 — 中文</em></p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="docs/screenshots/setup.png" alt="Setup (English)" />
      <p align="center"><em>Setup — EN</em></p>
    </td>
    <td width="50%">
      <img src="docs/screenshots/setup-zh.png" alt="Setup (Chinese)" />
      <p align="center"><em>安装向导 — 中文</em></p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="docs/screenshots/first-run.png" alt="First-run (English)" />
      <p align="center"><em>First-run — EN</em></p>
    </td>
    <td width="50%">
      <img src="docs/screenshots/first-run-zh.png" alt="First-run (Chinese)" />
      <p align="center"><em>首次引导 — 中文</em></p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="docs/screenshots/recommendations.png" alt="Recommendations (English)" />
      <p align="center"><em>Recommendations — EN</em></p>
    </td>
    <td width="50%">
      <img src="docs/screenshots/recommendations-zh.png" alt="Recommendations (Chinese)" />
      <p align="center"><em>建议 — 中文</em></p>
    </td>
  </tr>
</table>

More captures (FAQ, Inspect, Prompt, SMTP, engine tabs, filters): see [`docs/screenshots/`](docs/screenshots/) and `manifest.json`.

## Features

| Area | What you get |
| --- | --- |
| **Setup** | Four-step wizard; skip any engine (1–3 connected is fine) |
| **Overview** | 7 / 28-day clicks & impressions per engine, sparklines, cross-engine alerts |
| **Sites** | Side-by-side week clicks and week-over-week deltas |
| **Site detail** | Per-engine trends and top query gainers / losers |
| **Keywords** | Unified table: engine, host, clicks, impressions, position, Δ |
| **Digest** | History, preview, manual “generate & push” |
| **Schedule** | In-process cron (default **09:00** in your chosen timezone) |
| **Secrets** | OAuth tokens and API keys encrypted with `APP_SECRET` (AES-256-GCM) |

**Out of scope for v1:** GA4, Yandex Metrica, sitemap submission, multi-tenant hosting, multi-login seats, OpenSEO / keyword-SaaS plugins. Share via **Export**; optional **Report AI (BYOK)** interprets the same slice.

## Architecture

```mermaid
flowchart LR
  wizard[Setup wizard] --> secrets[Encrypted secrets]
  secrets --> sync[Sync worker]
  cron[Daily cron] --> sync
  sync --> gsc[Google Search Console]
  sync --> bing[Bing Webmaster API]
  sync --> yandex[Yandex Webmaster API]
  sync --> db[(SQLite)]
  db --> ui[Dashboard UI]
  cron --> digest[Daily digest]
  digest --> notify[Webhook / SMTP]
  digest --> ui
```

## Quick start

### Prerequisites

- [Node.js](https://nodejs.org/) 20+ and [pnpm](https://pnpm.io/) 9+
- Or [Docker](https://docs.docker.com/get-docker/) with Compose

### Local

```bash
git clone https://github.com/chainepic/gsc-bing-yandex-dashboard.git
cd gsc-bing-yandex-dashboard

pnpm install
cp .env.example apps/web/.env
```

Set **`APP_SECRET`** in `apps/web/.env` (16+ random characters), then:

```bash
pnpm dev
```

Open **http://localhost:3847/setup**.

### Docker

```bash
cp .env.example .env
# Required: set a unique APP_SECRET (Compose refuses empty / placeholder defaults)
# Recommended for public hosts: also set PANEL_PASSWORD
APP_SECRET=$(openssl rand -hex 32) PANEL_PASSWORD='your-panel-password' docker compose up --build
```

Data persists in **`./data`**. Health probe: **`GET /api/health`** (no auth).

Backup / migrate the data directory: [docs/ops/DATA-BACKUP.md](docs/ops/DATA-BACKUP.md) · `scripts/backup-data.sh`.

Sync pagination / rate limits and **28 / 56 / 90** history windows: [docs/ops/SYNC-AND-HISTORY.md](docs/ops/SYNC-AND-HISTORY.md) (also Guide steps 4 & 11, FAQ).

### Demo data

```bash
ALLOW_DEMO_SEED=1 curl -X POST http://localhost:3847/api/demo/seed
```

## Connect search engines

| Engine | Authentication | Setup notes |
| --- | --- | --- |
| **Google Search Console** | **OAuth (recommended)**; service account is advanced | Scope `webmasters.readonly`. Redirect: `https://YOUR_HOST/api/oauth/google/callback`. SA must be added as a user on each GSC property or the app lists 0 sites. |
| **Bing Webmaster** | API key | Verified sites via Webmaster API |
| **Yandex Webmaster** | OAuth + access token | Scopes `webmaster:hostinfo`, `webmaster:verify` |

## Daily digest

Cron → sync → SQLite → JSON + Markdown → optional webhook/SMTP → **Digest** in UI. Default **09:00** in wizard timezone (e.g. `Asia/Shanghai`).

## Project layout

```text
gsc-bing-yandex-dashboard/
├── apps/web/              Next.js 15 (UI + API + cron)
├── packages/connectors/   GSC, Bing, Yandex clients
├── packages/core/         Digest builder
├── docs/screenshots/      README product captures
├── docs/zh/QUICKSTART.md
└── docker-compose.yml
```

## Development

```bash
pnpm lint
pnpm build
pnpm dev
```

## Security

- Strong unique `APP_SECRET` before saving credentials (Docker entrypoint rejects empty / example placeholders)
- Optional panel **Basic Auth** — set `PANEL_PASSWORD` (user `admin`) or `BASIC_AUTH_USER` + `BASIC_AUTH_PASSWORD`. When unset, the app stays open for localhost/LAN. When set, the whole UI and API are gated (except `/api/health`)
- Never commit `data/`, `.env`, or production keys
- Prefer VPN **or** reverse-proxy auth in front of the panel on the public internet

### Reverse proxy (optional)

Terminate TLS and/or add another auth layer in front of port `3847`:

**Caddy**

```caddy
panel.example.com {
  reverse_proxy 127.0.0.1:3847
  # basicauth is optional if PANEL_PASSWORD is already set in the app
}
```

**nginx**

```nginx
location / {
  proxy_pass http://127.0.0.1:3847;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  # auth_basic "Search Triad";
  # auth_basic_user_file /etc/nginx/htpasswd;
}
```

Smoke check: `pnpm test:smoke` (add `BASE_URL=http://127.0.0.1:3847` for a live probe).

Full policy: [SECURITY.md](SECURITY.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
Brand & trademark: [docs/BRANDING.md](docs/BRANDING.md).
Hosted SaaS / AI metering (does not replace MIT self-host): [docs/OPEN-CORE.md](docs/OPEN-CORE.md).  
Open-core package layout / ports: [docs/ARCHITECTURE-OPEN-CORE.md](docs/ARCHITECTURE-OPEN-CORE.md).  
Develop OSS and Cloud in parallel without interference: [docs/DUAL-TRACK.md](docs/DUAL-TRACK.md).  
Commercial planning (ignore if you only self-host): [docs/cloud/](docs/cloud/).

## License & trademark

Source code is [MIT](LICENSE), © **2026 Chainepic LTD**. See also [NOTICE](NOTICE).

**GSC · Bing · Yandex Dashboard**, **Search Triad** (codename), and **Chainepic** are trademarks of Chainepic LTD. Google, Bing, Yandex, and related marks belong to their respective owners; this project is not affiliated with or endorsed by them.
