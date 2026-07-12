# Handoff — 2026-07-12 — Full Stripe/Billing Removal

## Context

Justin decided 2026-07-12 (see `Direction/decision_log.md`) that Omen ships free indefinitely
and Stripe is not used on this product at all — he uses Stripe on other projects, not Omen.
When asked to confirm scope, he chose **full backend + schema removal**, not another
kill-switch layer on top of the existing `VITE_BILLING_ENABLED`/`VITE_APP_STORE_BUILD` posture.

## What shipped

**Backend — deleted outright:**
- `src/routes/stripe.js` (checkout/portal/prices/webhook)
- `src/middleware/subscription.js` (`requireSubscription`)
- `src/services/subscription.js` (Stripe-backed persistence layer)

**Backend — edited:**
- `src/server.js` — unmounted both `/api/stripe` routers (webhook + JSON routes).
- `src/config/index.js` — removed `config.stripe` and `config.billing`.
- `src/routes/optimizer.js` — dropped the `requireSubscription` gate; `/api/optimizer/*` is auth-only now.
- `src/routes/omen.js` / `src/services/omen.js` — removed `getOmenSubscriptionStatus`/`subscriptionRequiredMvpResponse`; `POST /api/omen/mvp-move` no longer returns 402.
- `src/routes/dashboard.js` — `GET /api/dashboard/summary` no longer returns a `subscription` field; `tools.omen_of_the_week`/`tools.waiver_wire` are `mode: "free"`, no `needs_subscription` status.
- `src/routes/system.js` — `/api/ready` no longer reports a `stripe` optional-service flag.
- `src/routes/userPrivacy.js` — export/delete no longer touch a `subscriptions` table.
- `scripts/smoke-tier2-endpoints.js` — removed the Stripe-prices smoke check.

**Schema — `sql/omen_rls_security.sql`:**
- Added `drop table if exists public.subscriptions cascade;` and `alter table public.users drop column if exists is_subscribed;` at the top of the file.
- Removed the `subscriptions` table definition, its index, and its RLS policy from the rest of the file.
- **This is a source-file change only.** It has not been run against production Supabase — this session has no DB-execution capability. Someone needs to run the updated script against prod with Justin's sign-off before the schema actually converges.

**Frontend:**
- Deleted `frontend/src/components/ui/UpgradeState.jsx` (was already dead code, zero importers, before this change).
- `frontend/src/pages/Account.jsx` — removed `SubscriptionBanner`, `PlanPicker`/`PlanCard`, `BillingDates`, `ActiveSubscription`, `SubscriptionSection`, and all the Stripe-return-param handling (`?subscribed=true`, `?cancelled=true`, `?upgrade=true`) and scroll-to-subscription logic. Delete-confirmation copy no longer mentions "subscription records."

**Dependencies:**
- `stripe` removed from root `package.json`/`package-lock.json`. Root `npm audit` improved from 5 to 0 vulnerabilities as a side effect.

**Also touched (config/infra referencing the removed routes/env):**
- `deploy/hostinger/nginx-omen.conf` — removed the dead `/api/stripe/webhook` proxy location.
- `docker-compose.yml` — removed `STRIPE_*` env passthroughs on both the api and cron services.
- `scripts/oracle-https-setup.sh` — removed the Stripe webhook nginx block from the setup script.
- `.env.example`, `deploy/hostinger/ENV-INVENTORY.md` — removed `STRIPE_*`/`VITE_BILLING_ENABLED` rows.
- `README.md` — removed the Payments row from the tech-stack table, the Stripe env example block, and the "Stripe live keys" launch-checklist item.

**Docs:**
- `Blueprints/api-routes.md` — removed the 4 `/api/stripe/*` rows, noted the dashboard-summary contract no longer has a `subscription` field.
- `Direction/facts-of-record.md` — updated fact #1 to state Stripe is fully removed, not kill-switch-gated.
- `Direction/release_readiness.md` — added a top-of-file note that its Stripe-gate content is stale/moot (doc itself predates this decision by a month and needs a full re-sync, not attempted here).
- `Blueprints/agent_handoff.md`, `Blueprints/handoffs/backend-to-frontend.md`, `Blueprints/handoffs/frontend-to-backend.md` — these are dated append-only logs; added one "this is now removed" note per file rather than rewriting historical entries.
- `Blueprints/prompts/codex-stripe-live-validation.md` — moved to `Archive/prompts/` (dead prompt for a validation flow that no longer applies).

## Explicitly out of scope

- **`client/`** — a separate legacy duplicate app (not `frontend/`) that still has live Stripe UI/calls in `App.jsx`/`AuthApp.jsx`. Left untouched per explicit user decision (recommended default: leave it alone as dead code). Its Stripe calls will now 404 against the removed backend routes if that app is ever resurrected.
- **Applying the SQL drop to production** — requires Justin's sign-off and someone with DB execution access; this session only edited the source file.

## Verification

- `npm test` (root): 388/388 pass.
- `npm audit --audit-level=moderate` (root): 0 vulnerabilities (down from 5 — the `stripe` package's transitive deps are gone).
- `frontend && npm run build`: clean (one pre-existing, unrelated `Header.jsx` duplicate-`className` esbuild warning, confirmed present before this change too).
- Full-repo grep sweep for `stripe`/`is_subscribed`/`requireSubscription`/`subscriptionRequired` after the main edit pass, to catch anything missed (found and fixed: a stale doc comment in `tradeValue.js`, the nginx webhook block, docker-compose env vars, and several test fixtures).

## Next step

Not pushed/merged/deployed — local commit only, per the standing Justin-gate posture on this
branch. Someone still needs to run the updated `sql/omen_rls_security.sql` against production
Supabase to actually drop `public.subscriptions` and `public.users.is_subscribed` — this repo
change alone does not touch live data.
