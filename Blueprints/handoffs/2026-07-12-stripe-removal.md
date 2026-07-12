# Stripe Removal Handoff — 2026-07-12

## Outcome

Omen is unconditionally free in code. The paid-access implementation, dependency, configuration, UI, API contracts, tests, and fresh-schema definitions are removed.

## Contract Changes

- `/api/stripe/*` no longer exists or mounts.
- Authenticated Omen and optimizer routes no longer perform a subscription lookup or return 402.
- `GET /api/dashboard/summary` no longer returns `subscription` or `needs_subscription`.
- `GET /api/user/export` and `DELETE /api/user/delete` no longer access billing storage.
- `/api/ready` no longer advertises Stripe configuration.

## Schema Boundary

`sql/omen_rls_security.sql` now omits the retired table, index, RLS line/policy, and user flag from fresh setup. It contains idempotent `drop table if exists public.subscriptions;` and `alter table public.users drop column if exists is_subscribed;` statements for a later manual migration.

No Supabase or production database command was run. Justin owns that separate post-merge migration.

## Verification

- Intended RED: existing suite failed only on six obsolete paid-access assertions after implementation.
- GREEN: `npm test` — 388/388.
- `npm --prefix frontend run build` — pass (existing duplicate `Header.jsx` class and chunk-size warnings remain).
- `npm --prefix client run build` — pass; this legacy tree is dormant but its checkout bridge was removed.
- `npm audit --audit-level=moderate` — 0 vulnerabilities.
- Billing-reference grep is clean in `src/`, `frontend/src/`, `client/`, package/env/deploy files; only the required SQL migration statements and their structural test remain.
- `git diff --check` — clean.

## Skills and Gates

Skills invoked: `slops-repo-inspector`, `slops-tdd`, `slops-git-flow`, `slops-code-review`, `slops-quality-baseline`, `slops-context-markdown`.

Conditional skills considered but not applicable: `security-privacy-evidence` (data collection/sharing/retention did not expand; retired storage was removed), `slops-ui-ux-audit` and mobile smoke (billing UI was deleted with no replacement interaction), `pre-build-research` (no external integration added or changed).

Justin sign-off is still required for the package-file/payment-behavior change. Nothing was pushed, merged, deployed, or applied to production.
