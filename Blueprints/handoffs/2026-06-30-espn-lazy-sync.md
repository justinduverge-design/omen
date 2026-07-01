# ESPN Live Draft Tracking Handoff

Date: 2026-06-30
Owner: Codex/backend
Status: Complete locally. Not pushed, merged, or deployed.

## Summary

Built the ESPN version of Lazy Sync using the same list/meta/state contract pattern already proven on Sleeper. The backend now exposes authenticated ESPN draft discovery and state polling routes, backed by the existing Vault-secured ESPN connection flow and a provider-safe synthetic draft id.

Because ESPN's draft surface is league-scoped and not cleanly documented as a standalone public draft resource, the contract intentionally uses:

```text
espn:<leagueId>
```

for `draft_id`.

## Files Changed

- `src/routes/espn.js`
- `src/adapters/espn.js`
- `src/services/espnDraft.js`
- `test/espnAdapter.test.js`
- `test/espnDraftRoute.test.js`
- `test/espnDraftService.test.js`
- `Blueprints/api-routes.md`
- `Blueprints/handoffs/backend-to-frontend.md`
- `Direction/current_sprint.md`
- `Direction/agent_inbox.md`
- `Direction/decision_log.md`
- `Direction/reviews/2026-06-30-espn-lazy-sync-research.md`
- `Direction/reviews/2026-06-30-espn-lazy-sync-security-evidence.md`
- `Blueprints/audits/2026-06-30-espn-lazy-sync-code-review.md`
- `Blueprints/playbooks/skill-usage-ledger.md`
- `Blueprints/done/LEDGER.md`
- `Blueprints/quality/baseline.json`
- `Blueprints/quality/baseline.md`

## Contract Changes

Method and path:

```text
GET /api/espn/draft?leagueId=<id>
GET /api/espn/draft/:draftId
GET /api/espn/draft/:draftId/state?since=<int>
```

All three routes require auth and an existing ESPN connection. `draftId` is synthetic and must be `espn:<leagueId>`.

Contract versions:

```text
espn-draft-list.v1
espn-draft-meta.v1
espn-draft-state.v1
```

Key response semantics:

- `status` is normalized to `pre_draft | drafting | paused | complete | unknown`
- `since` defaults to `0`
- `poll_after_seconds` is `2` while drafting and `30` for low-frequency states
- `debounce_ms` is `2000`
- `user_draft_slot` and `slot_to_roster_id` may be `null`

No package, SQL, env, auth-boundary, Stripe, Supabase, or deploy behavior changed.

## Verification

- RED: `node --test test/espnDraftService.test.js test/espnDraftRoute.test.js`
- GREEN focused ESPN slice:

```text
node --test test/espnAdapter.test.js test/espnDraftRoute.test.js test/espnDraftService.test.js test/espnRoute.test.js
```

-> `33/33`
- Full backend: `npm test` -> `412/412`
- Audits: `npm audit --audit-level=moderate` -> `0`; `npm audit --omit=dev --audit-level=high` -> `0`
- Builds: `npm --prefix frontend run build` clean with existing Vite warnings; `npm --prefix client run build` clean
- Diff hygiene: `git diff --check` clean
- Research: `Direction/reviews/2026-06-30-espn-lazy-sync-research.md`
- Security evidence: `Direction/reviews/2026-06-30-espn-lazy-sync-security-evidence.md`
- Code review: `Blueprints/audits/2026-06-30-espn-lazy-sync-code-review.md`

## Risks / Limitations

- ESPN draft ids are synthetic and league-scoped by design.
- Draft-order metadata is best-effort from explicit provider order or observed picks and may remain null.
- The short debounce cache is local-process only.
- No real-account ESPN production smoke was run in this task.

## Skill Receipt

Task: Backend — ESPN live draft tracking (Lazy Sync, same pattern as Sleeper).

Change type: Backend feature contract + provider adapter normalization + tests + close-out docs.

Skills invoked: `slops-repo-inspector`, `pre-build-research`, `slops-tdd`, `slops-context-markdown`, `security-privacy-evidence`, `slops-code-review`, `slops-quality-baseline`, `slops-git-flow`.

Conditional skills considered but not applicable: `slops-ai-integration-review` (no model/provider toggle/prompt change), `slops-ui-ux-audit` / `slops-mobile-smoke` / `slops-verify` (no new user-visible page shipped here), `slops-ship` / `slops-canary` / `slops-deploy-guard` (no push, merge, deploy, or infra change).

Evidence: provider research note, RED/GREEN test trail, focused ESPN route/adapter coverage, full backend suite, audits, builds, diff hygiene, contract handoff, security evidence, code review, and refreshed quality baseline.

Procedure gap found: the work continued on an existing approved branch/worktree instead of a fresh per-item branch, so git-flow evidence is partial rather than ideal. No push/merge/deploy was attempted.
