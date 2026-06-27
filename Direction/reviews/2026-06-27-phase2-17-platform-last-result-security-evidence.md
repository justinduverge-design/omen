# Phase 2.17 Platform Last-Result Security Evidence

## Scope

Backend-only additive dashboard summary fields for connected Yahoo, Sleeper, and ESPN platform rows.

## Sources Reviewed

- `Direction/facts-of-record.md`
- `Blueprints/done/security-done.md`
- `src/routes/dashboard.js`
- `src/adapters/sleeper.js`
- `src/adapters/yahoo.js`
- `src/adapters/espn.js`
- `src/services/yahooAuth.js`
- `src/services/espnAuth.js`
- `test/dashboardSummary.test.js`
- `test/{sleeper,yahoo,espn}Adapter.test.js`

## Confirmed Evidence

| Control / Claim | Evidence | Source | Confidence |
|---|---|---|---|
| No new endpoint or auth boundary | Existing `GET /api/dashboard/summary` remains behind `requireAuth`. | `src/routes/dashboard.js` | confirmed |
| No new secret storage | Uses existing Vault-backed Yahoo and ESPN credential factories. No env/package/SQL changes. | `src/services/yahooAuth.js`, `src/services/espnAuth.js` | confirmed |
| ESPN cookie values are not exposed | Adapter returns only `lastResult`, `lastGameId`, `lastGameKickoff`; tests assert serialized ESPN parser result excludes cookie fixture strings. | `src/adapters/espn.js`, `test/espnAdapter.test.js` | confirmed |
| Provider failures do not break dashboard | Last-result enrichment catches provider errors, logs provider name + message only, and leaves fields null. | `src/routes/dashboard.js` | confirmed |
| Mock/live honesty preserved | Missing, tied, unavailable, or unsafe provider results return `null`, not guessed wins/losses. | adapter parser tests | confirmed |

## Data Classification

| Data Type | Sensitivity | Source / Flow | Notes |
|---|---|---|---|
| Fantasy matchup result (`W`/`L`) | low user-context data | Provider adapter -> dashboard summary | Additive display hint for frontend pulse. |
| Fantasy matchup id | low user-context data | Provider adapter -> dashboard summary | Stable id for frontend last-seen storage; no raw provider body. |
| Kickoff timestamp | low if available | Currently always null for these fantasy matchup sources | No fabricated timestamp. |
| Yahoo OAuth token | secret | Vault -> server-only Yahoo client | Not returned. |
| ESPN cookies | secret/high risk | Vault -> server-only ESPN adapter | Not returned, logged, or echoed. |

## Consent and User Expectations

Users connecting a fantasy platform already expect Omen to read league/team context for dashboard and Omen functionality. This change reads the prior fantasy matchup result for the same connected league context and does not change consent copy or add external sharing.

## Access and RBAC Notes

No admin action, RLS change, or new table. Dashboard summary remains authenticated per user; provider access is derived from that user's stored platform connection rows.

## External Systems

- Sleeper public API.
- Yahoo Fantasy Sports API via existing OAuth.
- ESPN fantasy API via existing cookie-backed adapter.

## Gaps and Unknowns

- ESPN private API schema can drift.
- True NFL kickoff timestamp is not available in the fantasy matchup resources used for v1; `lastGameKickoff` remains null until a schedule-source decision is made.

## Approval Required

No new approval for this backend-only additive field. Real ESPN production smoke, paid provider adoption, or expanded ESPN fields need Justin approval.

## Recommended Next Safe Step

Frontend Phase 1.5d can consume `platforms.<platform>.lastResult === 'W'` and should ignore nulls. Store `lastGameId` locally for one-time pulse behavior.
