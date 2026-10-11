# Sync resilience & history windows (self-host)

How **Run sync** talks to Google / Bing / Yandex, what “pagination” and rate limits mean in this panel, and how **28 / 56 / 90** day history works in SQLite vs the GSC web UI.

In-app: **Guide** (steps 4 & 11) · **FAQ** (`#sync-rate-limit`, `#history-windows`) · Settings → **Sync / UI history window**.

This is an **OSS** ops doc. No Chainepic account required.

---

## Sync shape (what the code does)

1. Settings → **Run sync now** (or daily cron before digest) calls `runSync()`.
2. Every **enabled** site binding is processed **one after another** (sequential hosts).
3. Per host, the connector for that engine fetches daily metrics + movers and **upserts** into local SQLite (`metric_daily`, keyword snapshots).
4. A failure on one host is recorded in the sync run detail; the loop **continues** with the rest. Partial success is normal.

Progress text looks like `Syncing 3/12…` then `Synced 10/12 sites; 2 failed`. Fix the failing engine and run sync again — successful hosts keep their data.

---

## Pagination (API row caps — not multi-page walks)

The connectors issue **bounded single requests**. There is **no** client-side `startRow` / `pageToken` loop that walks every row Google/Bing could return.

| Engine | What one sync pull does | Cap / window |
| --- | --- | --- |
| **GSC** | `searchanalytics.query` for `date` over the history span; then query/page movers for the current week vs prior week | `rowLimit` **1000** per call in the sync path (date series also capped at 1000 — enough for ≤90 daily points) |
| **Bing** | `GetRankAndTrafficStats` + `GetQueryStats` + `GetPageStats` | One response each; no extra paging in-app |
| **Yandex** | Host summary + popular queries + click/show **history** for the history span | Popular queries `limit=20`; history is a date-range series |

**Practical effect:** movers and query lists are “top of what that call returns,” not a full export of every query ever. Daily click/impression series for the chosen history window fit in one GSC date query.

If a future release adds true multi-page Search Analytics walks, update this section — today it does not.

---

## Rate limits & backoff

### What exists today

- **No automatic 429 retry / exponential backoff** in `@search-triad/connectors` or `runSync`.
- Sequential host processing is the only built-in pacing between sites.
- Engine HTTP/API errors surface on that site (Bing/Yandex include `HTTP {status}` in the message; GSC errors come from the Google client).
- Operator recovery = wait for quota, fix credentials/network, **Run sync again** (see FAQ `#sync-partial`, `#sync-rate-limit`).

### What to do when sync stalls or fails with quota / 429 / 503

1. Open **Settings** — read the per-site error list (do not assume the whole sync is empty).
2. Wait (minutes to a few hours depending on the engine) before hammering **Run sync**.
3. Prefer the **daily cron** over repeated manual syncs when you have many hosts.
4. Yandex connectivity issues are often network/proxy, not quota — see FAQ `#yandex-unreachable`.
5. Cloud / Setup hosts: same guidance — [MANUAL-HOST-RUNBOOK](../cloud/MANUAL-HOST-RUNBOOK.md) “Sync stalled” points here and to Guide.

### Gap (honest)

Automatic backoff, jitter, and resume-from-failed-host-only are **not implemented**. Documenting operator backoff is the current resilience story.

---

## History windows: 28 / 56 / 90

### Settings control

**Settings → History, locale & digest template → Sync / UI history window** offers exactly three values: **28**, **56**, **90** days (stored as `historyDays`; other numbers snap into those buckets).

That value does two jobs:

| Job | Behavior |
| --- | --- |
| **Sync fetch (GSC / Yandex)** | Request daily series spanning `historyDays` (clamped 28–90). GSC end date ≈ today−2; Yandex “as of” ≈ today−3 (engine freshness lag). |
| **UI rollups** | Overview / trend compare use the same window for the long series; **7d** and **28d** cards stay visible alongside `{historyDays}d`. |

**Bing:** sync does **not** pass `historyDays`. Rank/traffic series come back as whatever Webmaster returns (often multi-month). Raising the window still matters for GSC/Yandex fill and for how far Overview looks back in SQLite.

**Movers** stay **week vs prior week** regardless of 28/56/90.

After raising the window, **Run sync again** so GSC/Yandex backfill the longer series (UI copy on Trend compare says the same).

### Local SQLite vs GSC web UI

| | **This panel (SQLite)** | **GSC (and other) web UIs** |
| --- | --- | --- |
| Retention model | Upsert daily rows; **no prune job** deletes old `metric_daily` | Interactive charts in Google’s product; not your DB |
| Window this app fetches | Cap **90** days per sync for GSC/Yandex | GSC UI can explore longer ranges (e.g. many months) in *their* UI — that does not put rows into your digest/rules store |
| Multi-engine | GSC + Bing + Yandex in one place | Separate consoles |
| Downstream | Digests, rule recommendations, local trends after sync | Manual export / clicking around |

**Why local still wins for operators:** once a day is synced, it lives under `DATA_DIR` for Overview, digests, and recommendations even when you are offline from the consoles. Continuous cron keeps a **local ledger** across engines. Raising 28→56→90 increases how much GSC/Yandex history each sync **refills**; it does not magically import the full multi-year GSC archive.

Backup that ledger: [DATA-BACKUP.md](./DATA-BACKUP.md).

### Engine lag (short)

- GSC series end ~2 days behind “today” in the panel timezone.
- Yandex history “as of” ~3 days behind.
- Expect the newest 1–3 calendar days to be incomplete — same class of lag as the webmaster UIs.

---

## Related

- Engine read/write matrix: [API-MATRIX.md](../API-MATRIX.md)
- Dual-track / OSS backlog: [DUAL-TRACK.md](../DUAL-TRACK.md) · [backlog/oss.md](../backlog/oss.md)
