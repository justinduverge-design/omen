# Phase 3.13 Token-Constrained Prompts Code Review

## Scope

Reviewed local diff for Phase 3.13:

- `src/services/llm.js`
- `test/llmService.test.js`
- closeout documentation

## Verdict

PASS. No P0 or P1 findings.

## Findings

None.

## Review Notes

- Correctness: shared narration constants apply to trade/start-sit chat completions and Omen MVP Move strict-JSON narration.
- Reliability: over-limit Omen JSON is rejected and falls back to the existing deterministic copy instead of returning oversized narration.
- Security/privacy: no new secrets, env values, providers, auth, ESPN cookie path, logging path, package, SQL, migration, or deploy config.
- Performance: narration generation cap drops from the prior 200/360-token behavior to 90 tokens for narration calls.
- Scope: manager-agent JSON calls are intentionally unchanged because they are not user-facing narration prompts.

## Verification Evidence

- RED: `node --test test/llmService.test.js` failed on missing token cap, missing prompt limit, and overlong parser acceptance.
- GREEN: `node --test test/llmService.test.js` 2/2.
- Focused: `node --test test/omenRoute.test.js test/omenMvpLiveRoute.test.js test/agents.test.js` 58/58.
- Full backend: `npm test` 387/387.
- Audit: `npm audit --audit-level=moderate` 0 vulnerabilities.
