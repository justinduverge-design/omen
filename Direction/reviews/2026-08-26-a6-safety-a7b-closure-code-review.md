# Code review — A6 safety containment and A7B closure

**Date:** 2026-08-26  
**Branch:** `codex/a7b-closure-reconciliation`  
**Scope:** `src/routes/omen.js`, `src/services/omen.js`, focused tests, and authority/closure records

## Verdict

PASS for review as an undeployed safety repair. No open P0/P1 finding remains in this diff. Tuesday scoring must stay disabled until this branch is reviewed, merged, deployed, and proven on newly generated production rows; the diff does not close full A6.

## Findings checked

1. **Wrong-format grading — contained.** Live envelopes formerly defaulted unknown provider scoring to `ppr`. They now keep it `null`. A recommendation cannot enter the historical fallback because the server persists `scoring_contract_required=true`; a feedback-only/direct client writes the same marker.
2. **Recommendation row absent — fixed.** A successful authenticated live response now upserts server-owned week/season, recommendation, platform/league, legacy-format label when known, and the explicit scoring coverage/reconciliation state before returning advice.
3. **Persistence failure — fails closed.** A storage failure returns `503 omen_recommendation_persistence_failed`, removes the recommendation, and does not expose the database message. DvP/LLM enhancement failures remain deliberately non-fatal and separate.
4. **Client trust — preserved.** Feedback does not accept scoring, contract, provider snapshot, or recommendation metadata from the client. The live route derives stored metadata from its authenticated server response.
5. **Historical compatibility — preserved.** Rows genuinely predating A6 still have a null marker and retain the established PPR fallback. Any row created or touched through the current feedback route is explicitly post-A6 and fails closed.
6. **Provider rights/claims — preserved.** The repair does not fetch or retain new provider settings. ESPN records `provider_restricted`; Yahoo/Sleeper remain `pending`; contract/snapshot hashes stay null rather than being fabricated.
7. **Secret and error containment — passed.** No credential, token, provider cookie, raw user row, database message, or production secret is logged or returned. Production inspection was aggregate-only.

## Verification

- RED first: focused route tests failed for the missing marker, missing recommendation write, and PPR default.
- GREEN focused: feedback, live route, live service, and Tuesday scorer tests pass.
- Full backend: 713/713; focused 56/56; moderate audit 0 vulnerabilities.
- Dependency surface unchanged.

## Deliberate nonclaims

- No full provider-rule contract was captured.
- No provider-final reconciliation was implemented.
- No new production row has exercised this branch because it is not deployed.
- No application image was built/deployed; no PR was merged.
- A6 remains BLOCKED by provider rights/full-contract work and production new-row proof.
