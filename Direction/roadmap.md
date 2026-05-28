# Corvus Roadmap

Last updated: 2026-05-27

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
- Explicit `410 legacy_route_retired` responses for retired compat routes.
- Oracle deploy lane for `corvus-api`.

## Current Infrastructure Route

- GitHub: `https://github.com/justinduverge-design/corvus`
- Local: `C:\Users\JDuve\OneDrive\Desktop\SLOPS\slops-saloon\corvus`
- Oracle: `~/corvus`
- GHCR API image: `ghcr.io/justinduverge-design/corvus:main`
- GHCR cron image: `ghcr.io/justinduverge-design/corvus-cron:main`

## Now

- Keep context, handoffs, and route docs aligned with the 2026-05-27 backend contract truth.
- Keep current API contracts stable after Requests 13-18.
- Treat prepared Supabase SQL as local/reviewable only until Justin approves staging/prod application.
- Use `POST /api/omen/mvp-move` as the only canonical Omen/MVP Move path.

## Next

1. Get Justin approval to apply prepared Supabase SQL to staging, verify waitlist insert and subscription date columns, then apply to production.
2. Run Stripe test-mode checkout, portal, pricing, and webhook validation.
3. Run `scripts/load-corvus-routes.js` against local/staging targets and save evidence.
4. Confirm Supabase Auth providers for Google, Apple, and Discord in the Supabase dashboard.
5. QA real Yahoo/Sleeper/ESPN Omen flows, including ESPN recovery, without logging cookie values.
6. Load test Omen and Trade Analyzer.
7. Final launch readiness review.

## Later

- Delete retired compat route handlers after one release/log window if no callers hit the `410` responses.
- Polish Hall of Records dashboard.
- Add Draft Assistant season content.
- Decide whether recovery analytics ship before or after paid launch.

## Guardrails

- Keep Start/Sit and waiver logic inside Omen / MVP Move unless Justin separates them.
- Keep ESPN recovery user-safe and explicit.
- Prefer plain-English reasoning over visible heavy math.
- Do not deploy, apply Supabase SQL, alter Stripe live behavior, touch secrets, auth providers, package files, or production config without explicit Justin approval.
