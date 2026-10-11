## Track

- [ ] `track:oss` — MIT self-host panel (default for app/docs used by self-host)
- [ ] `track:cloud` — commercial planning / Cloud-only (`docs/cloud/`, no paywall in `apps/`)
- [ ] `track:shared` — bug that breaks both; fix lands in OSS tree

See [docs/DUAL-TRACK.md](../docs/DUAL-TRACK.md).

## Summary

<!-- Why this change exists (1–3 bullets). -->

## Type

- [ ] Bug fix
- [ ] Feature (MIT / self-host)
- [ ] Docs / branding / meta
- [ ] Cloud planning only (`docs/cloud/`)
- [ ] Refactor / chore

## Gate (required)

- [ ] Does **not** require a Chainepic account to run locally / Docker
- [ ] Does **not** put webmaster sync behind a paywall
- [ ] Does **not** remove MIT capabilities to force Cloud upgrades

## Checklist

- [ ] `pnpm lint` / `pnpm build` pass (or explain why not)
- [ ] No real domains, keywords, or secrets in the diff
- [ ] New UI strings added to EN + ZH (`apps/web/src/lib/i18n.ts`) when applicable
- [ ] Docs / screenshots updated if user-visible

## Test plan

- [ ] …
