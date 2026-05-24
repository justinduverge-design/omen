# Corvus Current Status

Date: 2026-05-20

## Short Version

Corvus is locally demoable but not ready for public production launch. Deployment work is paused by Justin.

## Verification State

- Backend: `npm test` passes with 144 tests and 0 failures.
- Frontend: `npm run build` passes with 96 modules and 0 errors.
- Current deployment status: not deployed, not approved for deploy.
- Current release status: local worktree only. Treat local changes as not merged and not deployed.

## Product State

Corvus is the active product under the Slops Saloon umbrella. Current focus is app stability, local demo readiness, and polish before deployment.

The core app areas are:

- Landing page and magic-link sign-in
- Hall of Records app shell
- Draft Assistant
- Omen of the Week
- Trade Analyzer
- Start/Sit
- Waiver Wire
- Platform connection states

## Local Tool Status

| Area | Local Status | Notes |
|---|---|---|
| Landing | Working locally | Supabase magic-link form exists. Production redirect still needs final domain. |
| App shell | Working locally | Uses session and dashboard summary endpoints. |
| Draft Assistant | Mock/demo ready | Recommendations are mock-only. ADP supports mock and production-source fallback. |
| Omen of the Week | Mock ready, Yahoo live path local | Live path is Yahoo lineup-swap only. |
| Start/Sit | Working locally | Signals are deterministic. LLM explanation can be null. |
| Trade Analyzer | Working locally | Needs launch policy and UX review. |
| Waiver Wire | Working locally | Pro-gated and Yahoo-first, with mock fallback. |
| Platform status | Working locally | Yahoo token-expired state supported in dashboard summary. |

## Backend Contract Status

- `GET /api/health`: ready
- `GET /api/session`: ready
- `GET /api/dashboard/summary`: ready, includes Yahoo token-expired status
- `GET /api/platform-status`: ready
- `GET /api/platforms/status`: ready
- `GET /api/omen-of-the-week`: mock and Yahoo live path ready, includes `scoring_format`
- `POST /api/draft-assistant/recommendations`: mock-ready
- `GET /api/draft-assistant/adp`: mock-first, production-source path prepared
- `POST /api/start-sit`: ready
- `POST /api/trade/compare`: auth-gated and working locally
- `GET /api/optimizer/waiver`: Pro-gated, Yahoo-first, mock fallback

## Deployment State

Deployment is stopped. The Hostinger compose override exists for future use:

- `docker-compose.hostinger.yml`

Do not use it until Justin explicitly reopens deployment work.

## Immediate Priority

Polish and readiness only:

1. Keep mock/live labels clear.
2. Finish frontend polish on Omen, Draft Assistant, Waiver Wire, Start/Sit, and Landing.
3. Resolve launch policy questions for paid gates and public/private beta.
4. Keep backend contracts stable.
5. Do not touch production infrastructure.
