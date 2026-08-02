# Handoff — Omen LEGAL-V1

**Date:** 2026-08-02
**Branch:** `codex/legal-final-v1`
**Base:** clean `main` at `8c2368d`

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

## Boundaries and next gate

- No Supabase schema/RLS application, credential inspection, provider call, production data, dependency, merge, push, deploy, or live mutation occurred.
- Native applications are not released; equivalent current-version links and assent remain a native release gate.
- ESPN remains an unofficial provider connection; legal copy discloses fragility but does not create provider authorization.
- Next step is founder review of this branch. Push, PR, merge, deployment, live email proof, Auth-deletion canary, and production canary remain separate authorized stages.
