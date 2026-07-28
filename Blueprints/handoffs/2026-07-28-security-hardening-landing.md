# Security Hardening Landing — 2026-07-28

## Scope

Land the reviewed local security hardening onto current `main` history without
claiming a deployment or a production database change.

- Redact OAuth callback query data from production access logs and Sentry.
- Deny unused browser capabilities with `Permissions-Policy`.
- Keep `waitlist_signups` direct browser writes disabled in the review-only SQL
  source; the server-owned `POST /api/waitlist` path remains the intended write
  path.

## Files changed

- `src/middleware/logging.js`, `src/middleware/sentry.js`,
  `src/middleware/security.js`, `src/server.js`
- `sql/omen_rls_security.sql`
- `test/logging.test.js`, `test/securityMiddleware.test.js`,
  `test/sentryBoot.test.js`, `test/securitySql.test.js`

## Verification — SUBSTITUTED local evidence

- RED was recorded on the original isolated branch: the access-log helper and
  permissions-policy middleware did not exist, and OAuth `code`/`state` were
  not scrubbed.
- GREEN: `npm test` — 422/422 passed on 2026-07-28.
- GREEN: `npm --prefix frontend run build` passed (existing Vite chunk-size
  warning only).
- GREEN: `npm audit --audit-level=moderate` found 0 vulnerabilities.
- GREEN: `git diff --check main...HEAD` passed.
- GitHub Actions did not run because of the documented billing hold. The local
  commands above are the defined substitutes; no CI-green claim is made.

## Security and production boundary

`sql/omen_rls_security.sql` is a tracked review/source artifact only. This
work did not connect to Supabase, read a secret, apply SQL, alter RLS, deploy,
or inspect production logs. A future production policy application still needs
read-only confirmation that no browser client writes directly to the table and
Justin's separate database-mutation approval.

## Skills

Used: `slops-repo-inspector`, `slops-tdd` (original RED/GREEN evidence),
`slops-quality-baseline`, `slops-code-review`, `slops-git-flow`,
`security-privacy-evidence`, `rbac-risk-review`, and `supabase`.

`slops-ui-ux-audit`, native skills, legal review, and release/deploy skills are
N/A: no product UI, native surface, public legal claim, or deployment changed.

## Status

Code is locally verified and ready for a PR/merge. It is not deployed or live.
No correction needed to the selected procedure: separating source evidence from
production RLS application kept the privileged boundary explicit.
