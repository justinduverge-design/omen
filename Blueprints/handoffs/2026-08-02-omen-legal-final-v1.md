# Handoff — Omen LEGAL-V1

**Date:** 2026-08-02
**Branch:** `codex/legal-final-v1`
**Base:** clean `main` at `8c2368d`
**Status:** Merged and live

## Delivered

- Replaced provisional Privacy and Terms copy with founder-approved final-v1 public documents for Valor Ventures Limited Liability Company, Connecticut operation, a 13+ audience, and a permanent no-paid-contests/no-wagering product boundary.
- Published the authorized mailing address and exact company name across legal pages, footer, waitlist email, and current brand doctrine.
- Added versioned, authenticated sign-in agreement recording for the `2026-08-02` Terms, Privacy Notice, and 13+ confirmation.
- Aligned account deletion behavior and public copy by deleting the Omen Supabase Auth identity as well as application data and Vault-backed connection credentials.
- Added a public waitlist unsubscribe page and privacy-safe removal endpoint; the welcome email now includes the postal address and unsubscribe link.
- Added route, isolation, legal-content, and unsubscribe regression coverage.

## Verification

- TDD RED: 6 expected failures for the missing final contract and behavior.
- Focused GREEN: 13/13.
- Full `npm test`: 506/506.
- `npm --prefix frontend run build`: passed; existing Vite chunk-size advisory only.
- Root and frontend `npm audit --audit-level=moderate`: 0 vulnerabilities.
- Rendered `/privacy`, `/terms`, `/login`, and `/unsubscribe` at 1280px and 375px: headings correct, no horizontal overflow.
- Code/legal/security/privacy/UI review: no remaining P0/P1/P2 finding.
- `git diff --check`: clean.

## Release evidence

- Ready PR [#269](https://github.com/justinduverge-design/omen/pull/269) passed backend tests/audit, frontend/client builds, server boot, and UI quality checks.
- Squash merge: `64305c1b322ed639f282c41c220cbe47836f4aff`.
- [Deploy run 30769488793](https://github.com/justinduverge-design/omen/actions/runs/30769488793) passed clean-runner quality, API and cron image publication, KVM1 pull/restart, health smoke, deployed-asset verification, and public-route smoke.
- Independent read-only canary: three rounds returned 200 for apex and `www` health/readiness, plus `/privacy`, `/terms`, `/login`, and `/unsubscribe`; HSTS was present and HTTP redirected to HTTPS.
- Observed canary p95 was 350 ms across 30 requests. The live bundle `/assets/index-Tl_7x0_a.js` contains the exact company name, legal assent, unsubscribe page, and no-paid-contests language.
- Live 375px browser checks rendered all four changed routes with the expected headings and no horizontal overflow.

## Boundaries and rollback

- No Supabase schema/RLS application, credential inspection, provider call, production-data write, dependency, secret, DNS, TLS, or infrastructure-config change occurred.
- Native applications are not released; equivalent current-version links and assent remain a native release gate.
- ESPN remains an unofficial provider connection; legal copy discloses fragility but does not create provider authorization.
- The canary remained read-only. Live Resend delivery, authenticated assent recording, waitlist deletion, and account/Auth deletion were not exercised against production data.
- Rollback target: revert merge `64305c1b` through a PR; the normal main workflow rebuilds and redeploys the prior `8c2368d` source.
