# Security Logging and Browser-Policy Hardening — 2026-07-24

## Status

Code and focused/full tests are green on local branch `codex/security-log-redaction`, commit `fc162d5`. This is **not merge-ready yet** because the repository's current dependency audit reports 15 advisories, including 5 high, in pre-existing/transitive dependency chains. No push, merge, deploy, database mutation, dashboard change, or secret handling occurred.

## Scope

- Prevent OAuth authorization code and CSRF state leakage through operational telemetry.
- Remove unnecessary query strings, referrers, and user agents from production access logs.
- Add a deny-by-default browser `Permissions-Policy`.
- Record the live Supabase advisor findings and founder-owned account/backup actions.

## Runtime Behavior

### Production access logs

- Preserve remote address, timestamp, HTTP method, route path, protocol, status, response bytes, and response time.
- Do not log query strings, referrers, or user agents.
- This means `/api/yahoo/callback?code=...&state=...` is logged only as `/api/yahoo/callback`.

### Sentry

- URL query keys matching OAuth `code` or `state`, alongside existing credential-like keys, are replaced with `[scrubbed]` before sending an event.

### Response headers

- `Permissions-Policy: camera=(), geolocation=(), microphone=(), payment=(), usb=()` is set globally.

## Files Changed

- `src/middleware/logging.js`
- `src/middleware/sentry.js`
- `src/middleware/security.js`
- `src/server.js`
- `test/logging.test.js`
- `test/securityMiddleware.test.js`
- `test/sentryBoot.test.js`

## Verification

- Intended RED: focused tests failed before implementation because access-log helper/policy middleware were absent and Sentry exposed `code`/`state`.
- GREEN focused: `node --test test/securityMiddleware.test.js test/sentryBoot.test.js test/logging.test.js` — 7/7.
- GREEN broader: `npm test` — 417/417.
- GREEN frontend build: canonical checkout `npm --prefix frontend run build`.
- GREEN `git diff --check`.
- HOLD dependency audit: `npm audit --audit-level=moderate` — 15 advisories, 5 high. No package change was made because it is outside this hardening slice and needs a dedicated dependency plan.

## Supabase Findings (Read-only)

- `local_snapshots` and `oauth_state` have RLS with no policies: intentional service-only posture; do not add client policies only to silence the advisor.
- `waitlist_signups` has broad direct INSERT policies while the server route already writes via the server secret. A separate, explicitly approved production policy reconciliation should verify client usage and then revoke direct client INSERT rights if unused.
- Leaked-password protection is disabled and can be enabled in the Auth dashboard if the project plan supports it.

## Limitations / Next Step

- Founder must complete MFA/recovery setup and backup verification; see `Direction/reviews/2026-07-24-security-hardening-review.md`.
- Do not merge/deploy this branch until the dependency-audit regression has a documented decision or remediation.
