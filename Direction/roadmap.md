# Corvus Roadmap

Last updated: 2026-06-02

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
- `GET /api/system/current-week`.
- `GET /api/stripe/prices`.
- `POST /api/omen/feedback`. Auth required; records HITL feedback into `moves`. Live Supabase `moves` repair applied and idempotence-smoked. Frontend: `OmenFeedback.jsx` wired.
- `GET /api/moves`. Auth required; returns `moves-history.v1` with user move history, W/L/pending summary, and effectiveness aggregation. Frontend: `MoveHistory.jsx` wired.
- `GET /api/league/standings`. Auth required; returns `league-standings.v1` for Yahoo, Sleeper, and ESPN connected leagues. Frontend: `LeagueStandings.jsx` wired.
- `PATCH /api/account/preferences`. Auth required; records `favorite_team` into `profiles`; the backing Supabase column is applied and verified. Frontend: `TeamTheme.jsx` wired.
- `GET /api/dashboard/summary.user.favorite_team`, returning the saved favorite team or `null` when the user has not chosen one. Frontend: `App.jsx` hydrates on sign-in.
- Explicit `410 legacy_route_retired` responses for retired compat routes.
- Oracle deploy lane for `corvus-api`.

## Current Infrastructure Route

- GitHub: `https://github.com/justinduverge-design/corvus`
- Local: `C:\Users\JDuve\OneDrive\Desktop\SLOPS\slops-saloon\corvus`
- Oracle: `~/corvus`
- GHCR API image: `ghcr.io/justinduverge-design/corvus:main`
- GHCR cron image: `ghcr.io/justinduverge-design/corvus-cron:main`

## Now

- Keep context, handoffs, and route docs aligned with the 2026-06-02 production state.
- Keep current API contracts stable.
- `sql/corvus_rls_security.sql` is applied and verified in Supabase as migration `20260531160851_apply_corvus_rls_security_full_setup`.
- `POST /api/omen/mvp-move` is the only canonical Omen/MVP Move path.
- `GET /api/moves` is the canonical Move History path.
- `GET /api/league/standings` is the canonical League Standings path. The old retired `410` handler for this route has been removed.
- `PATCH /api/account/preferences` is deployed and database-ready; next step is authenticated app smoke testing.
- Trade Analyzer Projection and Status are Corvus-owned analysis signals, not user-entered Phase 1 fields.
- Tier 2 frontend is **built and deployed** (PR #22, run `26833528435`): Account pricing display, Omen feedback hardening, team theme hydration, Move History/Hall of Records, and League Standings are all live.

## Next

1. **Ops (Justin):** Confirm prod Supabase Vite env (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`), set `APP_BASE_URL` to production domain, update Stripe price IDs to $5/mo and $20 season, run Stripe test-mode checkout and webhook validation.
2. Smoke-test `PATCH /api/account/preferences`, team theme hydration, `POST /api/omen/feedback`, `GET /api/moves`, and `GET /api/league/standings` against production with authenticated users.
3. QA real Yahoo/Sleeper/ESPN League Standings and Omen flows, including ESPN reconnect recovery, without logging cookie values.
4. Run `scripts/load-corvus-routes.js` against local/staging targets and save evidence.
5. Load test Omen and Trade Analyzer.
6. Final launch readiness review.

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
