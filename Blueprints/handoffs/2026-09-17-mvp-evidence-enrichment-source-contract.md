# MVP Decision Evidence: DvP and Private Narration Source Contract

**Date:** 2026-09-17  
**Scope:** source-specific backend helpers only; no deployment, production configuration, scoring/publication controls, database work, provider credentials, or native changes.

## What is ready to compose

`src/services/mvpEvidenceEnrichment.js` provides narrow helpers for the Omen MVP route.

### Matchup DvP

- `deriveVerifiedDvpLookup(response, { explicitMock })` requires an actual `recommendation.matchup_context` before it can query nflverse:
  - live: `opponent_team`, `source: "espn_scoreboard"`, `status: "live"`;
  - explicit fixture only: `source: "mock_schedule_fixture"`, `status: "mock"`, response `mode: "mock"`, and `explicitMock: true`.
- There is deliberately no live team-to-opponent fallback. In particular, a player on DAL can never become a PHI lookup because of a deterministic mock map.
- `resolveMvpDvpContext` rejects unsupported positions, missing/invalid schedule context, unavailable data, a mismatched opponent/position result, and samples under three actual weeks. `applyDvpContext` is the only helper that promotes the signal to `live`.
- `matchupService.getDvpContext` now aggregates all player rows by regular-season week before calculating its average. `sample_weeks` therefore means exactly that; it is not a count of player rows from the same game.

### Private model narration

- `buildMvpLlmPayload` sends a bounded, user-safe subset of the already-built response. It excludes request/user/league IDs, player IDs, raw provider payloads, credentials, headers, tokens, cookies, and errors.
- `generateMvpLlmNarration` returns `null` unless the existing private bridge reports `configured_private`, the output meets the service's 50-word/two-sentence limits, and every `data_used` label is already present in deterministic decision facts.
- `applyMvpLlmNarration` changes only `summary` and `why_it_matters`. Risk, confidence, and data-used provenance remain deterministic. It promotes the signal only after a valid model response is applied and preserves safe model labeling in `signals.llm_reasoning.model`.
- A timeout, invalid JSON, model error, public/missing bridge, invented source label, or ineligible response must retain the existing deterministic explanation and non-live signal state.

## Composition sequence

1. Build the deterministic MVP response.
2. Attach a schedule-verified `matchup_context` to the selected recommendation.
3. Resolve and apply DvP only when the lookup helper authorizes it.
4. Generate and apply private-model narration only in an eligible response state and only when the request/release policy allows it.
5. Persist the still-deterministic decision record; narration must remain an enhancement, not a requirement to issue a recommendation.

## Evidence

Focused source tests passed on 2026-09-17:

```text
npm test -- test/matchupService.test.js test/mvpEvidenceEnrichment.test.js test/llmService.test.js
# 22 passed, 0 failed
```

`git diff --check` could not execute in this environment because the local Git invocation triggered an unaccepted Xcode license prompt before producing Git output. No source or deployment action depended on that check.
