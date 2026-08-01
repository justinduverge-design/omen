# Security Hardening Landing Evidence — 2026-07-28

## Scope

Local source review for OAuth telemetry redaction, browser capability denial,
and the review-only waitlist RLS posture. Audience: internal merge record.

## Sources reviewed

- `src/middleware/logging.js`, `src/middleware/sentry.js`,
  `src/middleware/security.js`, and `src/server.js`
- `sql/omen_rls_security.sql` and the matching tests
- `Blueprints/done/security-done.md`

## Confirmed evidence

| Control | Evidence | Confidence |
| --- | --- | --- |
| OAuth code/state stays out of production access logs | `safeRequestPath()` logs only the pathname; focused test covers Yahoo callback data. | confirmed |
| OAuth code/state is scrubbed before Sentry send | Sentry URL scrubber recognizes `code` and `state`; focused test covers both. | confirmed |
| Unused browser features are denied | Global `Permissions-Policy` denies camera, geolocation, microphone, payment, and USB. | confirmed |
| Waitlist direct writes are not enabled by source policy | The source removes anon/auth insert policies and grants the service role. | confirmed for source only |

## Data classification and boundaries

| Data | Sensitivity | Boundary |
| --- | --- | --- |
| OAuth code and state | critical | Never retain in access logs or Sentry URLs. |
| Provider cookies/tokens | critical | Existing credential scrubbers remain unchanged; no values were inspected. |
| Waitlist email | personal | Server route owns writes; no public table read path is introduced. |

## Gaps and approvals

- Supabase production policy state was not read or changed. A separate,
  founder-approved read-only check must precede any production SQL application.
- No deploy or production-log verification occurred; source is not live until a
  separately verified release.
