# Open core, hosted SaaS, and AI metering

This repository is **MIT-licensed open source** for self-hosting.
That does **not** conflict with Chainepic LTD offering a separate **hosted
SaaS** or metered AI features. Open source is the distribution model for the
panel code; commercial products are how we fund maintenance.

## What stays free (self-hosted MIT)

Always intended to remain in this repo for local / Docker use:

- Connect GSC / Bing / Yandex (any subset)
- Sync metrics, movers, coverage gaps, watchlist
- Overview / Sites / Keywords / Digest / Guide / Setup
- Rule-based recommendations (deterministic, no paid LLM)
- Optional webhook / SMTP you configure yourself
- EN + ZH UI

You bring your own webmaster API credentials. Data stays in your `./data`.

## What Chainepic may charge for (commercial)

These are **not required** to use the open-source panel:

| Offer | Who pays | What you get |
| --- | --- | --- |
| **Hosted SaaS** | Subscription | We run the panel, upgrades, backups, multi-seat agency workspaces |
| **AI Assist (metered)** | Credits / usage | LLM-powered rewrite of recommendations, on-page critique, digest narratives |
| **Install / migration** | One-time or retainer | We wire your properties into self-hosted or SaaS |
| **Priority support** | Subscription | SLA email / chat for agencies |

Self-host users can always:

1. **Skip AI** — use rule-based recommendations only (free).
2. **BYOK** — paste their own OpenAI / Anthropic / etc. key (their bill).
3. **Chainepic credits** — call Chainepic’s meter when hosted or when they opt in (our bill → their prepaid credits).

## Does SaaS conflict with MIT?

**No.** MIT explicitly allows commercial use, including selling a hosted
service. Conflicts only appear if we:

- Pretend the cloud product is “required”
- Relicense already-published MIT code without clarity
- Trademark-block fair references to the open-source project

Our approach:

- **Code in this GitHub repo** → MIT, copyright Chainepic LTD
- **chainepic.com hosted product** → Terms of Service + privacy policy (separate)
- **Product name / logo** → trademark policy in [BRANDING.md](BRANDING.md)

Forks may host their own cloud; they should not brand it as the official
Chainepic “GSC · Bing · Yandex Dashboard” cloud.

## How AI metering can work (planned)

```text
Self-host panel
    ├─ Rules engine (local, free)
    ├─ BYOK → user LLM provider (user pays provider)
    └─ Optional Chainepic meter → HTTPS API + API key / JWT
            └─ deduct credits per 1K tokens or per “AI action”
```

Suggested packaging (starting point, not a promise):

| Pack | Credits | Rough fit |
| --- | --- | --- |
| Free trial | 50–100 actions | Taste the AI layer |
| Solo | ~2–5 USD / mo equivalent | Weekly digests + a few audits |
| Agency | higher pool + soft seats | Multi-site narrated digests |

Billable unit options (pick one in product later):

1. **Per AI action** (recommend rewrite, page critique, digest section) — easiest to explain
2. **Per 1K tokens** — fairer if prompts vary widely
3. **Included in SaaS plan** — flat subscription, meter only for overage

Recommendation for launch: **SaaS plans include an AI allowance**; self-host
gets BYOK free + optional prepaid credit packs for Chainepic meter.

## What we will not do

- Put webmaster sync itself behind a paywall in the MIT tree
- Exfiltrate self-host SQLite to Chainepic without explicit opt-in
- Require an account to run `pnpm dev` / Docker locally
