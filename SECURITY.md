# Security Policy

## Supported versions

| Version | Supported |
| --- | --- |
| `0.3.x` (main) | Yes |
| `< 0.3.0` | Best-effort only |

## Reporting a vulnerability

**Do not open a public GitHub issue for security problems.**

Email **security@chainepic.com** (or open a private [GitHub Security Advisory](https://github.com/chainepic/gsc-bing-yandex-dashboard/security/advisories/new) if you prefer).

Please include:

- Affected version / commit
- Description and impact
- Steps to reproduce or a proof of concept
- Whether you plan to disclose publicly and on what timeline

We aim to acknowledge within **72 hours** and to provide a fix or mitigation plan for confirmed issues as quickly as practical.

## Scope

In scope (examples):

- Auth bypass when `PANEL_PASSWORD` / Basic Auth is configured
- Secret exfiltration (`APP_SECRET`, OAuth tokens, API keys)
- Path traversal / SSRF against unexpected hosts from crawl/inspect endpoints
- Privilege issues in multi-user setups (when those land)

Out of scope (examples):

- Misconfiguration (empty `APP_SECRET`, public deploy without panel auth)
- Denial of service against a self-hosted instance
- Issues that require physical access to the host or stolen `APP_SECRET`

## Hardening checklist for operators

1. Set a unique `APP_SECRET` (≥ 16 random bytes; Docker rejects placeholders).
2. On any internet-facing host, set `PANEL_PASSWORD` or reverse-proxy auth.
3. Keep `./data` and `.env` off public backups / git.
4. Prefer HTTPS termination in front of port `3847`.
5. Rotate Bing/Yandex/Google credentials if a machine is compromised.
