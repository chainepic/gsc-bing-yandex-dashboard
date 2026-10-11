# Dual-track development (OSS ∥ Cloud)

How Chainepic develops **search-triad** on two tracks **at the same time** without one track blocking or gutting the other.

Related: [OPEN-CORE.md](./OPEN-CORE.md) (what is free vs paid) · [BRANDING.md](./BRANDING.md)

---

## 1. Two tracks

| | **OSS** (`track:oss`) | **Cloud** (`track:cloud`) |
| --- | --- | --- |
| Goal | Self-host MIT panel is excellent | People pay for hosting / setup / agency / AI |
| Home | This GitHub repo | Marketing site + ops (billing later); planning under `docs/cloud/` |
| Success | Install success, issues closed, Docker works | Setup orders, Cloud trials, MRR |
| Never | Paywall sync / require Chainepic login to `pnpm dev` | Delete MIT features to force upgrades |

**Shared** (`track:shared`): bugs that break both (auth crash, sync corruption). Fix for OSS first; Cloud inherits.

---

## 2. Isolation rules (hard)

1. **Shunt question** (every feature):  
   “Should a self-host user get this for free?”  
   - **Yes** → `track:oss` only.  
   - **No, only because we operate / multi-tenant / metered AI** → `track:cloud` only.  
   - Unclear → default **OSS** (protect trust).

2. **Cloud must not ship by removing MIT code.** Hosted extras live in private ops, config, or a future separate service — not by stripping the open panel.

3. **Separate backlogs** — never one mixed TODO list without labels:  
   - [backlog/oss.md](./backlog/oss.md)  
   - [backlog/cloud.md](./backlog/cloud.md)

4. **Separate releases**  
   - OSS → GitHub Release + Docker image tags.  
   - Cloud → status note / customer changelog (can mention OSS version it runs).

5. **Separate weekly metrics** (15 min each, same calendar slot OK):  
   - OSS: cold-start time, open `bug` issues, FAQ hits.  
   - Cloud: leads, Setup closes, trial→paid.

---

## 3. How to work in the same week (cadence)

```text
Monday  (30 min)  Pick ≤2 OSS + ≤2 Cloud items for the week. Write them in backlog/*.md “This week”.
Tue–Thu           Pair of sessions: morning OSS / afternoon Cloud (or alternate days). Never block Cloud on OSS polish.
Friday  (30 min)  Close or slip items. OSS: tag release if user-facing. Cloud: update docs/cloud notes.
```

**WIP limit:** max **2 active** items per track. Overflow stays in backlog, not “half-done in main”.

**Branches (optional but recommended):**

| Track | Branch prefix | Merge to |
| --- | --- | --- |
| OSS | `oss/*` | `main` |
| Cloud planning / public docs | `cloud/docs/*` | `main` (docs only) |
| Cloud product code (later) | private repo or `cloud/*` not required for MIT | hosted deploy |

Until Cloud has its own codebase, **Cloud work in this repo is docs + process only** under `docs/cloud/`. No paywalls in `apps/`.

---

## 4. GitHub mechanics

### Labels (required on issues/PRs)

| Label | Use |
| --- | --- |
| `track:oss` | Self-host MIT panel |
| `track:cloud` | Commercial offer / hosting / setup / AI meter |
| `track:shared` | Affects both; fix in OSS tree |

### Issue templates

- Bug / feature for the panel → usually `track:oss`  
- Setup package, Cloud pricing, agency → `track:cloud`

### PR checklist

PR template asks for a track. Reviewer rejects PRs that:

- Gate sync behind an account, or  
- Mix a Cloud-only paywall into MIT UI without an explicit, skippable opt-in.

---

## 5. Decision cheat sheet

| Request | Track | Action |
| --- | --- | --- |
| Better Guide / FAQ / Docker | OSS | Ship in repo |
| Longer history sync stability | OSS | Ship in repo |
| “We host it for you” | Cloud | `docs/cloud` → later infra |
| “Connect my 12 sites for me” | Cloud | Setup offer |
| Multi-seat agency workspace | Cloud | Not in MIT v1 (`listtodo` out of scope) |
| Rule engine card | OSS | Always free |
| Report AI via Chainepic credits | Cloud | Optional; BYOK report interpret stays free on OSS |
| OpenSEO / keyword SaaS plugins | — | **Out of scope** — never |

---

## 6. This week’s operating ritual (copy into calendar)

1. Open [backlog/oss.md](./backlog/oss.md) and [backlog/cloud.md](./backlog/cloud.md).  
2. Move at most two items each into **This week**.  
3. Work them on separate branches / time blocks.  
4. Friday: checkboxes + one sentence outcome each track.

If Cloud has no customer yet, Cloud week still ships **docs** (pricing draft, Setup script) — that counts as Cloud progress without touching OSS code.
