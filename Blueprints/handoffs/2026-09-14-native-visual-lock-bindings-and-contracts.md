# Native visual-lock bindings and build contracts — 2026-09-14

## Status

Completed locally on `design/canvas-as-source-of-truth`. Nothing was pushed, merged, deployed, or applied to Supabase. No native screen code or token file was edited.

## What changed

The five binding gaps in `design/native-visual-lock-2026-09-13/CONTRACTS.md` are now concrete local contracts:

1. `POST /api/omen/mvp-move` supports opt-in `omen-decision-brief.v2`, which returns qualitative confidence bands and drivers while preserving the existing default contract for current callers.
2. `GET /api/dashboard/quiet-week` returns `quiet-week.v1` and owns the straight-versus-reflective quiet-week predicate server-side.
3. `GET /api/moves` supports opt-in `moves-history.v2`, requiring `platform` and `league_id` and mapping result/provenance without hit-rate summary claims.
4. `GET /api/trade/capabilities` returns `trade-capabilities.v1`, and `POST /api/trade/compare` rejects multi-team input with a typed unsupported response.
5. `GET /api/beta/reports/schema` and `POST /api/beta/reports` implement `beta-report.v1` as metadata-only reporting. `sql/2026-09-14_beta_reports_review.sql` defines storage but is review-only and not applied.

The design contract output lives in `Blueprints/specs/design/screen-contracts/`: one file for each of the 30 artboards plus an index README. Each contract records the source file hash, governing build binding, literal visible strings, controls and states, named symbol requirements, token/role/spacing/component inventory, scroll behavior, and build acceptance checks.

`design/native-visual-lock-2026-09-13/CONTRACTS.md` now points every artboard at a verified or explicitly unavailable API contract. `Blueprints/api-routes.md` and `Blueprints/handoffs/backend-to-frontend.md` document the route shapes for client implementation.

## Key files

- `Blueprints/specs/design/screen-contracts/README.md`
- `design/native-visual-lock-2026-09-13/CONTRACTS.md`
- `Blueprints/api-routes.md`
- `Blueprints/handoffs/backend-to-frontend.md`
- `src/services/decisionBriefV2.js`
- `src/services/quietWeek.js`
- `src/routes/betaReports.js`
- `sql/2026-09-14_beta_reports_review.sql`

## Verification

Passed:

- `node scripts/sync-canvas-css.mjs design/native-visual-lock-2026-09-13 --check`
- `git diff --check`
- `npm test` — 1100/1100
- `node scripts/check-kickoff-drift.js`
- from the L0 root: `node Blueprints/tools/truth-gate/truth-gate.mjs --quiet` — P0 0, P1 0, P2 2, PASS

`node scripts/check-sprint-staleness.js` ran and still reports 13 standing direction-record findings: stale A4 and B2-D3-S2 entries, nine buried known issues without GitHub issues, and four closed-without-ledger prose claims including C7. These are pre-existing record findings outside this change and were not rewritten in this pass.

## Done gates and limits

Feature, security, recommendation, and design-contract done were applied. Runtime native design gates are inherited by the implementation slices because this pass produced backend contracts and build contracts, not running screens. No provider credentials, ESPN cookies, league payloads, roster payloads, screenshots, or private user data are accepted by the beta report route.

The only remaining approval boundary is storage: `sql/2026-09-14_beta_reports_review.sql` needs explicit founder approval before anyone applies it to Supabase. Until then, report submission fails closed if the table is unavailable.
