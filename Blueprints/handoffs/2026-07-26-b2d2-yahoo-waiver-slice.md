# B2-D2 Yahoo Waiver Slice — 2026-07-26

## Objective

Add a guarded, Yahoo-only `waiver_pickup` fallback to the canonical Omen route without inventing projections or using mock optimizer output.

## Scope

- `POST /api/omen/mvp-move` only.
- Runs after selected-context validation and only when no Start/Sit swap exists. It does not request Yahoo's available-player pool unless the selected roster contains an OUT/IR-like starter.
- Requires a live selected Yahoo roster with an OUT/IR starter and a live same-position available player from Yahoo's average-rank-ordered pool.

## Contract

- Success: `state: "success"`, `mode: "live"`, `recommendation.type: "waiver_pickup"`.
- The recommendation exposes safe player summaries, `expected_value_delta.points: null`, unavailable projections, and a live waiver signal.
- Empty/failed Yahoo availability: `state: "empty"`, `recommendation: null`; failed retrieval sets `signals.waivers.status: "unavailable"`.
- Availability-only waiver advice bypasses optional matchup DvP enrichment; no synthetic opponent or ancillary matchup signal may upgrade this claim.
- No OAuth token, Vault ID, raw provider response, or `context_id` is returned.

## Evidence

- RED: temporarily removing the no-unavailable-starter guard made `node --test test/omenMvpLiveService.test.js --test-name-pattern "does not fetch Yahoo waivers"` fail because it called Yahoo's available-player pool.
- GREEN: focused `node --test test/omenMvpLiveService.test.js test/omenMvpLiveRoute.test.js` 20/20; final full `npm test` 426/426; frontend production build passed; `npm audit --audit-level=moderate` reported 0 vulnerabilities; `git diff --check` passed.
- CI: GitHub Actions is **SUBSTITUTED** by the recorded local checks during the billing hold; no CI-green, deploy, or real-provider claim is made.
- Security evidence: `Direction/reviews/2026-07-26-b2d2-yahoo-waiver-security-privacy-evidence.md`.

## External Gate

Yahoo Fantasy API reapproval blocks real-account capability proof. The code remains fixture-verified only until an authorized validation pass can use a real selected Yahoo league.

## Exclusions

No provider credential/settings change, package, migration, deploy, production data mutation, trade recommendation, deterministic cross-type selector, or native wiring.

## Skill Receipt

Task: B2-D2 guarded Yahoo waiver capability slice.

Change type: backend recommendation behavior.

Skills invoked: `slops-repo-inspector`, `pre-build-research`, `slops-tdd`, `slops-git-flow`, `security-privacy-evidence`, `slops-quality-baseline`, `slops-code-review`.

Conditional skills considered but not applicable: `slops-data-ingest-plan` (on-demand existing provider call, no ingest/storage), `slops-ai-integration-review` (no model/provider path), `workflow-tree-spec` (existing selected-context contract defines the state flow), native/UI/release skills (no client or release work).

Procedure note: the prior 15-advisory audit snapshot was stale. The current root moderate audit reports 0 vulnerabilities; real-account Yahoo proof remains a separate external gate.
