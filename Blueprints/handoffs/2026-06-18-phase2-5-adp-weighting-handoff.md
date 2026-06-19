# Phase 2.5 ADP Weighting Handoff

## Files updated

- `/Users/justinduvergecatalino/Claude/Projects/Slops OS/code/slops-saloon/corvus/src/services/adp.js` — weighted consensus board, default/override weight resolution, additive live and mock response fields (`d04c535`).
- `/Users/justinduvergecatalino/Claude/Projects/Slops OS/code/slops-saloon/corvus/test/adpService.test.js` — weighting, matching, fallback, invalid-row, and mock-label coverage (`d04c535`).
- `/Users/justinduvergecatalino/Claude/Projects/Slops OS/code/slops-saloon/corvus/test/draftAssistantAdpRoute.test.js` — additive route-contract assertions (`d04c535`).
- `/Users/justinduvergecatalino/Claude/Projects/Slops OS/code/slops-saloon/corvus/Blueprints/audits/2026-06-18-phase2-5-adp-weighting-code-review.md` — `slops-code-review` verdict (`d04c535`).
- `/Users/justinduvergecatalino/Claude/Projects/Slops OS/code/slops-saloon/corvus/Blueprints/handoffs/backend-to-frontend.md` — weighted ADP contract and adoption notes.
- `/Users/justinduvergecatalino/Claude/Projects/Slops OS/code/slops-saloon/corvus/Direction/current_sprint.md` — Phase 2.5 closure evidence.
- `/Users/justinduvergecatalino/Claude/Projects/Slops OS/code/slops-saloon/corvus/Direction/decision_log.md` — config-path, default-weight, and score semantics.
- `/Users/justinduvergecatalino/Claude/Projects/Slops OS/code/slops-saloon/corvus/Blueprints/done/LEDGER.md` — Feature + Recommendation Done record.
- `/Users/justinduvergecatalino/Claude/Projects/Slops OS/code/slops-saloon/corvus/Direction/agent_inbox.md` — cleared Phase 2.5 and advanced the visible queue to Phase 2.6.

## Files discussed

- `sql/2026-06-12_phase1_adp_scoring_schema_review.sql` — `default_scoring_rules` JSON contract; still review-only and not applied.
- `src/routes/draftAssistant.js` — existing ADP route and mock/live behavior.
- `Blueprints/done/feature-done.md`, `recommendation-done.md`, `security-done.md` — closure gates.
- `Blueprints/handoffs/frontend-to-backend.md` — no active request conflicts.

## Decisions made

- Store per-league overrides at `default_scoring_rules.adp_source_weights`.
- Use neutral `1:1:1` FFC/Yahoo/MFL defaults and normalize configured relative weights.
- Define `score` as weighted-average ADP with lower values better; expose provider contributions.
- Reweight missing providers per player. Restore defaults for an all-zero override.
- Keep DB loading out of Phase 2.5 because the schema remains review-only; consumers pass a config row into the service.

## Unresolved questions

- Which authenticated Phase 2 consumer will own loading the applicable `league_scoring_configs` row once the schema is approved and applied.

## Blockers surfaced

- None for the completed service. No migration, production, secret, deploy, package-file, push, or PR action occurred.

## Last verified build/test result

- 2026-06-18: `node --test test/adpService.test.js test/draftAssistantAdpRoute.test.js` — 10/10 passed.
- 2026-06-18: `npm test` — 297/297 passed.
- 2026-06-18: `git diff --check` — clean before implementation commit.
- `slops-code-review` — merge verdict; no P0/P1.

## Next recommended pull

- Phase 2.6 — parameterize `src/services/optimizer.js` and `src/services/tradeValue.js` with the scoring-config contract established here while keeping call sites stable.
