# Handoff - B1 Unified Omen Recommendation Contract

**Date:** 2026-07-19
**Branch:** `codex/b1-unified-omen-recommendation-contract`
**Base:** `main` at `3b29197`

## Objective

Close B1 by defining one Omen recommendation contract before B2 implementation and B3 `DecisionBrief` composition.

## What Changed

- Locked `POST /api/omen/mvp-move` as the only canonical Omen recommendation route.
- Reaffirmed `POST /api/optimizer/mvp-move` as retired compatibility only.
- Documented live `{}` request shape, explicit mock-only fallback, dashboard off-season pre-call policy, no-data `empty` behavior, and recovery analytics timing.
- Corrected `/api/platform-status` metadata from Pro-gated to auth-gated.
- Cleared stale Stripe/billing launch-gate wording in active Direction docs touched by the contract.
- Recorded B1/F3 skill receipts and sprint status.

## Files Changed

- `src/services/systemContracts.js`
- `test/systemRoutes.test.js`
- `Blueprints/specs/omen-mvp-move.md`
- `Blueprints/api-routes.md`
- `Blueprints/handoffs/backend-to-frontend.md`
- `Blueprints/handoffs/2026-07-19-b1-unified-omen-recommendation-contract.md`
- `Blueprints/audits/2026-07-19-b1-unified-omen-recommendation-contract-code-review.md`
- `Blueprints/playbooks/skill-activation-runbook.md`
- `Blueprints/playbooks/skill-usage-ledger.md`
- `Blueprints/done/LEDGER.md`
- `Direction/agent_inbox.md`
- `Direction/current_sprint.md`
- `Direction/decision_log.md`
- `Direction/known_issues.md`
- `Direction/roadmap.md`
- `Direction/release_readiness.md`
- `Direction/reviews/2026-07-19-b1-unified-omen-recommendation-contract.md`
- `Direction/reviews/2026-07-19-ai-integration-omen-recommendation-contract.md`
- `Direction/reviews/2026-07-19-b1-security-privacy-evidence.md`
- `Direction/sprints_completed.md`

## Contract Decisions

- Canonical recommendation route: `POST /api/omen/mvp-move`.
- Retired compatibility route: `POST /api/optimizer/mvp-move` returns `410 legacy_route_retired`.
- Omen is free and auth-gated; no Pro/subscription/Stripe gate applies.
- Frontend calls dashboard first and posts `{}` only when `tools.omen_of_the_week.status === "ready"`.
- Live mode never silently falls back to mock data.
- Off-season is currently a dashboard pre-call gate; B2 may add route-level POST defense if needed.
- Recovery analytics waits until B2/B4 stabilize state names and real-account QA confirms safe event payloads.
- Current live recommendation output remains `start_sit` only.

## Verification

- Focused contract tests: `node --test test/systemRoutes.test.js test/optimizerRoute.test.js test/omenRoute.test.js test/dashboardSummary.test.js` -> 55/55.
- Full backend suite: `npm test` -> 391/391.
- Production audit: `npm audit --omit=dev --audit-level=moderate` -> 0 vulnerabilities.
- Root audit: `npm audit --audit-level=moderate` -> fails on pre-existing dev `promptfoo`/`adm-zip` chain; not fixed because the suggested fix is breaking and package-file edits are out of scope.
- `git diff --check` -> clean.

## Intended RED / GREEN

- Intended RED was the platform-status assertion that Omen must not mention Pro subscription. The assertion was added during the same correction pass; the pre-patch failure was not rerun separately. The old source value was `mock_ready_live_pro_gated`, and the new test pins `mock_ready_live_auth_gated` plus absence of `Pro subscription`.
- GREEN focused and full tests passed after the correction.

## Skills Used

- `slops-repo-inspector`: PASS. Confirmed L2 repo, branch, dirty state, latest `main`, and source files.
- `planning-pass`: PASS. Updated queue blockers and next pull ordering after B1.
- `product-gap-analysis-session`: PASS. Have/Need/Gap evidence in `Direction/reviews/2026-07-19-b1-unified-omen-recommendation-contract.md`.
- `workflow-tree-spec`: PASS. State/workflow tree in the same B1 review.
- `slops-ai-integration-review`: PASS. AI review in `Direction/reviews/2026-07-19-ai-integration-omen-recommendation-contract.md`.
- `security-privacy-evidence`: PASS. Evidence in `Direction/reviews/2026-07-19-b1-security-privacy-evidence.md`.
- `slops-context-markdown`: PASS. Updated specs, handoffs, Direction docs, and ledgers.
- `slops-git-flow`: PASS. Scoped branch from updated `main`; no push/merge/deploy.
- `slops-tdd`: PARTIAL. Regression assertion added and verified, but RED was not rerun before the one-line implementation fix.
- `slops-quality-baseline`: PARTIAL/PASS with caveat. Tests and production audit pass; root dev audit has a pre-existing promptfoo-chain advisory.
- `slops-code-review`: PASS. No P0/P1.
- `slops-retro`: PASS. Procedure gap recorded below.

## Procedure Gap / Correction

Gap: I initially resolved `../../../../Blueprints/skills/SKILL_ROUTING.md` from the repo root instead of from `Blueprints/playbooks/skill-activation-runbook.md`, incorrectly reporting it missing.

Correction: Read the actual Layer 0 file at `<SLOPS-root>/Blueprints/skills/SKILL_ROUTING.md` and clarified the Omen runbook path wording so future agents resolve it relative to the playbook file.

## Risks / Limitations

- No production deploy, push, merge, SQL, package, or secrets action happened.
- No real-account provider QA happened.
- No internal recommendation refactor happened; B2 owns that.
- No analytics implementation happened; intentionally deferred.
- Root dev audit remains blocked by the existing promptfoo-chain advisory.

## Next Recommended Pull

Use B3 `DecisionBrief` if the priority is frontend composition, or B2 if the priority is backend internals. Both are now contract-unblocked.
