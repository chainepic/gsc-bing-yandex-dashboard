# Setup engagement checklist (internal)

**Track:** `cloud` · **Offer:** paid Setup ([SETUP-OFFER.md](./SETUP-OFFER.md))  
**Provider:** Chainepic LTD  
**Status:** operator runbook — use on every paid Setup call

Self-host without us remains free forever. This checklist is how **we** deliver the paid install / connect / walkthrough. Do **not** gate sync or require a Chainepic account in the MIT app.

Related: [PRICING-DRAFT.md](./PRICING-DRAFT.md) · [MANUAL-HOST-RUNBOOK.md](./MANUAL-HOST-RUNBOOK.md) · [OPEN-CORE.md](../OPEN-CORE.md)

---

## Before the call (async)

- [ ] Payment / invoice settled (or written “pay after handoff” exception).  
- [ ] Confirm package: **$199** (≤5 hosts) or **$399** (≤15 hosts / agency notes) or custom.  
- [ ] Buyer chooses path: **A)** their VPS / machine · **B)** Chainepic-hosted instance (see Manual Host runbook).  
- [ ] Collect: domain list, engines needed (any subset of GSC / Bing / Yandex), timezone preference, contact for screen-share.  
- [ ] Book **~60–90 min** live session (+ optional 30 min follow-up).  
- [ ] Prep: tagged OSS release or `main` SHA you will install; Docker Compose path preferred.

---

## Call script (live)

Use as a talk track. Skip engines the buyer does not need.

### 1. Align (5 min)

1. Restate deliverables from the one-pager: install → connect → select hosts → first sync → Overview + one Digest → 30-min reading rhythm.  
2. Confirm what we **never** do (no sync paywall after Setup; no forced three engines; no dumping data into unrelated SEO SaaS).  
3. Confirm host path A vs B and who holds `APP_SECRET` / panel password after handoff.

### 2. Install (10–20 min)

**Path A — buyer’s host**

1. Clone [gsc-bing-yandex-dashboard](https://github.com/chainepic/gsc-bing-yandex-dashboard).  
2. `cp .env.example .env` → set unique `APP_SECRET` (`openssl rand -hex 32`).  
3. Public / WAN: set `PANEL_PASSWORD` (or reverse-proxy auth).  
4. `docker compose up --build -d` → `GET /api/health` OK.  
5. Open `https://THEIR_HOST/setup` (or `http://localhost:3847/setup`).

**Path B — we host**

1. Follow [MANUAL-HOST-RUNBOOK.md](./MANUAL-HOST-RUNBOOK.md) through “Go-live check”.  
2. Share URL + panel credentials via a channel the buyer controls (not a public issue).

### 3. Connect engines (15–30 min)

| Engine | What to do on the call |
| --- | --- |
| **GSC** | Prefer OAuth; set redirect `https://HOST/api/oauth/google/callback`. Service account only if they insist — remind SA must be added on **each** property. |
| **Bing** | Paste Webmaster API key; verify sites appear. |
| **Yandex** | OAuth with `webmaster:hostinfo` + `webmaster:verify`. |

Skip unused engines in the wizard. One engine is a valid Setup.

### 4. Properties / hosts (5–10 min)

1. Select only the agreed domains (respect package host caps).  
2. Note any “verified in webmaster console but missing in panel” for follow-up.  
3. Save selection; trigger **first sync**.

### 5. Prove value (10 min)

- [ ] Overview shows non-empty movers / clicks / impressions for at least one selected host (or a clear “data lag” explanation).  
- [ ] Sites (or site detail) opens for one property.  
- [ ] Run or schedule **one Digest**; confirm it appears in UI (webhook/SMTP optional — buyer’s SMTP is their config).  
- [ ] Point at **Recommendations** (rules, no LLM required).

### 6. Screen-share rhythm (≤30 min)

Teach, don’t lecture:

1. Weekly: Overview → movers → one site deep-dive.  
2. How Digest fits (default ~09:00 in wizard TZ, e.g. `Asia/Shanghai`).  
3. Where credentials live (`./data`, encrypted with `APP_SECRET`) and [DATA-BACKUP.md](../ops/DATA-BACKUP.md) / `scripts/backup-data.sh`.  
4. How to add/remove hosts later without us.  
5. Optional upsell **only if they hate ops**: Cloud Solo (manual instance) — pricing draft, not a hard sell.

### 7. Close

1. Confirm deliverables checkbox below.  
2. Send handoff note (template at bottom) within 24 h.  
3. Offer one short async Q&A window (e.g. 7 days) — not ongoing SLA unless they buy Priority / Cloud.

---

## Deliverables (must all be true)

- [ ] Panel reachable; `/api/health` green.  
- [ ] At least one engine connected; secrets encrypted under buyer’s (or hosted) `APP_SECRET`.  
- [ ] Agreed hosts selected (within package limits).  
- [ ] First sync completed (or documented API / quota blocker with next action).  
- [ ] Overview + one Digest verified.  
- [ ] 30-minute reading rhythm delivered (or recording done if buyer missed live).  
- [ ] Handoff note sent: URL, who holds secrets, backup pointer, OSS GitHub link.  
- [ ] Path B only: instance logged in operator inventory (see Manual Host runbook).

---

## Out of scope for Setup (say no or re-quote)

- Ongoing hosting / upgrades (that is **Cloud Solo** / Agency — [PRICING-DRAFT.md](./PRICING-DRAFT.md)).  
- Multi-tenant agency workspaces (not in MIT v1).  
- Metered AI Assist (optional later; rules stay free).  
- Building keyword databases, GA4, or third-party SEO SaaS sync.  
- Guaranteeing rankings or traffic lifts.

---

## Handoff note (paste to buyer)

```text
Subject: search-triad Setup — handoff

URL: …
Panel auth: (how you log in — password channel separately if needed)
Engines connected: GSC / Bing / Yandex (subset)
Hosts selected: …
APP_SECRET custody: you | Chainepic (hosted)
Backup: docs/ops/DATA-BACKUP.md · scripts/backup-data.sh
Self-host source (MIT): https://github.com/chainepic/gsc-bing-yandex-dashboard
Questions window: … (dates)

Thanks — Chainepic LTD
```

---

## After the engagement (internal)

- [ ] Mark deal closed in Cloud weekly metrics (Setup closes).  
- [ ] If Path B: calendar recurring backup + upgrade reminder per runbook.  
- [ ] Note objections / missing FAQ → feed OSS Guide if it helps self-host too.  
- [ ] Adjust [PRICING-DRAFT.md](./PRICING-DRAFT.md) after first 3 Setup deals.
