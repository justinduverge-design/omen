# Corvus Current Sprint

Last updated: 2026-05-28 (session 2 — UX audit fixes + nflPlayers.js)

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
- Apple sign-in button removed from `frontend/src/pages/Login.jsx` — Apple Developer account costs money; button will not return unless account is purchased.
- Google OAuth `redirect_uri_mismatch` fixed — Supabase Site URL changed from `localhost` to `https://slopssaloon.com`; callback URL added to Google Cloud Console.
- Discord OAuth `invalid redirect_uri` fixed — callback URL added to Discord Developer Portal; Discord credentials entered in Supabase Auth dashboard.
- `frontend/src/lib/nextUrl.js` updated: post-login default destination changed from `'/'` to `'/account'`; `/account` added to ALLOWED_DESTINATIONS.
- UX/UI audit completed across Landing, Login, Account, and Omen pages using `/ui-ux-pro-max-skill`. All 7 gaps documented and fixed (commit `7b71a87` + `7b1cbab`):
  - Focus-visible keyboard rings added to: Landing nav links, DraftAssistant inputs, TradeAnalyzer inputs/selects, ConnectLeague buttons, PlatformConnections buttons, OmenPage back-link.
  - `active:scale-[0.97]` press feedback added to Landing CTAs and waitlist button.
  - `text-[10px]` story arc steps changed to `text-xs` (12px minimum — accessibility).
  - `min-h-screen` on Login changed to `min-h-[100dvh]` (mobile browser address bar fix).
  - Account plan card hardcoded `purple-*` classes replaced with `var(--color-accent)` / `var(--color-accent-hover)` brand tokens.
  - OmenPage "Corvus Pro" label `text-purple-300` replaced with `text-[var(--color-accent)]`.
  - OmenPage back-link inline-style color converted to Tailwind CSS-var classes with hover + focus-visible ring.
- `frontend/src/data/nflPlayers.js` created (commit `7b1cbab`): ~350-player static roster covering QB/RB/WR/TE/K/DEF for all 32 franchises. Exports `NFL_PLAYERS` array and `searchPlayers(position, query)` helper. Used by Trade Analyzer Phase 1 autocomplete. Phase 2 replaces with `GET /api/players/search`.

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
4. ~~Confirm Supabase Auth providers for Google, Apple, and Discord~~ — **Done 2026-05-28.** Google ✅, Discord ✅, Apple intentionally removed.
5. QA ESPN cookie recovery without logging or displaying cookie values.
6. ~~Apply UX audit fixes (7 gaps) across Landing, Login, Account, Omen~~ — **Done 2026-05-28.** All 7 fixes committed.
7. Run `/ui-ux-pro-max-skill` on Account / Connect page — next UX gate before building new features on those surfaces.
8. Build HITL Feedback Loop on OmenPage (Request 21) — gated on Justin approving `moves` table Supabase migration. Omen page audit cleared. Contract in `frontend-to-backend.md`.
9. Build Trade Analyzer form rework: position-first layout, name autocomplete via `nflPlayers.js`, Trade Room right column (Request 20). No backend dep — purely frontend.

## Guardrails

- Do not recreate `Corvus/`.
- Do not change app behavior during context cleanup.
- Do not touch `.env`, secrets, DNS, SSL, Nginx, Supabase migrations, Stripe production behavior, or package files without explicit approval.
- Do not deploy unless Justin explicitly approves the deploy action.
