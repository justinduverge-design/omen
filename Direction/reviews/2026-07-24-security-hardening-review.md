# Omen Security Hardening Review — 2026-07-24

## Scope

Founder-facing review of account recovery, backups, remaining Supabase advisor findings, HTTP rate limits/security headers, and production log redaction. This note records read-only findings and code changes only; it does not change production database settings, credentials, backups, or provider configuration.

## Sources Reviewed

- Supabase Security Advisor, project `xyudxfhqejbwvjngiwhw`, read-only security scan on 2026-07-24.
- `src/middleware/security.js`, `src/middleware/logging.js`, `src/middleware/sentry.js`, and `src/server.js`.
- `src/routes/waitlist.js` and `sql/omen_rls_security.sql`.
- Live read-only response headers from `https://slopssaloon.com/` and `https://slopssaloon.com/api/ready` on 2026-07-24.
- Official provider guidance: [Supabase account MFA](https://supabase.com/docs/guides/platform/multi-factor-authentication), [Supabase password security](https://supabase.com/docs/guides/auth/password-security), [Supabase backups](https://supabase.com/docs/guides/platform/backups), [GitHub recovery methods](https://docs.github.com/en/authentication/securing-your-account-with-two-factor-authentication-2fa/configuring-two-factor-authentication-recovery-methods), and [Hostinger VPS backups](https://support.hostinger.com/en/articles/1583232-how-to-back-up-or-restore-a-vps).

## Confirmed Evidence

| Control / Claim | Evidence | Source | Confidence |
|---|---|---|---|
| Core HTTP hardening is live | HSTS, CSP, frame protection, `nosniff`, and `no-referrer` appeared on the homepage and `/api/ready`. | Live response-header check | confirmed |
| General, auth, and public-tool rate limits exist | API: 100/min/IP; auth: 20/10 min/IP; selected public tools: 30/min/IP. | `src/middleware/security.js`, `src/server.js` | confirmed |
| OAuth-sensitive request logging is now protected in source | Access logs retain route/status only; query strings, referrers, and user agents are omitted. Sentry scrubs `code` and `state` query parameters. | `src/middleware/logging.js`, `src/middleware/sentry.js`, focused tests | confirmed (source); deployment pending |
| Browser capability policy is now protected in source | `Permissions-Policy` denies camera, geolocation, microphone, payment, and USB. | `src/middleware/security.js`, focused test | confirmed (source); deployment pending |
| Service-only tables are deny-by-default | `oauth_state` and `local_snapshots` have RLS and no client policies. The Advisor reports this as informational. | `sql/omen_rls_security.sql`, Supabase Advisor | confirmed |
| Leaked-password protection is disabled | Security Advisor returned `auth_leaked_password_protection` warning. | Supabase Advisor | confirmed |
| Waitlist direct inserts are broader than needed | Advisor reports unrestricted anon/authenticated INSERT policies; the current server route writes through the server secret instead. | Supabase Advisor, `src/routes/waitlist.js` | confirmed; production-policy reconciliation needed |

## Data Classification

| Data Type | Sensitivity | Source / Flow | Notes |
|---|---|---|---|
| Supabase/hosting/admin recovery factors | critical | Founder accounts | Keep outside source control and chat. |
| OAuth code/state and provider tokens | critical | Yahoo callback and provider connections | Codes/states must not enter access logs or Sentry. |
| ESPN cookies | critical | Platform connection flow | Existing code treats them as credentials and skips body logging. |
| Waitlist email addresses | personal | Public waitlist route | Public write path needs anti-abuse controls; no public reads. |
| Request metadata | internal/personal | HTTP access logs | Keep route/status/timing; avoid query strings, referrers, and user agents unless explicitly justified. |

## Founder Actions — MFA and Recovery

1. **GitHub:** Settings → Password and authentication → enable two independent methods (passkey/security key plus TOTP is preferred), then download recovery codes to your password manager. Do not keep the downloaded file in Downloads.
2. **Supabase account:** Account Settings → Security → enroll a primary TOTP factor and a backup TOTP factor on a different device/app. Supabase does **not** issue recovery codes; losing both factors can permanently lock the account.
3. **Hostinger, Infisical, Yahoo Developer, registrar, and primary email:** enable MFA, record their recovery method, and test that you can locate it without revealing a code.
4. Create a private inventory with: account, owner, primary factor, backup factor/recovery location, last tested date. Do not put recovery codes in this repository.

## Founder Actions — Backups

1. **Supabase:** open Database → Backups and record the plan, retention period, latest successful backup time, and restore owner. Daily backups are available on paid plans; PITR is a paid add-on and should only be enabled after reviewing its cost.
2. If the project is on a plan without usable managed backups, schedule a tested logical export to encrypted off-site storage. Do not place database dumps in this repository or on the VPS.
3. **Hostinger VPS:** VPS → Manage → Backups & Monitoring → Snapshots & Backups. Confirm automatic backup status and create one manual snapshot before risky infrastructure work. A restore overwrites the current VPS, only one snapshot is retained, and snapshots expire after 20 days.
4. Run a restore exercise in a non-production environment or use a documented tabletop: choose a restore point, define acceptable data loss, name the operator, and verify the app only after the restore.

## Supabase Remaining Settings

### Safe to change in the dashboard now

- Enable **leaked password protection** in the project Auth settings if the project plan supports it. It checks newly set/changed passwords against the Pwned Passwords service; existing users are not silently locked out.
- Review Auth → URL configuration and providers: production site URL and redirect allowlist should contain only current Omen endpoints. Do not remove an entry until its relying flow is identified.
- Review organization/project members and remove unused access. Enable organization-wide MFA only after every active member has enrolled a factor.

### Requires a separate production database approval

- Reconcile the two broad `waitlist_signups` INSERT policies. The intended target is server-only writes via `/api/waitlist`, with direct `anon`/`authenticated` table INSERT rights revoked after confirming no browser client writes directly to Supabase.
- Do not add policies to `oauth_state` or `local_snapshots` merely to silence the Advisor: no policy plus RLS is their intentional client-deny posture. Document/dismiss only after confirming the Data API grants remain absent.

## Rate Limits, Headers, and Logging Review

### Covered now

- IP-based general/auth/public-tool limits are in place.
- Live core headers are present; source now adds a deny-by-default `Permissions-Policy`.
- Source now prevents OAuth `code`/`state` from reaching Sentry and prevents query strings/referrers/user agents from reaching production access logs.

### Follow-up before scale

- The current limiter uses in-process memory. It is suitable for one API instance but does not share counters across replicas and resets on restart. Move it to a shared store only when scaling beyond one instance or when abuse evidence justifies it.
- Consider an OAuth-specific limiter after measuring legitimate connect behavior; do not tighten blindly and lock out users behind shared IP addresses.
- Configure a log-retention owner, access restriction, and alert threshold. Keep Sentry `sendDefaultPii: false` and test redaction when adding routes that receive credentials.

## Consent and User Expectations

- Users should not expect provider codes, tokens, or ESPN cookies to be retained in logs or analytics.
- Waitlist signups should be rate-limited and should not create a public directory of email addresses.
- Do not represent provider data as live unless the platform connection and downstream data are verified.

## Access and RBAC Notes

- Server secret keys bypass RLS and therefore belong only in server-controlled runtime configuration.
- Client roles should remain denied for OAuth state and local snapshot tables.
- Admin access should use named accounts with MFA; avoid shared credentials.

## Gaps and Unknowns

- Supabase plan/backup retention and Hostinger backup status require founder dashboard confirmation.
- The production `waitlist_signups` policy set differs from the desired server-only posture and needs a scoped migration decision.
- The source hardening changes are not live until a reviewed branch is merged and deployed.

## Approval Required

- Justin: dashboard MFA enrollment, recovery-code storage, backup/snapshot creation, enabling leaked-password protection, and any billing/PITR decision.
- Justin: a scoped production migration to revoke direct waitlist table INSERT rights, after read-only verification.
- Justin: merge/deploy approval for the source hardening branch.

## Recommended Next Safe Step

Complete the Founder Actions above, then authorize a narrowly scoped, read-only policy verification followed by a migration only if direct browser writes are confirmed unused.
