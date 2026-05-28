# Corvus Root Context

## Purpose

This is the product-layer context entry point for Corvus.

Use this file before opening app source, backend routes, frontend files, tests, SQL, deployment files, or product handoffs.

## Canonical Layer

Corvus is the third SLOPS layer in plain English and the canonical Layer 2 in DBS numbering.

Path:

```text
C:\Users\JDuve\OneDrive\Desktop\SLOPS\slops-saloon\corvus
```

## Current Truth

- Corvus is the active Fantasy Football MVP product.
- This is the active app/product git repo.
- The old nested `Corvus/` folder is retired.
- Product DBS folders live at this repo root.
- Frontend/backend handoffs live in `Blueprints/handoffs/`.
- App source and config live here, not in the parent `slops-saloon/` layer.

## Latest Resume Point — 2026-05-27

- Local backend tests pass 216/216.
- Live Omen is canonical at `POST /api/omen/mvp-move` and uses body `{}` after dashboard status is `ready`.
- Dashboard Omen readiness now covers usable Yahoo, Sleeper, or ESPN league context for subscribed users.
- `GET /api/system/current-week` exists for public season/week context.
- `GET /api/stripe/prices` exists as a read-only pricing display contract.
- Legacy compat routes from the frontend audit now return `410 legacy_route_retired`.
- Supabase SQL is prepared for `waitlist_signups`, `subscriptions.trial_ends_at`, and `subscriptions.current_period_end`, but it has not been applied to staging or production.
- Remaining launch blockers are approval/ops: apply prepared Supabase SQL, confirm prod Supabase env, validate Stripe dashboard/return URLs, and run Stripe test-mode validation.

## Read First

1. `DBS_INDEX.md`
2. `AGENTS.md`
3. `CLAUDE.md`
4. `Direction/context.md`
5. `Direction/current_sprint.md`
6. `Direction/roadmap.md`
7. `Direction/decision_log.md`
8. `Blueprints/handoffs/frontend-to-backend.md`
9. `Blueprints/handoffs/backend-to-frontend.md`

## Safety Boundary

Do not edit `.env`, secrets, keys, cookies, DNS, SSL, Nginx, Supabase migrations, Stripe production behavior, package files, Docker/deploy config, production infrastructure, `.git`, or `node_modules` without explicit Justin approval.
