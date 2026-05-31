# Corvus Roadmap

Last updated: 2026-05-31

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
- `POST /api/omen/feedback` in local backend code. Auth required; records HITL feedback into `moves` once the approved Supabase SQL is applied.
- `PATCH /api/account/preferences` in local backend code. Auth required; records `favorite_team` into `profiles` once Justin approves and applies the profile column SQL.
- `GET /api/dashboard/summary.user.favorite_team` in local backend code, returning `null` safely until profile data exists.
- Explicit `410 legacy_route_retired` responses for retired compat routes.
- Oracle deploy lane for `corvus-api`.

## Current Infrastructure Route

- GitHub: `https://github.com/justinduverge-design/corvus`
- Local: `C:\Users\JDuve\OneDrive\Desktop\SLOPS\slops-saloon\corvus`
- Oracle: `~/corvus`
- GHCR API image: `ghcr.io/justinduverge-design/corvus:main`
- GHCR cron image: `ghcr.io/justinduverge-design/corvus-cron:main`

## Now

- Keep context, handoffs, and route docs aligned with the 2026-05-31 backend contract truth.
- Keep current API contracts stable after Requests 13-18.
- Treat prepared Supabase SQL as local/reviewable only until Justin approves staging/prod application.
- Use `POST /api/omen/mvp-move` as the only canonical Omen/MVP Move path.
- Treat `POST /api/omen/feedback` and `PATCH /api/account/preferences` as code-ready but database-application-gated until the matching Supabase SQL is applied.

## Next

1. Apply approved `moves` SQL through the approved Supabase lane, then verify HITL feedback against Supabase.
2. Get Justin approval for `profiles.favorite_team`, apply through the approved Supabase lane, then verify team preference and dashboard summary.
3. Run Stripe test-mode checkout, portal, pricing, and webhook validation.
4. Run `scripts/load-corvus-routes.js` against local/staging targets and save evidence.
5. QA real Yahoo/Sleeper/ESPN Omen flows, including ESPN recovery, without logging cookie values.
6. Load test Omen and Trade Analyzer.
7. Final launch readiness review.

## Later

- Delete retired compat route handlers after one release/log window if no callers hit the `410` responses.
- Polish Hall of Records dashboard.
- Build Move History (`GET /api/moves`) once HITL feedback has real `moves` rows.
- Add Draft Assistant season content.
- Decide whether recovery analytics ship before or after paid launch.

## Guardrails

- Keep Start/Sit and waiver logic inside Omen / MVP Move unless Justin separates them.
- Keep ESPN recovery user-safe and explicit.
- Prefer plain-English reasoning over visible heavy math.
- Do not deploy, apply Supabase SQL, alter Stripe live behavior, touch secrets, auth providers, package files, or production config without explicit Justin approval.
