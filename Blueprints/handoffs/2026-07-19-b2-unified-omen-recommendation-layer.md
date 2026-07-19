# Handoff - B2 Unified Omen Recommendation Layer

**Date:** 2026-07-19
**Branch:** `codex/b2-unified-omen-phase-plan`
**Base:** stacked on B1 branch `codex/b1-unified-omen-recommendation-contract`

## Objective

Implement B2 without creating a second Omen recommendation path.

## What Changed

- Added authenticated direct POST `off_season` defense in `POST /api/omen/mvp-move`.
- Added service-level off-season defense so provider adapters and Vault are not called outside the regular season.
- Added `contract_version` to Omen MVP mock/demo/live envelope builders.
- Expanded state vocabulary to include direct `off_season`, `pending_live_engine`, Yahoo recovery, and Sleeper recovery states.
- Added field-completeness tests for live and mock/dev Omen MVP envelopes.
- Kept the existing internal recommendation boundary; no new builder file was extracted.

## Endpoint Contract

`POST /api/omen/mvp-move` remains the only canonical Omen recommendation endpoint.

Live request remains:

```json
{}
```

Authenticated direct live POST outside regular-season weeks 1-18 returns:

```json
{
  "contract_version": "2026-05-18.omen-live.v1",
  "state": "off_season",
  "feature": "omen_mvp_move",
  "mode": "live",
  "recommendation": null
}
```

The frontend should still use dashboard-first gating and should not call the POST route unless `tools.omen_of_the_week.status === "ready"`.

## Files Changed

- `src/routes/omen.js`
- `src/services/omen.js`
- `test/omenRoute.test.js`
- `test/omenMvpLiveRoute.test.js`
- `test/omenMvpLiveService.test.js`
- `Blueprints/specs/omen-mvp-move.md`
- `Blueprints/specs/b2-unified-omen-recommendation-layer.md`
- `Blueprints/api-routes.md`
- `Blueprints/handoffs/backend-to-frontend.md`
- `Blueprints/audits/2026-07-19-b2-unified-omen-recommendation-layer-code-review.md`
- `Blueprints/done/LEDGER.md`
- `Blueprints/playbooks/skill-usage-ledger.md`
- `Direction/agent_inbox.md`
- `Direction/current_sprint.md`
- `Direction/decision_log.md`
- `Direction/reviews/2026-07-19-b2-ai-integration-review.md`
- `Direction/reviews/2026-07-19-b2-security-privacy-evidence.md`
- `Direction/sprints_completed.md`

## Verification

- RED focused command failed on missing `contract_version` and missing direct `off_season` route/service behavior.
- GREEN focused command: `node --test test/omenRoute.test.js test/omenMvpLiveRoute.test.js test/omenMvpLiveService.test.js` -> 44/44.
- Focused cross-contract command: `node --test test/systemRoutes.test.js test/optimizerRoute.test.js test/omenRoute.test.js test/omenMvpLiveRoute.test.js test/omenMvpLiveService.test.js test/dashboardSummary.test.js` -> 68/68.
- Full backend suite: `npm test` -> 393/393.
- Production audit: `npm audit --omit=dev --audit-level=moderate` -> 0 vulnerabilities.
- Frontend build: `npm --prefix frontend run build` -> pass with existing Vite warnings for `.env NODE_ENV=production` and chunk size.
- Root dev audit: `npm audit --audit-level=moderate` -> fails on the pre-existing `promptfoo` -> `@huggingface/transformers` -> `onnxruntime-node` -> `adm-zip` high-severity chain; not fixed because package-file/breaking dependency changes are out of B2 scope.
- `git diff --check` -> clean.

## Skills Used

- `slops-repo-inspector`: PASS. Confirmed branch, clean start state, L2 docs, and B2 spec.
- `planning-pass`: PASS. Used the existing B2A/B2B/B2C plan and closed B2 in queue docs.
- `slops-git-flow`: PASS. Scoped local branch; no push/merge/deploy.
- `slops-tdd`: PASS. RED and GREEN captured for focused route/service contract behavior.
- `slops-ai-integration-review`: PASS. No new AI/cost/data-egress path.
- `security-privacy-evidence`: PASS. Off-season path avoids provider/Vault calls and leaks no credentials.
- `demo-mode-pre-empty-state`: PASS. Mock/demo response mode remains explicit; live does not silently fall back to mock.
- `slops-quality-baseline`: PASS with root-dev-audit caveat. Full backend, production audit, frontend build, and diff check passed; root dev audit remains blocked by the known promptfoo/adm-zip chain.
- `slops-code-review`: PASS. No P0/P1 in local self-review.

## Not Touched

- DecisionBrief component.
- `/omen` UI migration.
- Recovery analytics.
- Provider connection mechanics.
- SQL/Supabase.
- Package files.
- Production flags.
- Deploy/production config.

## Next Safe Step

B3 can build `DecisionBrief` against the verified envelope fields. B4 should wait for B3 and for B2 to merge/deploy before making production UI claims.
