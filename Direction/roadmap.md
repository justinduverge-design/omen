# Corvus Roadmap

Last updated: 2026-06-03

## What Is Live

- Trade Analyzer.
- Draft Assistant.
- Omen of the Week / MVP Move through `POST /api/omen/mvp-move`.
- Start/Sit inside Omen.
- Waiver logic inside Omen.
- Yahoo, Sleeper, and ESPN platform adapters.
- ESPN recovery Account page.
- Matchup DvP through nflverse-data.
- LLM reasoning through Gemma/Ollama when configured.
- Supabase auth and Vault encryption.
- Stripe backend surfaces.
- Stripe sandbox checkout/webhook validation on production.
- `GET /api/system/current-week`.
- `GET /api/stripe/prices`.
- `POST /api/omen/feedback` in local backend code. Auth required; records HITL feedback into `moves`. The approved live Supabase `moves` repair is applied and idempotence-smoked.
- `GET /api/moves` in local backend code. Auth required; returns `moves-history.v1` with user move history, W/L/pending summary, and effectiveness aggregation.
- `GET /api/league/standings` in local backend code. Auth required; returns `league-standings.v1` for Yahoo, Sleeper, and ESPN connected leagues.
- `PATCH /api/account/preferences` in local backend code. Auth required; records `favorite_team` into `profiles`; the backing Supabase column is applied and verified.
- `GET /api/dashboard/summary.user.favorite_team` in local backend code, returning the saved favorite team or `null` when the user has not chosen one.
- Explicit `410 legacy_route_retired` responses for retired compat routes.
- Oracle deploy lane for `corvus-api`.
- Authenticated provider-connect bootstrap for Yahoo/Sleeper/ESPN/account/Omen/Stripe write paths.

## Current Infrastructure Route

- GitHub: `https://github.com/justinduverge-design/corvus`
- Local: `C:\Users\JDuve\OneDrive\Desktop\SLOPS\slops-saloon\corvus`
- Oracle: `~/corvus`
- GHCR API image: `ghcr.io/justinduverge-design/corvus:main`
- GHCR cron image: `ghcr.io/justinduverge-design/corvus-cron:main`

## Now

- Keep context, handoffs, and route docs aligned with the 2026-05-31 backend contract truth.
- Keep current API contracts stable after Requests 13-18.
- Treat `sql/corvus_rls_security.sql` as applied and verified in Supabase as migration `20260531160851_apply_corvus_rls_security_full_setup`.
- Use `POST /api/omen/mvp-move` as the only canonical Omen/MVP Move path.
- Treat `GET /api/moves` as the canonical Move History path.
- Treat `GET /api/league/standings` as the canonical League Standings path. The old retired `410` handler for this route has been removed.
- Treat `PATCH /api/account/preferences` as code-ready and database-ready; next step is authenticated app smoke testing.
- Treat Trade Analyzer Projection and Status as Corvus-owned analysis signals, not user-entered Phase 1 fields.
- Treat Tier 2 frontend as prepared for Claude: account pricing, Omen feedback hardening, team theme hydration, Move History/Hall of Records, and League Standings.
- Production deploys after PR #23 and PR #24 completed through GitHub Actions runs `26895012706` and `26897470052`; `/api/health`, `/api/ready`, and `GET /api/stripe/prices` smoke checks passed.
- Treat Stripe sandbox checkout and webhook validation as complete: monthly test checkout returned to Account and marked `Corvus Pro · Active`.

## Next

1. QA real Yahoo/Sleeper/ESPN League Standings and Omen flows, including ESPN recovery, without logging cookie values.
2. Smoke-test dashboard summary, Omen feedback, moves, league standings, and account preferences against production with authenticated users.
3. Claude continues Tier 2 frontend from prepared folders: Omen feedback hardening, team theme provider hydration, Move History/Hall of Records, and League Standings.
4. Run `scripts/load-corvus-routes.js` against local/staging targets and save evidence.
5. Load test Omen and Trade Analyzer.
6. Before paid launch, switch Infisical from Stripe sandbox values back to live values and run final live-mode checkout/webhook readiness.
7. Final launch readiness review.

## Later

- Delete retired compat route handlers after one release/log window if no callers hit the `410` responses.
- Polish Hall of Records dashboard after the first Move History panel is wired.
- Add Draft Assistant season content.
- Decide whether recovery analytics ship before or after paid launch.

## Guardrails

- Keep Start/Sit and waiver logic inside Omen / MVP Move unless Justin separates them.
- Keep ESPN recovery user-safe and explicit.
- Prefer plain-English reasoning over visible heavy math.
- Do not deploy, apply Supabase SQL, alter Stripe live behavior, touch secrets, auth providers, package files, or production config without explicit Justin approval.
