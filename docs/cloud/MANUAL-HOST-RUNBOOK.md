# Manual Cloud host runbook (one customer · one VPS)

**Track:** `cloud` · **Audience:** Chainepic operators  
**Model:** until multi-tenant exists, **Cloud Solo** = one Docker Compose stack per customer on a dedicated (or clearly isolated) VPS.

This does **not** change the MIT self-host panel. No paywalls in `apps/`. Packaging: [OPEN-CORE.md](../OPEN-CORE.md) · Pricing intent: [PRICING-DRAFT.md](./PRICING-DRAFT.md) · Setup sales: [SETUP-OFFER.md](./SETUP-OFFER.md) · Call flow: [SETUP-CHECKLIST.md](./SETUP-CHECKLIST.md).

OSS install reference: [README](../../README.md) · [zh/QUICKSTART.md](../zh/QUICKSTART.md) · Backup: [ops/DATA-BACKUP.md](../ops/DATA-BACKUP.md).

---

## When to use this

| Situation | Action |
| --- | --- |
| Paid **Setup** Path B (“we leave you a running instance”) | Provision with this runbook |
| **Cloud Solo** ($19–$29/mo draft) | Same topology; add billing + recurring ops |
| Buyer self-hosts on their VPS | Use [SETUP-CHECKLIST.md](./SETUP-CHECKLIST.md) Path A only — **do not** mix their secrets into our inventory |

**Non-goal for v1:** shared multi-tenant control plane, Stripe inside the MIT app, agency seats in one DB.

---

## Topology (v1)

```text
Internet → DNS (customer subdomain)
        → Caddy/nginx TLS → 127.0.0.1:3847
        → Docker Compose service `search-triad`
        → volume ./data → SQLite + encrypted secrets
```

- **One customer ↔ one compose project directory** (e.g. `/opt/search-triad-customers/<slug>/`).  
- **Unique `APP_SECRET` per customer** — never reuse across tenants.  
- **Always set `PANEL_PASSWORD`** (or proxy Basic Auth) on any public host.  
- Prefer **private** operator notes for secrets; never commit `.env` or `data/`.

Suggested hostname pattern: `triad-<slug>.chainepic.com` (or customer’s domain CNAME). Confirm DNS branding before promising `chainepic.com` names publicly.

---

## Provision (first boot)

Work as a non-root user with Docker rights.

```bash
# On the VPS — example layout
sudo mkdir -p /opt/search-triad-customers
sudo chown "$USER":"$USER" /opt/search-triad-customers
cd /opt/search-triad-customers
git clone https://github.com/chainepic/gsc-bing-yandex-dashboard.git <slug>
cd <slug>
git checkout <release-tag-or-main-sha>   # pin what you support

cp .env.example .env
# Edit .env — never leave APP_SECRET empty / placeholder
```

Minimum `.env` for hosted:

```bash
APP_SECRET=$(openssl rand -hex 32)          # store in password manager
PANEL_PASSWORD='…strong unique…'           # user defaults to admin
TZ=Asia/Shanghai                           # or buyer preference
PORT=3847
```

Bring up:

```bash
APP_SECRET='…' PANEL_PASSWORD='…' docker compose up --build -d
curl -sS http://127.0.0.1:3847/api/health
```

TLS (Caddy example — matches README):

```caddy
triad-slug.example.com {
  reverse_proxy 127.0.0.1:3847
}
```

If several customers share one VPS (still separate directories):

- Bind each compose stack to a **different host port** (`3847`, `3848`, …) and proxy by hostname, **or**  
- Prefer **one small VPS per customer** when isolation / noisy-neighbor risk matters.

Record in operator inventory (spreadsheet / sealed note — not this git repo):

| Field | Example |
| --- | --- |
| Customer / slug | `acme` |
| Offer | Setup Path B / Cloud Solo |
| Host / IP | … |
| URL | `https://triad-acme…` |
| Git SHA / tag | `v0.3.1` |
| `APP_SECRET` location | 1Password item … |
| Panel auth | `PANEL_PASSWORD` item … |
| Engines | GSC+Bing |
| Backup schedule | weekly cold tar |
| Paid through | date |

---

## Go-live check

