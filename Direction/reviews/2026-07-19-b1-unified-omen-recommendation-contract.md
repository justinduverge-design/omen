# B1 Unified Omen Recommendation Contract

## Scope

Define the single Omen recommendation contract for current `main` so B2 implementation and B3 `DecisionBrief` composition do not create duplicate recommendation systems.

This pass inspected code and contracts only. It made one safe runtime metadata correction in `/api/platform-status`; it did not change recommendation selection, provider adapters, auth, SQL, secrets, packages, deploy configuration, or production behavior.

## Sources Reviewed

- `src/routes/omen.js`
- `src/services/omen.js`
- `src/routes/optimizer.js`
- `src/routes/dashboard.js`
- `src/services/systemContracts.js`
- `test/omenRoute.test.js`
- `test/omenMvpLiveRoute.test.js`
- `test/optimizerRoute.test.js`
- `test/dashboardSummary.test.js`
- `test/systemRoutes.test.js`
- `Blueprints/specs/omen-mvp-move.md`
- `Blueprints/api-routes.md`
- `Blueprints/handoffs/backend-to-frontend.md`
- `Direction/current_sprint.md`
- `Direction/facts-of-record.md`
- `Direction/decision_log.md`

## Verified Have

| Area | Verified current truth | Evidence |
|---|---|---|
| Canonical route | `POST /api/omen/mvp-move` is mounted and builds live or explicit mock envelopes. | `src/routes/omen.js` |
| Retired route | `POST /api/optimizer/mvp-move` returns `410 legacy_route_retired` with `canonical_endpoint: "/api/omen/mvp-move"`. | `src/routes/optimizer.js`, `test/optimizerRoute.test.js` |
| Live auth | Non-mock live calls require bearer auth; missing auth returns `401` Omen envelope. | `src/routes/omen.js`, `test/omenRoute.test.js` |
| Billing | Omen is free; dashboard tools are `mode: "free"` and no `needs_subscription` status exists in current dashboard code. | `src/routes/dashboard.js`, `test/dashboardSummary.test.js`, `Direction/facts-of-record.md` |
| Live request shape | Mounted frontend sends `{}` and lets backend infer platform, league, team, season, week, and scoring context. | `frontend/src/pages/OmenOfTheWeek.jsx`, `src/services/omen.js` |
| Platform selection | Live route chooses Yahoo first, then Sleeper, then ESPN when each has usable context. | `src/services/omen.js` |
| Live recommendation type | Current live recommendation output is lineup/start-sit first. Waiver and trade market signals are explicitly out of v1 live scope. | `src/services/omen.js` |
| Signal honesty | Signals expose live/stub/unavailable status, including explicit unavailable waiver context. | `src/services/omen.js`, `frontend/src/lib/omenSignalLabels.js` |
| Off-season gate | Dashboard can return `tools.omen_of_the_week.status: "off_season"` before the frontend calls Omen. | `src/routes/dashboard.js`, `test/dashboardSummary.test.js` |

## Need

- One source of truth for Omen recommendation routing.
- One frontend call path: dashboard gate, then Omen POST when ready.
- One response/state vocabulary for `DecisionBrief` and `/omen`.
- Clear mock/off-season/no-data fallback rules.
- Explicit timing for recovery analytics.
- Docs and runtime status metadata that agree with Omen's free/no-Stripe posture.

## Gap Closed

- `Blueprints/specs/omen-mvp-move.md` now states the unified route, live `{}` request, retired optimizer path, no automatic mock fallback, dashboard off-season pre-call policy, and analytics timing.
- `Blueprints/api-routes.md` now states that `/api/optimizer/mvp-move` is not a product tier or fallback route.
- `src/services/systemContracts.js` no longer reports Omen as `mock_ready_live_pro_gated`.

## Remaining Implementation Gap

B2 still needs to make the internal recommendation layer cleaner. Today the canonical route exists, but live recommendation generation remains embedded in `src/services/omen.js` and current live scope is `start_sit` only.

B2 should preserve the single route while deciding whether to:

- extract a reusable internal recommendation builder;
- add a direct route-level `state: "off_season"` defense for API callers that bypass the dashboard gate;
- expand decision types beyond `start_sit` only when evidence and tests can label the new inputs honestly.

## Workflow Tree

### Actors

- User
- Frontend dashboard / `/omen`
- Backend dashboard summary
- Backend Omen route
- Platform adapters: Yahoo, Sleeper, ESPN
- Optional local LLM bridge

