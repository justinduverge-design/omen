# B2-D2 Yahoo Waiver Slice — 2026-07-26

## Objective

Add a guarded, Yahoo-only `waiver_pickup` fallback to the canonical Omen route without inventing projections or using mock optimizer output.

## Scope

- `POST /api/omen/mvp-move` only.
- Runs after selected-context validation and only when no Start/Sit swap exists.
- Requires a live selected Yahoo roster with an OUT/IR starter and a live same-position available player from Yahoo's average-rank-ordered pool.

## Contract

- Success: `state: "success"`, `mode: "live"`, `recommendation.type: "waiver_pickup"`.
- The recommendation exposes safe player summaries, `expected_value_delta.points: null`, unavailable projections, and a live waiver signal.
- Empty/failed Yahoo availability: `state: "empty"`, `recommendation: null`; failed retrieval sets `signals.waivers.status: "unavailable"`.
- Availability-only waiver advice bypasses optional matchup DvP enrichment; no synthetic opponent or ancillary matchup signal may upgrade this claim.
- No OAuth token, Vault ID, raw provider response, or `context_id` is returned.

## Evidence

- RED: `node --test test/omenMvpLiveService.test.js` failed because a qualifying Yahoo fixture returned `empty` before the implementation.
- GREEN: focused route/service/optimizer tests 24/24; final full `npm test` 416/416; frontend production build passed; `git diff --check` passed.
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

Procedure gap found: the audit baseline is stale and internally duplicated; current audit reports 15 pre-existing advisories, so this slice cannot claim an audit pass.
