# B2 Unified Omen Recommendation Layer Code Review

## Scope / Base

Branch: `codex/b2-unified-omen-phase-plan`

Scope: B2 backend implementation for `POST /api/omen/mvp-move` route guard, Omen MVP envelope field completeness, and focused tests.

Base: stacked on B1 local branch.

## Verdict

MERGE after normal branch review. No P0 or P1 findings found in this local self-review.

## Findings

| Severity | Finding | Evidence | Action |
|---|---|---|---|
| P0 | None | Reviewed route auth/off-season ordering, live/mock split, provider credential boundaries, and tests. | None |
| P1 | None | Focused tests cover authenticated off-season short-circuit, live envelope contract fields, mock/dev field contract, and optimizer-route retirement. | None |
| P2 | Direct POST off-season returns before platform readiness classification. | This is intentional defense-in-depth; dashboard still owns user-facing pre-call readiness ordering. | Keep documented so frontend does not treat direct POST as the primary gate. |

## Review Notes

- Authentication still runs before direct off-season handling.
- Off-season response uses only the shared NFL calendar and returns `recommendation: null`.
- The service-level off-season guard prevents provider adapter/Vault calls even if the service is called outside the route.
- `contract_version` is added through the existing base envelope builders, not copied per state.
- No SQL, package, provider credential, analytics, deploy, or UI code was changed.

## Test Evidence

- RED: `node --test test/omenRoute.test.js test/omenMvpLiveRoute.test.js test/omenMvpLiveService.test.js` failed on missing `contract_version` and missing direct `off_season` behavior.
- GREEN: same command passed 44/44 after implementation.

## Residual Risk

Production and real-account provider behavior remain unverified until push/merge/deploy and a separate approved canary.