### Happy Path

1. User opens a protected Omen surface.
2. Frontend reads `GET /api/dashboard/summary`.
3. Dashboard returns `tools.omen_of_the_week.status: "ready"` and `mode: "free"`.
4. Frontend calls `POST /api/omen/mvp-move` with `{}`.
5. Backend authenticates bearer token.
6. Backend picks the first usable platform connection in priority order: Yahoo, Sleeper, ESPN.
7. Backend builds normalized roster context.
8. Optimizer evaluates lineup swaps.
9. Backend returns `state: "success"` with a `start_sit` recommendation, confidence, risk, explanation, alternatives, warnings, and signal labels.
10. Frontend renders the recommendation and, for live mode, the feedback slot.

### Branches

| Branch | Condition | Path | Owner | Result |
|---|---|---|---|---|
| Not signed in | No bearer token for live POST | Return `401` Omen auth envelope | Backend | Frontend routes to login |
| No platform | Dashboard has no usable active connection | Return `needs_platform` | Backend dashboard | Frontend shows connect state |
| Incomplete platform | Active row lacks required user/league/credential context | Return `pending_live_engine` or platform recovery state | Backend | Frontend shows recovery or reconnect state |
| Off-season | User otherwise ready, but shared NFL calendar is outside regular-season window | Dashboard returns `off_season`; frontend does not POST | Backend dashboard / frontend | No live advice shown |
| No lineup edge | Live roster imports but no swap clears threshold | Return `state: "empty"` | Backend Omen route | Frontend shows no-forced-move state |
| Explicit preview | Request includes `use_mock_data: true` or `mock_state` | Return mock/dev envelope | Backend Omen route | Frontend must label as mock/preview |
| Retired optimizer path | Caller posts to `/api/optimizer/mvp-move` | Return `410 legacy_route_retired` | Backend optimizer route | Caller receives canonical hint |

### Failure States

| Failure | Detection | User State | Recovery | Escalation |
|---|---|---|---|---|
| Yahoo token stale | Missing/expired Yahoo token | Yahoo reconnect | Reconnect Yahoo | No secret values returned |
| Sleeper context missing | No username or league id, or roster import fails | Sleeper reconnect/context state | Reconnect Sleeper | Keep provider ids bounded |
| ESPN cookies stale | Adapter 401/403, missing Vault values, or auth-like error | ESPN reauth | Reconnect ESPN cookies through approved flow | Never echo cookie values |
| ESPN league/team missing | Adapter 404 or league/team-context error | Select/reimport ESPN league | Reconnect or select league | No raw ESPN response in UI |
| Unexpected live generation failure | Exception after auth | `state: "error"` with retryable error | Retry after dashboard/platform refresh | Log sanitized error only |

## Observable State Contract

| State | Meaning | Source of Truth | Consumer |
|---|---|---|---|
| `ready` | Omen POST may run | `GET /api/dashboard/summary.tools.omen_of_the_week.status` | `/omen`, `/football` |
| `needs_platform` | User needs a usable connected league | Dashboard summary | App shell and Omen gate |
| `pending_live_engine` | Connection exists but enough context is missing | Dashboard summary or POST state | App shell and Omen view |
| `off_season` | Do not call live Omen | Dashboard summary | App shell and Omen gate |
| `success` | Recommendation exists | `POST /api/omen/mvp-move.state` | `DecisionBrief`, feedback |
| `empty` | Enough data, no forced move | Omen POST | Empty/no-forced-move state |
| `platform_disconnected` | Direct POST had no connection | Omen POST | Connect state |
| `*_reauth_required` / `*_context_missing` | Provider recovery required | Omen POST | Recovery state |
| `error` | Unexpected retryable failure | Omen POST | Error state |

## Decisions

- The optimizer MVP route stays retired. Do not rebuild UI or backend work on `/api/optimizer/mvp-move`.
- Live Omen remains free and auth-gated. No subscription or Stripe gate is part of the contract.
- Mock/dev fallback is explicit only. Live Omen must return live, recovery, empty, off-season gate, or error states.
- Recovery analytics is deferred until after B2/B4 stabilize the final state names and real-account QA confirms no credential material is captured.

## Open Questions

- Should B2 add a direct POST-level `off_season` envelope for non-UI/API callers, even though the dashboard gate already prevents normal UI calls?
- Should the platform selection priority stay Yahoo > Sleeper > ESPN, or should a future league-switching task expose user choice before Omen runs?