- [ ] `GET /api/health` → OK (no auth).  
- [ ] HTTPS works; HTTP redirects or closed.  
- [ ] Panel Basic Auth challenges (or proxy auth).  
- [ ] `/setup` completes for agreed engines + hosts.  
- [ ] First sync + Overview + one Digest (see Setup checklist deliverables).  
- [ ] Buyer has URL + password channel; knows whether **they** or **we** hold `APP_SECRET`.  
- [ ] Inventory row filled; backup job scheduled.

---

## Day-2 operations

### Backups (required for Cloud Solo)

Prefer **cold** backup when possible ([DATA-BACKUP.md](../ops/DATA-BACKUP.md)):

```bash
cd /opt/search-triad-customers/<slug>
docker compose stop
./scripts/backup-data.sh
# APP_SECRET stays OUT of the tarball — already in password manager
docker compose start
```

Live copy is best-effort only. Store tarballs off-box (object storage / second disk). Retention suggestion: 14 daily or 8 weekly — pick one and stick to it.

**Restore** needs the **same** `APP_SECRET` as the backup era, or OAuth/API secrets will not decrypt.

### Upgrades

```bash
cd /opt/search-triad-customers/<slug>
docker compose stop
./scripts/backup-data.sh
git fetch --tags
git checkout <new-tag>
docker compose up --build -d
curl -sS http://127.0.0.1:3847/api/health
# Smoke: login → Overview → one site
```

Pin releases; avoid surprise `main` deploys on Friday night. Note OSS version in any customer-facing Cloud status line ([DUAL-TRACK.md](../DUAL-TRACK.md) release split).

### Digest / SMTP

Buyer may configure webhook/SMTP in Settings (their credentials). For hosted instances we operate, document whether Chainepic or the buyer owns the outbound mail path — do not silently use a shared Chainepic SMTP for all customers without isolation.

### Credentials & OAuth redirects

- Google OAuth redirect must match the **public** host: `https://THEIR_HOST/api/oauth/google/callback`.  
- Rotating `APP_SECRET` invalidates stored encrypted secrets — treat as a migration, not a casual change.  
- Panel password rotate: update `.env` / compose env → recreate container.

---

## Incident quick paths

| Symptom | First checks |
| --- | --- |
| Health fails | `docker compose ps` · logs · disk full · port bind |
| Empty GSC sites | OAuth vs SA; SA added on each property; redirect URI |
| Sync stalled | Engine quotas / rate limits; [SYNC-AND-HISTORY](../ops/SYNC-AND-HISTORY.md) + Guide step 4; wait then retry (no auto 429 backoff yet) |
| Digest empty | Cron/TZ; sync completed; hosts selected |
| “Can’t decrypt” after restore | Wrong `APP_SECRET` for that data era |

Security reports from customers: point to [SECURITY.md](../../SECURITY.md) (`security@chainepic.com`). Conduct: `conduct@chainepic.com`.

---

## Offboarding / handoff to self-host

When a Cloud customer leaves or wants their data:

1. Cold tar of `data/` + export of `APP_SECRET` and panel password via secure channel.  
2. They follow [DATA-BACKUP.md](../ops/DATA-BACKUP.md) “Migrate to another machine”.  
3. We `docker compose down`, archive final backup, wipe VPS disk / revoke DNS.  
4. Close inventory row; stop billing.

Setup-only Path B (temporary host): same wipe after they confirm migration **or** convert to paid Cloud Solo.

---

## Explicit boundaries

- Do **not** put billing or tenant switching into the MIT `apps/` tree.  
- Do **not** exfiltrate customer SQLite to other Chainepic products without written opt-in ([OPEN-CORE.md](../OPEN-CORE.md)).  
- Forks may host their own cloud; they must not brand it as official Chainepic Cloud ([BRANDING.md](../BRANDING.md)).  
- True multi-tenant / Agency seats stay in backlog until ≥3 Agency conversations justify the build ([PRICING-DRAFT.md](./PRICING-DRAFT.md)).

---

## Operator checklist (copy per customer)

- [ ] Directory + pinned git revision  
- [ ] Unique `APP_SECRET` + `PANEL_PASSWORD` in password manager  
- [ ] Compose up · health OK · TLS  
- [ ] Inventory row  
- [ ] Setup checklist deliverables done  
- [ ] Backup schedule live  
- [ ] Upgrade / offboarding notes understood  
