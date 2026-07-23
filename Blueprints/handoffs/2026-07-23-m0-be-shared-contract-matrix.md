# M0-BE Shared Contract and Acceptance Matrix

## Objective

Close M0-BE-0: establish one backend-owned state contract, acceptance matrix, security/RBAC review, and three small implementation briefs for the native mobile connection foundation.

## Current Truth

- F2 is complete. `src/services/omenReadiness.js` is the single readiness authority; `pending_live_engine` means active but insufficient provider-specific context, not an unbuilt engine.
- `GET /api/platforms` is authenticated and currently exposes coarse connection status only.
- `POST /api/platforms/sleeper/connect` already upserts by `user_id,platform`; this is not yet proof of request-id replay semantics.
- `GET /api/yahoo/callback` verifies server-side OAuth state, persists tokens, deletes that state, and redirects to the web Account connect page. It does not yet have a mobile-aware return.

## Shared Contract

Canonical contract: `Blueprints/specs/mobile/omen-native-backend-state-contract-v1.md`.

The native client gets Omen readiness only from `GET /api/dashboard/summary`. Provider-flow state is a separate, additive contract. Neither response may contain credentials, raw provider text, OAuth artifacts, or Vault identifiers.

## Acceptance Matrix

| Slice | Contract outcome | Primary test location | Explicit exclusions |
| --- | --- | --- | --- |
| F2 complete | Unified readiness / off-season semantics | `test/omenReadiness.test.js`, `test/dashboardSummary.test.js` | No provider-flow mutation |
| M0-BE-1 | Authenticated safe provider-state mapping | `test/platforms.test.js` | No OAuth callback, cookies, schema, or native UI |
| M0-BE-2 | Per-user request-id replay semantics for native-supported connection mutation | focused platform/Yahoo route tests | ESPN mobile flow, schema, deploy, credentials |
| M0-BE-3 | Verified native Yahoo return with web compatibility | `test/yahooAuthRoute.test.js` | Arbitrary redirects, OAuth artifacts in deep link, store config |

## Required Workflow Coverage

| Event | Required observable result |
| --- | --- |
| Fresh connection | Named provider state and safe next action |
| Double tap / retry | One durable effect and a safe replay response |
| Background / app resume | Same request ID may safely resume; no duplicate connection |
| Invalid or expired Yahoo state | Fail closed with safe recovery; no provider detail |
| Yahoo cancel or deny | Safe canceled/retry state; no raw query values returned |
| No usable provider context | Dashboard reports `pending_live_engine`; client does not call MVP |
| Off-season with usable context | Dashboard reports `off_season` before live MVP call |

## Security and Authority

Review: `Direction/reviews/2026-07-23-m0-be-security-rbac-review.md`.

The implementation owner is the backend lane. Native clients consume documented states; they do not infer readiness or provider failure from HTTP status alone. Justin approval remains required for schema, provider credential, production, deploy, store, and ESPN-native-path changes.

## Implementation Order

1. M0-BE-1 provider-state API.
2. M0-BE-2 idempotent connect/validate.
3. M0-BE-3 Yahoo mobile-aware return.

Each is one branch and one PR. F2 remains historical/complete, so the outstanding work is three PRs, not a combined rewrite.

## Files Changed by M0-BE-0

- `Blueprints/specs/mobile/omen-native-backend-state-contract-v1.md`
- `Direction/reviews/2026-07-23-m0-be-security-rbac-review.md`
- `Blueprints/handoffs/2026-07-23-m0-be-shared-contract-matrix.md`

## Limitations

- No runtime API behavior changed.
- No current-provider documentation was re-researched; M0-BE-3 explicitly requires that research before implementation.
- Real-device OAuth proof remains a later human/device gate.
