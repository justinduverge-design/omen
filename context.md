# Omen Root Context

## Purpose

This is the product-layer context entry point for Omen.

Use this file before opening app source, backend routes, frontend files, tests, SQL, deployment files, or product handoffs.

## Canonical Layer

Omen is the third SLOPS layer in plain English and the canonical Layer 2 in DBS numbering.

Path:

```text
C:\Users\JDuve\OneDrive\Desktop\SLOPS\slops-saloon\corvus
```

## Current Truth

- Omen is the active Fantasy Football MVP product.
- This is the active app/product git repo.
- The old nested `Corvus/` folder is retired.
- Product DBS folders live at this repo root.
- Frontend/backend handoffs live in `Blueprints/handoffs/`.
- App source and config live here, not in the parent `slops-saloon/` layer.

## Latest Resume Point — 2026-06-02

- PR #22 (`fix(ui): brand-spec fonts — Cormorant Garamond + Alegreya Sans`) was squash-merged into `main` and deployed as GitHub Actions run `26833528435` for `.github/workflows/deploy.yml`; it completed successfully.
- Post-deploy smoke: `https://slopssaloon.com/api/health` returned `status: ok` / `service: omen-api`, and `https://slopssaloon.com/api/ready` returned `status: ready`.
- Tier 2 frontend is **built and deployed**: Account pricing display (`GET /api/stripe/prices`), Omen feedback hardening (`POST /api/omen/feedback`), team theme hydration (`GET /api/dashboard/summary.user.favorite_team`), Move History / Hall of Records (`GET /api/moves`), and League Standings (`GET /api/league/standings`) are all live.
- Trade Analyzer Projection and Status fields are intentionally not user-facing in Phase 1. Omen should infer/enrich those signals during analysis rather than asking the user to supply them.
- All production env gates cleared: ~~Stripe price IDs~~ ✓, ~~$5/mo and $20 season prices~~ ✓, ~~`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`~~ ✓, ~~`APP_BASE_URL`~~ ✓. Remaining launch work: Stripe test-mode checkout and webhook validation, authenticated smoke tests, and QA of real Yahoo/Sleeper/ESPN Omen and League Standings flows.

- Local backend tests pass 240/240.
- Live Omen is canonical at `POST /api/omen/mvp-move` and uses body `{}` after dashboard status is `ready`.
- Dashboard Omen readiness now covers usable Yahoo, Sleeper, or ESPN league context for subscribed users.
- `GET /api/system/current-week` exists for public season/week context.
- `GET /api/stripe/prices` exists as a read-only pricing display contract; `Account.jsx` calls it live with a safe fallback.
- `POST /api/omen/feedback` is deployed. It is auth-required and upserts `followed`, `user_stars`, and `user_note` to `moves` by `user_id + week_num + season`. The live Supabase `moves` repair is applied and idempotence-smoked.
- `GET /api/moves` is deployed for Move History. It is auth-required and returns `moves-history.v1`.
- `GET /api/league/standings` is deployed for League Standings. It is auth-required and returns `league-standings.v1` for Yahoo, Sleeper, and ESPN.
- `PATCH /api/account/preferences` is deployed for team preference. It is auth-required and upserts `favorite_team` to `profiles`; dashboard summary includes `user.favorite_team`.
- Legacy compat routes from the frontend audit now return `410 legacy_route_retired`, except `/api/league/standings`, which has been restored as a canonical route.
- Supabase SQL from `sql/omen_rls_security.sql` has been applied and verified as migration `20260531160851_apply_omen_rls_security_full_setup`. Verified live coverage includes `waitlist_signups`, `subscriptions.trial_ends_at`, `subscriptions.current_period_end`, `moves` feedback idempotence, `profiles.favorite_team`, platform connection safe-column grants, and service-role Vault wrapper RPCs.
- Remaining launch blockers are QA/ops: confirm prod Supabase env at deploy time, validate Stripe dashboard/return URLs, run Stripe test-mode validation, smoke-test HITL/team preference in the app, and QA real provider League Standings.

## Read First

1. `DBS_INDEX.md`
2. `AGENTS.md`
3. `CLAUDE.md`
4. `Direction/context.md`
5. `Direction/current_sprint.md`
6. `Direction/roadmap.md`
7. `Direction/decision_log.md`
8. `Direction/agent_inbox.md`
9. `Blueprints/prompts/HOW-TO-RUN-THE-LOOP.md`
10. `Blueprints/definition-of-done.md`
11. `Blueprints/handoffs/frontend-to-backend.md`
12. `Blueprints/handoffs/backend-to-frontend.md`

## Safety Boundary

Do not edit `.env`, secrets, keys, cookies, DNS, SSL, Nginx, Supabase migrations, Stripe production behavior, package files, Docker/deploy config, production infrastructure, `.git`, or `node_modules` without explicit Justin approval.
