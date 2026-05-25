# Corvus Release Readiness

Last updated: 2026-05-24

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
- Tests: 184/184 passing after backend hardening
- Dependency audit: `npm audit --audit-level=moderate` found 0 vulnerabilities on 2026-05-24
- Frontend builds: primary `frontend` and legacy `client` Vite builds passed on 2026-05-24
- GitHub Actions deploy completed successfully after checkout path rename
- GitHub Actions deploy now runs tests, audit, and frontend builds before image build/push

## Still Required Before Paid Launch Confidence

- Stripe live validation.
- Keep dependency audit in the normal pre-release checklist.
- Load testing for `POST /api/omen/mvp-move`.
- Load testing for `POST /api/trade/compare`.
- Final review of mock/live labeling.
- Final review of ESPN recovery behavior.
- Final validation before enabling `CORVUS_CRON_SCORING_ENABLED=true` for Tuesday scoring.
- Final review of production secrets and Supabase settings.

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
