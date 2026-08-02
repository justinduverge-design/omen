# B2-D-E2 ESPN Canonical Waiver — Security and Privacy Evidence

## Scope

Internal implementation evidence for selected-context ESPN waiver evaluation in canonical `POST /api/omen/mvp-move`. Audience: founder and merge reviewer. Commit `0ad2cc6` is local and stacked on E1; it is not pushed, merged, deployed, or provider-proven.

## Sources Reviewed

- `Blueprints/specs/b2d-espn-e1-waiver-pool-v1.md`
- `src/services/omen.js`
- `src/adapters/espn.js`
- `test/omenMvpLiveService.test.js`
- `test/omenMvpLiveRoute.test.js`

## Confirmed Evidence

| Control / Claim | Evidence | Source | Confidence |
| --- | --- | --- | --- |
| Selected context precedes provider access | The requested opaque context filters owned active connections before connection selection, Vault access, roster import, or waiver lookup. A two-context test observes calls only for the selected connection. | `src/services/omen.js`; `test/omenMvpLiveService.test.js` | confirmed |
| Credential values remain server-side | Existing Vault references are decrypted inside the service and reused in memory for the selected roster and pool reads. No response, log, cache key, or persistence path receives them. Tests use synthetic placeholders only. | `src/services/omen.js`; focused service tests | confirmed |
| Recommendation requires live evidence | An unavailable starter and a finite requested-week projection at an eligible position are required. The highest projected eligible candidate is selected deterministically. | `src/services/omen.js`; focused service tests | confirmed |
| Failure remains honest | Provider failure returns an empty live envelope with `waivers.status: unavailable`; a successful empty pool returns live-empty; neither path creates mock advice. | `src/services/omen.js`; focused service tests | confirmed |
| Existing provider behavior is preserved | Yahoo remains on its availability-only fallback and Sleeper remains on its projection-backed pool. The full 500-test suite passes. | `src/services/omen.js`; `npm test` | confirmed |

## Data Classification

| Data Type | Sensitivity | Source / Flow | Notes |
| --- | --- | --- | --- |
| ESPN cookie session | restricted secret | Existing Vault reference to in-memory adapter arguments | Never logged, returned, cached, or written by E2. |
| Selected context and league/team identifiers | private product context | Owned `platform_connections` row to canonical response metadata | Only the selected owned context is evaluated. |
| Roster, availability, injury, and projection data | provider-scoped application data | ESPN adapter to deterministic Omen evaluator | Normalized fields only; no raw provider payload persists. |
| Recommendation output | user-facing application data | Canonical Omen response | Includes move, evidence labels, confidence, and risk; no credential or manager identity. |

## Consent and User Expectations

The provider read occurs only after the user has connected ESPN and selected that stored context. No new consent, telemetry, retention, transaction, claim/drop, or external-sharing behavior was added.

## Access and RBAC Notes

Existing authenticated-user and `platform_connections.user_id` filtering remains authoritative. E2 adds no route, role, admin action, table, RLS policy, or browser-visible credential flow.

## External Systems

The code can call ESPN through the existing adapter after deployment, but this session made no real ESPN request. Fixture tests mocked the adapter and Vault boundaries.

## Gaps and Unknowns

Fixture evidence does not prove ESPN's drafted-league roster subtraction or current provider behavior. That remains `B2-D-E3` under the founder-executed sanitized observation protocol.

## Approval Required

Push, PR, merge, deployment, production verification, and any real-account E3 observation remain separate actions. No transaction or credential-inspection approval exists.

## Recommended Next Safe Step

Land E1 before the stacked E2 commit, then run E3 in the founder's drafted ESPN league and record aggregate counts and booleans only.
