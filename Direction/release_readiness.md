# Corvus Release Readiness

Last updated: 2026-06-04 (launch-QA sync)

## Status

Corvus is deployed on the renamed route and responding to health checks.

This does not mean paid launch is complete. The current posture is launch-QA: Tier 2 feature work is deployed and smoked, but the Stripe webhook recovery gate still needs an approved deploy/resend validation.

## Verified

- Local repo path: `<active-git-root>/slops-saloon/corvus/`
- GitHub repo: `justinduverge-design/corvus`
- Oracle checkout path: `~/corvus`
- Containers: `corvus_api`, `corvus_cron`
- Health endpoint: `https://slopssaloon.com/api/health`
- Health service: `corvus-api`
- Tests: latest recorded local backend suites passed 260/260 for Stripe webhook recovery and 262/262 after ESPN connect input normalization on 2026-06-04.
- Dependency audit: latest sprint draft records `npm audit --audit-level=moderate` with 0 vulnerabilities on 2026-06-04.
- Frontend build: latest sprint draft records `npm --prefix frontend run build` passing on 2026-06-04.
- Tier 2 authenticated production smoke: 13/13 passed on 2026-06-04.
- Omen live MVP service covers Yahoo, Sleeper, and ESPN start/sit recommendations when stored credentials and league context are usable.
- Stripe webhook code handles checkout completion, subscription created/updated/deleted, and payment-failed states with safe subscription metadata.
- Privacy routes are mounted under `/api/user`.
- `/api/ready` distinguishes dependency readiness from `/api/health`.
- GitHub Actions deploy completed successfully after checkout path rename
- GitHub Actions deploy now runs tests, audit, and frontend builds before image build/push
- PR #22 deployed successfully as run `26833528435`; production `/api/health` returned `status: ok` and `/api/ready` returned `status: ready`.
- Account pricing display, Omen feedback, team theme hydration, Move History, and League Standings are deployed and production-smoked.

## Prepared Locally, Not Deployed

- Stripe webhook recovery follow-up for old unmapped checkout/subscription events. Deploy and resend validation require Justin approval.
- ESPN connect input normalization for pasted cookie fragments and full ESPN league URLs. No cookies are logged or echoed.
- SPA cache header fix for `index.html`.
- `GET /api/version`, Tier 2 smoke cleanup mode, API route reference, and League Standings error envelope polish.

## Still Required Before Paid Launch Confidence

- **Stripe webhook recovery gate** - deploy the prepared follow-up only after Justin approval, resend the failed Stripe event, and confirm `200` delivery without Account subscription regression.
- **Stripe subscription date verification** - after the gate clears, confirm `trial_ends_at` and `current_period_end` persist into the dashboard subscription contract.
- Keep dependency audit in the normal pre-release checklist.
- Load testing for `POST /api/omen/mvp-move`, `POST /api/trade/compare`, and `GET /api/dashboard/summary` using `scripts/load-corvus-routes.js`.
- Final review of mock/live labeling. Draft Assistant now supports ADP-backed recommendations when provider ADP rows are supplied; fallback mock output remains labeled.
- Real-account QA for Yahoo, Sleeper, and ESPN Omen plus League Standings, especially ESPN recovery behavior.
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
