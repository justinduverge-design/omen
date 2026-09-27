# Football intelligence Stage D — local serving and customer integration

**Date:** 2026-09-26

**Branch:** `codex/football-intelligence-plan`

**Authority:** founder-approved remodeling; local/review-only implementation, not production activation

**Implementation commit:** `63689a4a7ca5873b9da12d4f3710f5a1c1e36cb8`

## Outcome

Stage B's immutable candidate read model now has a fail-closed local serving seam and additive
customer presentation on the existing Omen weekly-call journey. The implementation does not promote
candidates. It does not apply SQL, access a database, schedule ingestion, select production storage,
use credentials, deploy, push, merge, or activate customer data.

The review-only SQL defines a compact `football_intelligence_signals` projection with explicit
publication state, one published version per scope, authenticated SELECT of published rows, and
service-role writes. A request-scoped repository returns only complete validated published
`football-intelligence-signal.v1` payloads. The exact authenticated coach-transfer route requires
canonical `omen:team:*` and `omen:coach:*` identifiers plus a four-digit season.

`omen-decision-brief.v3` receives an optional top-level `football_intelligence` object. Available or
stale published evidence is contextual only and never selects a move. Insufficient, unavailable,
disputed, pending, candidate, unaccepted, or incomplete evidence cannot render advice. Current live
recommendations carry NFL abbreviations rather than proven Omen team identities, so the server emits
`identity_unresolved` and no football-intelligence summary. No abbreviation is promoted.

iOS, Android, and web decode the same contract and use the existing Omen Call/Evidence surfaces.
They show authority, coverage, freshness, limitations, and server-provided
`what_could_change_this` only when those values exist. Numeric confidence remains absent.

## Verification

- PASS — integrated focused Node suite before final hardening: 96/96.
- PASS — post-hardening football-intelligence/Omen/web focused suite: 94/94.
- PASS — full backend `npm test -- --test-reporter=dot` (exit 0).
- PASS — frontend Vite production build; existing `NODE_ENV` and chunk-size warnings remain.
- PASS — Android focused `OmenDecisionTest`; Gradle `BUILD SUCCESSFUL`.
- PASS — iOS selected `OmenDecisionTests` + `OmenDecisionViewModelTests`: 36 tests, 0 failures.
- PASS — `git diff --check` before close-out.
- NOT RUN/APPLIED — Supabase SQL, database RLS runtime proof, production publication, remote storage,
  artifact restore, deployment, customer activation, physical-device/browser visual inspection.

Repository close-out context: kickoff drift passes; local Valor Brain passes 3/3; sprint staleness
still reports the standing 13 findings; the Layer 0 Truth Gate remains blocked by the separate copied
`omen-football-data-research` tree (184 P0, 71 P1, 4 P2, including duplicate metadata IDs). No new
Stage D implementation or handoff file is named by that report.

## Remaining activation gates

1. Review and explicitly approve applying the SQL; then prove authenticated published-only reads and
   denied candidate/service-write behavior against the target database.
2. Choose the production artifact root and prove encrypted off-device backup plus fresh restore/hash/
   index/read-model rebuild.
3. Publish one independently accepted real artifact through a separately approved operator path.
4. Resolve provider recommendation subjects to canonical Omen team identities without abbreviation
   promotion.
5. Capture and inspect nominal/degraded Omen Call and Evidence states on iOS, Android, and web.

Until all five pass, Stage D is locally complete and ready for review, not production-live.
