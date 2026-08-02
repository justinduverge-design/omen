# Security and privacy evidence — Omen LEGAL-V1

**Date:** 2026-08-02
**Classification:** account identity, consent evidence, fantasy-platform credentials, waitlist email, diagnostics

## Controls confirmed

- `POST /api/user/legal-acceptance` requires verified authentication, scopes every record to `req.user.id`, accepts only the exact `2026-08-02` Terms and Privacy versions, and requires a literal `true` age confirmation.
- Legal acceptance is idempotent for an already recorded user/version/type and does not accept a client-supplied user identifier.
- Consent evidence stores the existing bounded fields: user ID, versioned type, timestamp, IP address, and user agent. The Privacy Notice discloses device/diagnostic information and consent records.
- `DELETE /api/user/delete` retains the exact `DELETE MY OMEN DATA` confirmation gate, deletes only the authenticated user's rows and Vault-referenced credentials, records a one-way user hash, deletes the application profile, and deletes the Supabase Auth identity.
- `DELETE /api/waitlist` is on the existing public-tool rate limiter, validates and normalizes one email address, uses the service-role-only table path, and returns a non-enumerating response.
- No provider credential, Vault identifier, bearer token, email address, raw user ID, or mailing-list membership is written to logs by the new paths.
- No schema, RLS, secret, dependency, cloud-AI, or production-data mutation is required by this change.

## Residual boundaries

- Deletion is a multi-step service operation rather than a database transaction spanning Vault and Supabase Auth. Each checked failure returns an error instead of falsely claiming complete deletion; an operational retry/support path remains necessary if an external step fails.
- The deletion audit's one-way hash remains after deletion for accountability and abuse prevention, as disclosed.
- Live production proof of Supabase Auth deletion and Resend email delivery requires an authorized post-deploy canary; unit-route evidence does not substitute for that.

## Verdict

PASS. No unresolved P0/P1 security or privacy finding in this diff.
