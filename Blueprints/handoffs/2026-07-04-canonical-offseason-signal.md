# 2026-07-04 — Canonical Off-Season Signal Handoff

Owner: Codex / backend

Branch: `codex/canonical-offseason-signal`

Status: Built and verified locally. Not staged, committed, pushed, merged, or deployed.

## Objective

Close the combined backend request from `Blueprints/handoffs/frontend-to-backend.md`: dashboard and league standings needed one canonical off-season signal so Omen could stop offering live weekly recommendations and Standings could show the existing empty state instead of a provider-failed error during the off-season.

## What Changed

- Added shared `isOffSeason(now = new Date())` in `src/services/nflSchedule.js`.
- Refactored `getCurrentNflWeekContext()` to reuse the shared season/week calculation without changing its public response shape.
- Updated `GET /api/dashboard/summary` so otherwise-ready Omen users receive:

```json
{
  "available": false,
  "mode": "pro",
  "status": "off_season"
}
```

- Updated `GET /api/league/standings` so off-season requests return the normal `league-standings.v1` envelope with `standings: []` before touching Yahoo, Sleeper, or ESPN adapters.

## Contract Notes

- Auth is unchanged; both routes still require the existing Supabase bearer token.
- No request body, query parameter, response contract version, package file, SQL, migration, env var, deploy config, or production setting changed.
- Existing dashboard statuses still apply first: `needs_platform`, `pending_live_engine`, `needs_subscription`, then `off_season`, then `ready`.
- In-season standings provider failures still return the existing safe error envelopes. Only off-season short-circuits to empty success.

Backend-to-frontend contract updated in `Blueprints/handoffs/backend-to-frontend.md` under "Canonical Off-Season Signal — 2026-07-04".

## Files Changed

- `src/services/nflSchedule.js`
- `src/routes/dashboard.js`
- `src/routes/league.js`
- `test/nflSchedule.test.js`
- `test/dashboardSummary.test.js`
- `test/leagueStandingsRoute.test.js`
- `Blueprints/api-routes.md`
- `Blueprints/handoffs/backend-to-frontend.md`
- `Blueprints/handoffs/frontend-to-backend.md`
- `Direction/current_sprint.md`
- `Direction/agent_inbox.md`
- `Direction/decision_log.md`
- `Blueprints/audits/2026-07-04-canonical-offseason-signal-code-review.md`
- `Blueprints/handoffs/2026-07-04-canonical-offseason-signal.md`
- `Blueprints/done/LEDGER.md`
- `Blueprints/playbooks/skill-usage-ledger.md`

## Verification

- RED focused tests failed for the intended missing behavior:
  - missing `isOffSeason`
  - dashboard returned `ready` instead of `off_season`
  - standings returned `502` instead of empty success
- GREEN focused tests: `node --test test/nflSchedule.test.js test/dashboardSummary.test.js test/leagueStandingsRoute.test.js` -> 28/28.
- Full backend suite: `npm test` -> 407/407.
- Dependency audit: `npm audit --audit-level=moderate` -> 0 vulnerabilities.
- Frontend build: `npm --prefix frontend run build` -> clean with existing warnings:
  - `.env` includes unsupported `NODE_ENV=production`
  - duplicate `className` attribute in `frontend/src/components/layout/Header.jsx`
  - Vite chunk-size warning
- Final diff check: `git diff --check` -> clean, with only the existing CRLF normalization warnings on `Direction/agent_inbox.md` and `Direction/current_sprint.md`.

## Skill Receipt

Task: Canonical off-season signal for dashboard + league standings.

Change type: Backend/API behavior; feature Done applied. Recommendation Done considered N/A because this does not produce or alter a recommendation, confidence, risk, reasoning, or Move History write. Security Done considered N/A as a full gate because no auth, credential, data classification, consent, retention, telemetry, external sharing, SQL, secret, or logging boundary changed; credential handling was still reviewed in the code review.

Skills invoked:

- `slops-repo-inspector`
- `slops-tdd`
- `slops-git-flow`
- `slops-quality-baseline`
- `slops-code-review`
- `slops-context-markdown`

Conditional skills considered but not applicable:

- `security-privacy-evidence`: no changed credential flow, data classification, consent, retention, telemetry, or external sharing. ESPN cookies and provider tokens remain behind existing server-only adapters and are not read on the off-season standings path.
- `pre-build-research`: no new external provider API, data source, pricing, dependency, or terms decision. Existing calendar math was reused.
- `workflow-tree-spec`: no new auth/provider recovery or multi-state user flow.
- `slops-ui-ux-audit`, `slops-ux-copy`, `slops-mobile-smoke`: no UI or UX copy changed.
- `slops-ship`, `slops-canary`: no commit, merge, deploy, or production cutover happened.

Procedure gap found:

- `Blueprints/quality/baseline.json` is still stale from 2026-06-23 at 356/356 tests. This branch passes the gate against it, but the baseline was not ratcheted during this task because prior phases have also skipped ratcheting and doing so here would mix a baseline-maintenance task into the feature branch.

## Risks / Limitations

- Off-season detection is calendar-based: before week 1 and after week 18. It does not inspect provider standings availability or the official schedule release.
- `GET /api/league/standings` does not add a new `off_season` field; it relies on the existing frontend empty-state branch for `standings: []`.
- Frontend still needs to handle dashboard `tools.omen_of_the_week.status === "off_season"` before calling `POST /api/omen/mvp-move`.
- Not live until Justin approves commit/push/PR/merge/deploy.

## Next Step

Frontend should wire the dashboard `off_season` status into the Omen card/button state. Backend is ready for Justin's commit/push/PR gate after final diff cleanliness passes.
