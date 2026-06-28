# Phase 3.13 Token-Constrained Prompts Handoff

## Summary

Completed Phase 3.13 locally. The LLM wrapper now applies CPU-friendly narration limits for user-facing explanation calls: <=50 words, <=2 sentences, and a 90-token generation cap.

## Branch

`codex/phase3-13-token-constrained-prompts`

## Files Changed

- `src/services/llm.js`
- `test/llmService.test.js`
- `Direction/current_sprint.md`
- `Direction/sprints_completed.md`
- `Direction/decision_log.md`
- `Direction/agent_inbox.md`
- `Direction/reviews/2026-06-28-phase3-13-token-constrained-prompts-ai-integration.md`
- `Direction/reviews/2026-06-28-phase3-13-token-constrained-prompts-security-evidence.md`
- `Blueprints/audits/2026-06-28-phase3-13-token-constrained-prompts-code-review.md`
- `Blueprints/handoffs/backend-to-frontend.md`
- `Blueprints/done/LEDGER.md`
- `Blueprints/playbooks/skill-usage-ledger.md`

## Behavior

- Trade Analyzer LLM explanations are prompted to stay under 50 words and 2 sentences.
- Start/sit LLM explanations use the same narration limit.
- Omen MVP Move LLM JSON explanations use the same limit plus a 90-token generation cap.
- Omen rejects over-limit LLM explanation JSON and keeps deterministic fallback copy.

## Verification

- RED: `node --test test/llmService.test.js` failed for the intended missing prompt/token/parser limits.
- GREEN focused LLM: `node --test test/llmService.test.js` 2/2.
- Focused Omen/agent: `node --test test/omenRoute.test.js test/omenMvpLiveRoute.test.js test/agents.test.js` 58/58.
- Full backend: `npm test` 387/387.
- Audit: `npm audit --audit-level=moderate` 0 vulnerabilities.

## Skill Receipt

Task: Phase 3.13 Token-constrained prompts.

Change type: AI narration behavior + backend tests + docs.

Skills invoked: `slops-repo-inspector`, `slops-context-markdown`, `slops-ai-integration-review`, `security-privacy-evidence`, `slops-tdd`, `slops-git-flow`, `slops-quality-baseline`, `slops-code-review`.

Conditional skills considered but not applicable: `pre-build-research` (no new external source or vendor), `slops-ui-ux-audit` (no UI), `slops-ux-copy` (no user-facing static copy), `mobile-first-qa-playbook` (no mobile UI), `slops-ship`/`slops-canary` (no merge/deploy).

Evidence: review files in `Direction/reviews/`, code review in `Blueprints/audits/`, tests listed above, backend handoff block.

Procedure gap found: `Direction/current_sprint.md` and `Direction/decision_log.md` had pre-existing conflict markers. This pass reconciled only the touched live queue/log sections while preserving both useful sides.

## Remaining Limits

- Not pushed, merged, or deployed.
- No live KVM2 Gemma smoke was run.
- Phase 3.12 is in merge elsewhere and was not duplicated.
