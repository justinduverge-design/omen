# Corvus Current Sprint

Last updated: 2026-05-27

## Current State

Corvus is live on the renamed route.

- Local repo path: `C:\Users\JDuve\OneDrive\Desktop\SLOPS\slops-saloon\corvus`
- GitHub repo: `justinduverge-design/corvus`
- Oracle checkout path: `~/corvus`
- Production service name: `corvus-api`
- Docker containers: `corvus_api`, `corvus_cron`
- Test baseline: 216/216 passing locally on 2026-05-27

## Completed

- Repo renamed from `slops-saloon` to `corvus` on GitHub.
- Local repo lives under the Slops Saloon division folder.
- Retired nested `Corvus/` folder was folded into the repo root.
- Product DBS folders now live at repo root.
- `package.json` name is `corvus`.
- Docker image/container/network names use `corvus`.
- GitHub Actions deploy builds `corvus:main` and `corvus-cron:main`.
- Oracle deploy checkout was moved to `~/corvus`.
- Live `/api/health` returned HTTP 200 with `service: corvus-api`.
- Canonical Omen endpoint is `POST /api/omen/mvp-move`.
- Live Omen MVP now uses the same start/sit envelope for Yahoo, Sleeper, and ESPN when credentials and league context are usable.
- `/api/ready` is available as dependency/config readiness separate from `/api/health`.
- `/api/user/export`, `/api/user/consent`, and `/api/user/delete` are mounted privacy routes.
- Stripe webhook handling now persists trial/current-period metadata from subscription lifecycle events.
- `GET /api/system/current-week` is available as public season/week context.
- `GET /api/stripe/prices` is available as a read-only Account pricing display contract.
- Dashboard Omen readiness now covers usable Yahoo, Sleeper, or ESPN league context for subscribed users.
- Legacy compat routes from frontend Request 17 now return explicit `410 legacy_route_retired` responses.
- `sql/corvus_rls_security.sql` now contains prepared waitlist and subscription-date repair SQL; it has not been applied to Supabase.

## Now

- Keep backend/frontend contracts aligned with tested app behavior.
- Treat `POST /api/omen/mvp-move` as paid live Omen for subscribed users with usable Yahoo, Sleeper, or ESPN league context.
- Treat missing platform credentials or ESPN cookie/league failures as explicit recovery states, not fake advice.
- Keep the product path and route unambiguous for all agents.
- Keep prepared Supabase SQL distinct from applied database state until Justin approves staging/prod migration.

## Next

1. Get Justin approval to apply prepared Supabase SQL to staging, verify waitlist insert and subscription date columns, then apply to production.
2. Run Stripe test-mode checkout, portal, pricing, and webhook validation before paid-launch confidence.
3. Run `scripts/load-corvus-routes.js` against local/staging targets and save results.
4. Confirm Supabase Auth providers for Google, Apple, and Discord in the Supabase dashboard.
5. QA ESPN cookie recovery without logging or displaying cookie values.
6. Claude can optionally wire Account pricing display to `GET /api/stripe/prices`.

## Guardrails

- Do not recreate `Corvus/`.
- Do not change app behavior during context cleanup.
- Do not touch `.env`, secrets, DNS, SSL, Nginx, Supabase migrations, Stripe production behavior, or package files without explicit approval.
- Do not deploy unless Justin explicitly approves the deploy action.
