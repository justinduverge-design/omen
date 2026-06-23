# Omen Roadmap

Last updated: 2026-06-04

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
- Oracle deploy lane for `omen-api`.

## Current Infrastructure Route

- GitHub: `https://github.com/justinduverge-design/omen`
- Local: `<active-git-root>/slops-saloon/omen/`
- Hostinger KVM1 deploy path: `/opt/omen/deploy/hostinger`
- GHCR API image: `ghcr.io/justinduverge-design/omen:main`
- GHCR cron image: `ghcr.io/justinduverge-design/omen-cron:main`

## Prepared Locally, Not Deployed

- Stripe webhook recovery follow-up for old unmapped checkout/subscription events. Expected validation after deploy: resend the failed Stripe event and confirm `200` delivery without Account subscription regression.
- ESPN connect input normalization for copied cookie fragments and full ESPN league URLs. No frontend contract change; ESPN cookies still must never be logged or echoed.
- SPA `index.html` cache header fix so deploys do not leave browsers on a stale shell.
- `GET /api/version`, `OMEN_TIER2_CLEANUP=1` smoke cleanup mode, `Blueprints/api-routes.md`, and standardized League Standings error envelopes.

## Now

- Keep context, handoffs, route docs, and `Direction/agent_inbox.md` aligned with the 2026-06-04 launch-QA state.
- Keep current API contracts stable.
- `sql/omen_rls_security.sql` is applied and verified in Supabase as migration `20260531160851_apply_omen_rls_security_full_setup`.
- `POST /api/omen/mvp-move` is the only canonical Omen/MVP Move path.
- `GET /api/moves` is the canonical Move History path.
- `GET /api/league/standings` is the canonical League Standings path. The old retired `410` handler for this route has been removed.
- `PATCH /api/account/preferences` is deployed, database-ready, and production-smoked.
- Trade Analyzer Projection and Status are Omen-owned analysis signals, not user-entered Phase 1 fields.
- Tier 2 frontend is **built and deployed** (PR #22, run `26833528435`): Account pricing display, Omen feedback hardening, team theme hydration, Move History/Hall of Records, and League Standings are all live.
- Tier 2 authenticated production smoke passed 13/13 on 2026-06-04.
- Current posture is launch-QA and ops validation, not broad feature build.

## Next

1. **Clear the Stripe webhook recovery gate:** with Justin approval, deploy the prepared follow-up, resend the failed event, and confirm `200` delivery without Account subscription regression.
2. **Verify subscription dates after the Stripe gate:** confirm `trial_ends_at` and `current_period_end` persist into the dashboard subscription contract; implement a focused backend fix only if needed.
3. **QA real Yahoo/Sleeper/ESPN flows:** verify Omen and League Standings with real connected accounts, especially ESPN reconnect behavior, without logging cookie values.
4. **Capture load-test evidence:** run `scripts/load-omen-routes.js` against approved local/staging targets for Omen, Trade Analyzer, and dashboard summary.
5. **Reconcile Sleeper/ESPN Omen truth:** resolve the documentation conflict between older `pending_live_engine` notes and newer live-path claims.
6. **Feature candidates after launch gates:** `GET /api/players/search`, `GET /api/trade/pulse`, Tuesday scoring readiness packet, optimizer/Omen route decision, and mock Omen fallback decision.
7. Final launch readiness review.

## Later

- Delete retired compat route handlers after one release/log window if no callers hit the `410` responses.
- Polish The Ledger after the first Move History surface has real usage data.
- Add Draft Assistant season content.
- Decide whether recovery analytics ship before or after paid launch.

## Guardrails

- Keep Start/Sit and waiver logic inside Omen / MVP Move unless Justin separates them.
- Keep ESPN recovery user-safe and explicit.
- Prefer plain-English reasoning over visible heavy math.
- Do not deploy, apply Supabase SQL, alter Stripe live behavior, touch secrets, auth providers, package files, or production config without explicit Justin approval.
