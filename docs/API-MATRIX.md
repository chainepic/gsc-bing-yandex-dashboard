# Search Triad — engine API capability matrix

Self-hosted panel uses **first-party Webmaster APIs only**. OpenSEO is not a backbone.

| Capability | Google (GSC) | Bing Webmaster | Yandex Webmaster | Notes |
| --- | --- | --- | --- | --- |
| List properties / hosts | Read | Read | Read | Setup wizard |
| Daily clicks / impressions (~28d) | Read | Read | Read | Sync → SQLite |
| Query movers (WoW) | Read | Read | Read (popular; limited Δ) | Yandex lacks full WoW query Δ |
| Page movers (WoW) | Read | Read | — | No Yandex page movers in API path used |
| Sitemaps list / status | Read | Read (`GetFeeds`) | Read | **No sitemap submit** in product |
| URL inspection / index detail | Read (`urlInspection`) | Read (`GetUrlInfo`) | Host summary + recrawl match | Yandex has no GSC-style per-URL inspect |
| SQI / searchable pages | — | — | Read (host summary) | Shown on site host card; evidence on tips |
| URL submission / indexing push | — | **Optional write** (`SubmitUrl`) | Recrawl queue (not wired as product write) | Bing: Settings opt-in + confirm + audit log |
| On-page HTML audit | Local fetch | Local fetch | Local fetch | Own monitored hosts only; not an engine API |

## Read vs write policy

- **Default:** read-only monitoring + local rule recommendations + optional local HTML audit.
- **Writes:** Bing URL submit only, off by default, requires Settings flag + UI confirmation, logged in `audit_log`.
- **Out of scope:** sitemap submit, bulk “index brushing”, competitor crawl, backlink graphs, cloud SEO APIs as product core.

## Local features (not engine APIs)

| Feature | Scope |
| --- | --- |
| Rule engine / recommendations | Derived from synced SQLite metrics |
| Digest “This week's recommendations” | Toggle in Settings |
| On-page crawl | User-triggered; concurrency + URL cap in Settings |
| SSRF guard | Crawl only enabled site hosts; block private/localhost |

Last updated with Phase C of the product backlog.
