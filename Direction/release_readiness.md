# Omen Release Readiness

Last updated: 2026-07-19 (B1 contract sync)

**2026-07-19: Omen is free indefinitely. Stripe/subscription gates are not launch gates for this
product. B1 also locks `POST /api/omen/mvp-move` as the only canonical Omen recommendation route;
`POST /api/optimizer/mvp-move` remains retired.**

## Status

Omen is deployed on the renamed route and responding to health checks.

The current posture is launch-QA: Tier 2 feature work is deployed and smoked, with remaining confidence work centered on real-account provider QA, load testing, and Tuesday scoring readiness.

## Verified

- Local repo path: `<active-git-root>/slops-saloon/omen/`
- GitHub repo: `justinduverge-design/omen`
- KVM1 deploy path: `/opt/omen/deploy/hostinger`
- Containers: `omen_api`, `omen_cron`
- Health endpoint: `https://slopssaloon.com/api/health`
- Health service: `omen-api`
- Tests: latest recorded local backend suite passed 391/391 during B1 contract sync on 2026-07-19.
- Dependency audit: `npm audit --omit=dev --audit-level=moderate` found 0 production vulnerabilities on 2026-07-19. Root dev audit still reports a pre-existing `promptfoo` -> `@huggingface/transformers` -> `onnxruntime-node` -> `adm-zip` high advisory that requires a breaking dev-tool update.
- Frontend build: latest sprint draft records `npm --prefix frontend run build` passing on 2026-06-04.
- Tier 2 authenticated production smoke: 13/13 passed on 2026-06-04.
- Omen live MVP service covers Yahoo, Sleeper, and ESPN start/sit recommendations when stored credentials and league context are usable.
- Stripe code is removed from Omen; no billing/subscription gate applies to live recommendations.
- Privacy routes are mounted under `/api/user`.
- `/api/ready` distinguishes dependency readiness from `/api/health`.
- GitHub Actions deploy completed successfully after checkout path rename
- GitHub Actions deploy now runs tests, audit, and frontend builds before image build/push
- PR #22 deployed successfully as run `26833528435`; production `/api/health` returned `status: ok` and `/api/ready` returned `status: ready`.
- Account pricing display, Omen feedback, team theme hydration, Move History, and League Standings are deployed and production-smoked.

## Prepared Locally, Not Deployed

- ESPN connect input normalization for pasted cookie fragments and full ESPN league URLs. No cookies are logged or echoed.
- SPA cache header fix for `index.html`.
- `GET /api/version`, Tier 2 smoke cleanup mode, API route reference, and League Standings error envelope polish.

## Still Required Before Launch Confidence

- Keep dependency audit in the normal pre-release checklist.
- Load testing for `POST /api/omen/mvp-move`, `POST /api/trade/compare`, and `GET /api/dashboard/summary` using `scripts/load-omen-routes.js`.
- Final review of mock/live labeling. Draft Assistant now supports ADP-backed recommendations when provider ADP rows are supplied; fallback mock output remains labeled.
- Real-account QA for Yahoo, Sleeper, and ESPN Omen plus League Standings, especially ESPN recovery behavior.
- Final validation before enabling `OMEN_CRON_SCORING_ENABLED=true` for Tuesday scoring.
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
