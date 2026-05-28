# Corvus Release Readiness

Last updated: 2026-05-26 (backend finish pass)

## Status

Corvus is deployed on the renamed route and responding to health checks.

This does not mean paid launch is complete.

## Verified

- Local repo path: `C:\Users\JDuve\OneDrive\Desktop\SLOPS\slops-saloon\corvus`
- GitHub repo: `justinduverge-design/corvus`
- Oracle checkout path: `~/corvus`
- Containers: `corvus_api`, `corvus_cron`
- Health endpoint: `https://slopssaloon.com/api/health`
- Health service: `corvus-api`
- Tests: 207/207 passing locally on 2026-05-26
- Dependency audit: `npm audit --audit-level=moderate` found 0 vulnerabilities on 2026-05-26
- Frontend build: `npm --prefix frontend run build` passed on 2026-05-26; Vite still prints its existing `NODE_ENV=production` warning after emitting `frontend/dist`.
- `git diff --check` passed on 2026-05-26 before implementation.
- Omen live MVP service covers Yahoo, Sleeper, and ESPN start/sit recommendations when stored credentials and league context are usable.
- Stripe webhook code handles checkout completion, subscription created/updated/deleted, and payment-failed states with safe subscription metadata.
- Privacy routes are mounted under `/api/user`.
- `/api/ready` distinguishes dependency readiness from `/api/health`.
- GitHub Actions deploy completed successfully after checkout path rename
- GitHub Actions deploy now runs tests, audit, and frontend builds before image build/push

## Still Required Before Paid Launch Confidence

- **Stripe validation** — checkout, portal, and webhook validation in test mode first. Production Stripe actions require Justin approval.
- Keep dependency audit in the normal pre-release checklist.
- Load testing for `POST /api/omen/mvp-move`, `POST /api/trade/compare`, and `GET /api/dashboard/summary` using `scripts/load-corvus-routes.js`.
- Final review of mock/live labeling. Draft Assistant now supports ADP-backed recommendations when provider ADP rows are supplied; fallback mock output remains labeled.
- Final review of ESPN recovery behavior.
- Final validation before enabling `CORVUS_CRON_SCORING_ENABLED=true` for Tuesday scoring.
- Final review of production secrets and Supabase settings.

## Known Backend Gaps (post-launch)

- **Omen for Sleeper/ESPN QA** — code path is wired, but staging QA with real connected accounts is still required before public claims.
- **Sleeper auto week detection** — `GET /api/sleeper/roster` requires an explicit `week` query param. No NFL current-week detection for Sleeper platform.
- **Optimizer waiver projections** — Yahoo's `/players;status=A` doesn't return projections; VORP delta for waiver candidates uses 0 as the baseline. Noted in route comment.
- **Draft Assistant scope** — v1 is ADP/value/position-needs based, not a real-time draft room.

## Current Product Surface

- Trade Analyzer is live.
- Draft Assistant is live.
- Omen / MVP Move canonical route is `POST /api/omen/mvp-move`.
- Start/Sit and waiver logic live inside Omen.
- Yahoo, Sleeper, and ESPN are in scope.
- Matchup DvP is backed by nflverse-data.
- LLM reasoning uses Gemma/Ollama when configured.

## Deployment Boundary

The deploy lane exists and is working, but future deploys still require Justin's approval when the task is not explicitly a deploy task.

Do not change DNS, SSL, Nginx, Oracle service config, secrets, Infisical, Supabase production data, Stripe production behavior, or package files without explicit approval.
