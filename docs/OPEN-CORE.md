# Open core, hosted SaaS, and AI metering

This repository is **MIT-licensed open source** for self-hosting.
That does **not** conflict with Chainepic LTD offering a separate **hosted
SaaS** or metered AI features. Open source is the distribution model for the
panel code; commercial products are how we fund maintenance.

**Architecture:** [ARCHITECTURE-OPEN-CORE.md](./ARCHITECTURE-OPEN-CORE.md)  
**How we develop both without blocking each other:** [DUAL-TRACK.md](./DUAL-TRACK.md)  
**OSS backlog:** [backlog/oss.md](./backlog/oss.md) · **Cloud backlog:** [backlog/cloud.md](./backlog/cloud.md)

## What stays free (self-hosted MIT)

Always intended to remain in this repo for local / Docker use:

- Connect GSC / Bing / Yandex (any subset)
- Sync metrics, movers, coverage gaps, watchlist
- Overview / Sites / Keywords / Digest / Guide / Setup
- Rule-based recommendations (deterministic, no paid LLM)
- **Selective export** (JSON / CSV / Markdown) for sharing data or reports
- **Report AI (BYOK)** — optional; user API key + preset prompts interpret an export slice
- Optional webhook / SMTP you configure yourself
- EN + ZH UI
- Single-operator panel (optional Basic Auth) — no multi-login seats

You bring your own webmaster API credentials. Data stays in your `./data`.

## What Chainepic may charge for (commercial)

These are **not required** to use the open-source panel:

| Offer | Who pays | What you get |
| --- | --- | --- |
| **Hosted SaaS** | Subscription | We run the panel, upgrades, backups (agency multi-seat later) |
| **AI Assist (metered)** | Credits / usage | Same report-interpretation prompts via Chainepic meter (no user BYOK required) |
| **Install / migration** | One-time or retainer | We wire your properties into self-hosted or SaaS |
| **Priority support** | Subscription | SLA email / chat for agencies |

Self-host users can always:

1. **Skip AI** — use rule-based recommendations + plain export only (free).
2. **BYOK** — paste their own OpenAI-compatible API key (their bill) for report interpretation.
3. **Chainepic credits** — call Chainepic’s meter when hosted or when they opt in (planned; lives under `commercial/`).

## Does SaaS conflict with MIT?

**No.** MIT explicitly allows commercial use, including selling a hosted
service. Conflicts only appear if we:

- Pretend the cloud product is “required”
- Relicense already-published MIT code without clarity
- Trademark-block fair references to the open-source project

Our approach:

- **Code in this GitHub repo (MIT packages)** → MIT, copyright Chainepic LTD
- **`commercial/` proprietary adapters** → not part of the OSS publish surface
- **chainepic.com hosted product** → Terms of Service + privacy policy (separate)
- **Product name / logo** → trademark policy in [BRANDING.md](BRANDING.md)

Forks may host their own cloud; they should not brand it as the official
Chainepic “GSC · Bing · Yandex Dashboard” cloud.

## How AI works (OSS today + meter later)

```text
Self-host panel
    ├─ Rules engine (local, free)
    ├─ Selective export (local, free)
    ├─ BYOK Report AI → user Chat Completions API (user pays provider)
    └─ Optional Chainepic meter (commercial/) → credits for the same prompts
```

Billable unit options for the meter (pick one in product later):

1. **Per AI action** (one interpretation) — easiest to explain
2. **Per 1K tokens** — fairer if slices vary widely
3. **Included in SaaS plan** — flat subscription, meter only for overage

## What we will not do

- Put webmaster sync itself behind a paywall in the MIT tree
- Exfiltrate self-host SQLite to Chainepic without explicit opt-in
- Require an account to run `pnpm dev` / Docker locally
- Multi-login seats or multi-tenant control plane inside the MIT panel
- Integrate OpenSEO (or similar keyword SaaS) as a product path
