# B1 Security and Privacy Evidence - Unified Omen Recommendation Contract

## Scope

Document security/privacy evidence for the B1 contract decision. This is evidence only; no secrets, production settings, SQL, deploy configuration, or credential stores were read or changed.

## Sources Reviewed

- `src/routes/omen.js`
- `src/services/omen.js`
- `src/routes/optimizer.js`
- `src/routes/dashboard.js`
- `src/services/systemContracts.js`
- `Direction/facts-of-record.md`
- `Blueprints/specs/omen-mvp-move.md`
- `Blueprints/api-routes.md`

## Confirmed Evidence

| Control / Claim | Evidence | Source | Confidence |
|---|---|---|---|
| Live Omen requires bearer auth. | Non-mock POST path authenticates before live generation and returns auth-required envelope on failure. | `src/routes/omen.js` | confirmed |
| Mock mode is explicit. | Route enters mock path only when `use_mock_data === true` or `mock_state` is present. | `src/routes/omen.js` | confirmed |
| Retired optimizer MVP route does not execute recommendation code. | `/api/optimizer/mvp-move` returns `410` before `router.use(requireAuth)` and no optimizer service call occurs. | `src/routes/optimizer.js`, `test/optimizerRoute.test.js` | confirmed |
| Omen is free; no subscription gate. | Dashboard emits `mode: "free"` for Omen; facts-of-record says Stripe is removed. | `src/routes/dashboard.js`, `Direction/facts-of-record.md` | confirmed |
| ESPN credential values are not returned by the Omen contract. | Recovery states return field names and recovery copy, not cookie values. | `src/services/omen.js` | confirmed |
| Public platform status does not leak LLM URL. | Existing tests assert URL/port are absent; B1 adds no new URL exposure. | `test/systemRoutes.test.js` | confirmed |

## Data Classification

| Data Type | Sensitivity | Source / Flow | Notes |
|---|---|---|---|
| Auth bearer token | high | Request header to live POST and dashboard | Used server-side only; not documented as response data. |
| Yahoo OAuth token secret id | high | `platform_connections`, Vault-backed flow | Not returned in Omen envelopes. |
| ESPN cookies / SWID | high | Vault-backed ESPN connection | Values must never appear in logs, UI, screenshots, analytics, share payloads, or model prompts. |
| League/team/player data | moderate | Platform adapters to recommendation envelope | Allowed in user-facing recommendation when sourced from that user's connection. |
| Recommendation output | moderate | Backend Omen route to frontend | Can be saved via feedback/history only through existing authenticated paths. |
| Signal statuses | low/moderate | Backend evidence labels | Must stay honest: live/stub/mock/unavailable. |

## Consent and User Expectations

Users expect connected-platform data to be used only to produce their Omen recommendation and related Omen history. B1 does not expand consent, retention, sharing, telemetry, or analytics.

## Access and RBAC Notes

B1 does not add tables, service-role queries, admin actions, or new protected routes. Existing live Omen access remains user-authenticated.

## External Systems

- Yahoo, Sleeper, and ESPN remain provider data sources.
- Optional local LLM remains an enhancement only.
- No paid/cloud AI, Stripe, new analytics, or third-party sharing is introduced.

## Gaps and Unknowns

- Real-account QA for Sleeper/ESPN live Omen remains separate verification work before public claims.
- Recovery analytics event naming and payload policy are intentionally deferred until after B2/B4 state names stabilize.

## Approval Required

Justin approval remains required for production deploy, SQL/Supabase changes, secrets, provider credential changes, analytics, cloud AI spend, or any public/legal claim change.

## Recommended Next Safe Step

Build B2 against the unified contract with tests proving that live mode does not silently fall back to mock data and that recovery/off-season states do not expose provider credential material.
