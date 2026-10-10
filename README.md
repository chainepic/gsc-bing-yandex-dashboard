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
  <a href="docs/zh/QUICKSTART.md">中文快速开始</a>
</p>

---

One SQLite database, three official webmaster APIs, zero third-party SEO SaaS for GSC. Connect **Google Search Console**, **Bing Webmaster**, and **Yandex Webmaster** (any subset), sync ~28 days of metrics, and get dashboards plus a **daily Markdown/JSON digest** via webhook or SMTP.

Credentials stay on your server in `./data` (encrypted with `APP_SECRET`).

## Screenshots

Demo UI with fictional **example.com** data (`ALLOW_DEMO_SEED=1`). Regenerate with `pnpm screenshots` while the app is running.

<p align="center">
  <img src="docs/screenshots/overview.png" alt="Overview — Google, Bing, and Yandex cards with 28-day clicks and watchlist" width="920" />
</p>

<p align="center"><em>Overview — per-engine KPIs, sparklines, and cross-engine alerts</em></p>

<table>
  <tr>
    <td width="50%">
      <img src="docs/screenshots/sites.png" alt="Sites table with GSC, Bing, Yandex week-over-week deltas" />
      <p align="center"><em>Sites — week clicks &amp; Δ by engine</em></p>
    </td>
    <td width="50%">
      <img src="docs/screenshots/site-detail.png" alt="Site detail with Google Bing Yandex engine tabs and query/page movers" />
      <p align="center"><em>Site detail — engine tabs, trends, query &amp; page movers</em></p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="docs/screenshots/keywords.png" alt="Keywords movers across Google Bing Yandex" />
      <p align="center"><em>Keywords — unified movers table</em></p>
    </td>
    <td width="50%">
      <img src="docs/screenshots/keywords-filtered.png" alt="Keywords table filtered to pricing queries" />
      <p align="center"><em>Keywords — client-side filter</em></p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="docs/screenshots/digest.png" alt="Daily digest history and generate buttons" />
      <p align="center"><em>Daily digest — history, preview, generate &amp; push</em></p>
    </td>
    <td width="50%">
      <img src="docs/screenshots/settings.png" alt="Settings with schedule, webhook, SMTP, and sync" />
      <p align="center"><em>Settings — schedule, webhook, SMTP, sync</em></p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="docs/screenshots/guide.png" alt="Usage guide with onboarding progress checklist" />
      <p align="center"><em>Guide — onboarding checklist</em></p>
    </td>
    <td width="50%">
      <img src="docs/screenshots/setup.png" alt="Setup wizard connect engines step" />
      <p align="center"><em>Setup wizard — connect engines</em></p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="docs/screenshots/first-run.png" alt="First-run guidance on Overview before engines are connected" />
      <p align="center"><em>First-run guidance</em></p>
    </td>
    <td width="50%">
      <img src="docs/screenshots/settings-smtp.png" alt="Settings scrolled to SMTP email digest fields" />
      <p align="center"><em>SMTP digest delivery</em></p>
    </td>
  </tr>
</table>

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

**Out of scope for v1:** GA4, Yandex Metrica, sitemap submission, multi-tenant hosting.

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

### Demo data

```bash
ALLOW_DEMO_SEED=1 curl -X POST http://localhost:3847/api/demo/seed
```

## Connect search engines

| Engine | Authentication | Setup notes |
| --- | --- | --- |
| **Google Search Console** | OAuth client (default) or service account JSON | Scope `webmasters.readonly`. Redirect: `https://YOUR_HOST/api/oauth/google/callback` |
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

## License

[MIT](LICENSE)
