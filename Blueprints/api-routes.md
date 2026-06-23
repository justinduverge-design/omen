# Omen API Route Reference

Last updated: 2026-06-19

This file is the quick backend reference for current canonical routes and known retired compatibility routes. It is not a full OpenAPI spec; the detailed contracts remain in `Blueprints/handoffs/backend-to-frontend.md`.

## Public System Routes

| Method | Path | Contract | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/health` | `system-health.v1` | Public liveness check. |
| `GET` | `/api/ready` | `system-ready.v1` | Public dependency readiness check. |
| `GET` | `/api/version` | `system-version.v1` | Public deploy/build metadata. Safe fields only. |
| `GET` | `/api/session` | `session.v1` | Public auth shell; returns authenticated user only when a valid bearer token is supplied. |
| `GET` | `/api/system/current-week` | `system-current-week.v1` | Public NFL season/week context. |
| `GET` | `/api/platform-status` | `platform-status.v1` | Public platform/config status; no private LLM URL. |
| `GET` | `/api/demo` | `omen-demo.v1` | Public deterministic sample roster + Omen envelope. Always `mode: "demo"`; never live/mock fallback. |

## Canonical Product Routes

| Method | Path | Contract | Auth | Notes |
| --- | --- | --- | --- | --- |
| `POST` | `/api/trade/compare` | trade comparison response | No | Free Trade Analyzer entry point. |
| `GET` | `/api/players/search` | `players-search.v1` | No | Free Trade Analyzer autocomplete. Uses public Sleeper player data; max 10 rows. |
| `POST` | `/api/draft-assistant/recommendations` | `draft-assistant-recommendations.v1` | No | Mock/preview recommendations until live Draft Assistant data ships. |
| `GET` | `/api/draft-assistant/adp` | ADP response | No | Public ADP; optional Yahoo enrichment when auth is supplied. |
| `GET` | `/api/sleeper/draft?leagueId=` | `sleeper-draft-list.v1` | Yes | Connected Sleeper league only. |
| `GET` | `/api/sleeper/draft/:draftId` | `sleeper-draft-meta.v1` | Yes | Connected-league metadata; exposes only the caller's draft slot. |
| `GET` | `/api/sleeper/draft/:draftId/state?since=` | `sleeper-draft-state.v1` | Yes | Two-second active / 30-second low Lazy Sync; no raw manager user IDs. |
| `GET` | `/api/dashboard/summary` | `dashboard-summary.v1` | Yes | App shell truth for gates, subscription, platforms, and `user.favorite_team`. |
| `GET` | `/api/platforms` | platform connection status | Yes | Account/connect platform state. |
| `POST` | `/api/platforms/sleeper/resolve` | Sleeper resolve response | Yes | Username-first league discovery. |
| `POST` | `/api/platforms/sleeper/connect` | Sleeper connect response | Yes | Accepts selected `league_id`. |
| `GET` | `/api/yahoo/auth` | redirect | Yes | Yahoo OAuth start. |
| `GET` | `/api/yahoo/callback` | redirect | No | Yahoo OAuth callback; redirects to Account connect. |
| `POST` | `/api/platforms/espn/connect` | ESPN connect response | Yes | Cookie-backed ESPN connect; never log cookie values. |
| `DELETE` | `/api/platforms/:platform` | disconnect response | Yes | Disconnects `yahoo`, `sleeper`, or `espn`. |
| `POST` | `/api/omen/mvp-move` | `2026-05-18.omen-live.v1` | Yes for live | Canonical Omen / MVP Move path. Mock mode is explicit. |
| `POST` | `/api/omen/feedback` | feedback response | Yes | Idempotent by user + season + week. |
| `GET` | `/api/moves` | `moves-history.v1` | Yes | Move History / Hall of Records. |
| `GET` | `/api/league/standings` | `league-standings.v1` | Yes | Canonical standings for Yahoo, Sleeper, ESPN. Error envelope is `league-standings-error.v1`. |
| `PATCH` | `/api/account/preferences` | preference response | Yes | Persists `favorite_team`. |
| `GET` | `/api/stripe/prices` | `stripe-prices.v1` | No | Public Stripe price display. |
| `POST` | `/api/stripe/checkout` | checkout URL | Yes | Starts Stripe Checkout. |
| `POST` | `/api/stripe/portal` | portal URL | Yes | Starts Stripe Billing Portal. |
| `POST` | `/api/stripe/webhook` | webhook receipt | Stripe signature | Raw-body webhook route. |

## Retired Compatibility Routes

These routes intentionally return `410 legacy_route_retired` with canonical hints where a replacement exists.

| Method | Retired Path | Canonical Path |
| --- | --- | --- |
| `POST` | `/api/optimizer/mvp-move` | `/api/omen/mvp-move` |
| `POST` | `/api/auth/sleeper/connect` | `/api/platforms/sleeper/connect` |
| `GET` | `/api/auth/yahoo/authorize` | `/api/yahoo/auth` |
| `GET` | `/api/auth/yahoo/callback` | `/api/yahoo/callback` |
| `POST` | `/api/auth/espn/connect` | `/api/platforms/espn/connect` |

`GET /api/league/standings` was previously considered for retirement but is now restored as the canonical League Standings route.

## Smoke Conventions

Use `scripts/smoke-tier2-endpoints.js` for Tier 2 launch smoke.

- Default feedback smoke target: season `2099`, week `1`.
- This keeps smoke evidence away from current-season user history by default.
- Add `OMEN_TIER2_CLEANUP=1` to rewrite the same idempotent smoke row to `followed=false`, `stars=null`, and a cleanup note after Move History has verified it.
- The script reads `OMEN_AUTH_TOKEN` only from the current process environment and never prints it.
