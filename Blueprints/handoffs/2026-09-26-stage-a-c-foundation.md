# Tuesday foundation — Stage A architecture review and Stage C canvas close-out

**Date:** 2026-09-26

**Branch:** `codex/football-intelligence-plan`

**Starting commit:** `802bd974c2b2218aaab296dadaa66311097c79ff`

**Stage A commit:** `0632811199ce2c9dbedcf48cef74b43410dcc37b`

**Stage C commit:** `a767b87e6b5383b5f2649cc3583a23e9e7857ddc`

**Verdict:** Stage C PASS. Stage A HOLD. Stage B not started and remains prohibited.

## Outcome

Stage A now has an exact reviewed source matrix, ownership/storage boundaries, independent source/canonical/
derivation/publication versioning, fail-closed correction and identity rules, and a logical first customer
`football-intelligence-signal.v1` envelope. The review also disproved assumptions that would have made an
implementation unsafe: recent `pbp_participation` is postseason-only; schedules' named upstream rights are
unresolved; FTN inputs require CC BY-SA and coverage review; and nflverse players does not include Yahoo or
Sleeper IDs. Gate A is therefore held rather than papered over.

Stage C now proves one-to-one coverage across 32 artboards, 32 Markdown contracts, and 32 machine-readable
screen records. It adds the two degraded Ledger contracts from existing J6 artboards, fixtures, and API
semantics; reconciles the Omen native v3 contract binding; defines token authority and bounded optical
exceptions; enforces API/token parity; and records state, accessibility, long-content, scrolling, and
horizontal-overflow requirements. No screen spacing was blindly replaced and no new screen behavior was
invented.

## Files changed

### Stage A

- `Blueprints/specs/football-data/omen-football-intelligence-architecture-v1.md`
- `Direction/reviews/2026-09-25-football-intelligence-stage-a-inventory.md`

### Stage C

- `Blueprints/specs/design/canvas-contract-requirements-v1.json`
- `Blueprints/specs/design/canvas-token-authority-v1.md`
- `Blueprints/specs/design/screen-contracts/LedgerDegraded-v1.md`
- `Blueprints/specs/design/screen-contracts/LedgerDetailDegraded-v1.md`
- `Blueprints/specs/design/screen-contracts/OmenEvidence-v1.md`
- `Blueprints/specs/design/screen-contracts/README.md`
- `Blueprints/specs/design/screen-journeys-v1.md`
- `design/native-visual-lock-2026-09-13/CONTRACTS.md`
- `mobile/android/core/designsystem/src/main/kotlin/com/slopssaloon/omen/core/designsystem/token/OmenSpacing.kt`
- `mobile/android/core/designsystem/src/test/kotlin/com/slopssaloon/omen/core/designsystem/token/OmenSpacingTest.kt`
- `scripts/check-canvas-contract-coverage.mjs`
- `scripts/check-canvas-foundation.mjs`
- `test/canvasContractCoverage.test.mjs`
- `test/canvasFoundation.test.mjs`
- `test/fixtures/canvas-contract-coverage/requirements.json`

### Close-out truth

- `Direction/2026-09-29-tuesday-readiness.md`
- `Direction/decision_log.md`
- `Blueprints/playbooks/skill-usage-ledger.md`
- `Blueprints/done/LEDGER.md`
- `Blueprints/handoffs/2026-09-26-stage-a-c-foundation.md`

## Verification

- PASS — `node scripts/check-canvas-contract-coverage.mjs`: 32 artboards / 32 contracts / 32 requirement records.
- PASS — `node scripts/check-canvas-foundation.mjs`: 32 screens; token parity, canvas literals, API versions.
- PASS — `node --test test/canvasContractCoverage.test.mjs test/canvasFoundation.test.mjs`: 3/3.
- PASS — `node scripts/sync-canvas-css.mjs design/native-visual-lock-2026-09-13 --check`: 32 artboards match `_shared.css`.
- PASS — `./gradlew :core:designsystem:testDebugUnitTest --tests '*OmenSpacingTest*'`: BUILD SUCCESSFUL.
- PASS — `git diff --check`.
- PASS — `node scripts/check-kickoff-drift.js`.
- PASS — local and L0 Valor Brain validation: 3/3.
- FAIL, pre-existing — `node scripts/check-sprint-staleness.js`: 13 standing findings.
- FAIL, pre-existing — L0 Truth Gate: 222 P0 broken-path/dead-header findings; neither Stage A source file introduced a reported finding. A P0 still blocks repository-wide close-out.

## Unresolved decisions and blockers

1. Obtain a defensible schedules rights/attribution receipt and decide how FTN CC BY-SA applies to derived
   features, evidence, and customer output.
2. Select an in-season tactical denominator; recent `pbp_participation` cannot fill that role.
3. Name authoritative Yahoo/Sleeper player-ID sources and a stable coach-ID authority.
4. Approve minimum games, plays, charted-play coverage, comparison windows, freshness SLA, and dispute rules.
5. Approve or revise the artifact/Supabase boundary, artifact location and operating policy, first customer
   slice, and public meanings of Scheme DNA, Coaching Tree, and System Signal.

## Skills

- Used: `pre-build-research` for source release/grain/rights/freshness evidence.
- Used: `design-system` for token authority, state/accessibility metadata, and bounded optical exceptions.
- Procedurally applied: `slops-repo-inspector`, `planning-pass`, `slops-context-markdown`,
  `slops-design-system-pack`, `slops-data-ingest-plan`, `slops-git-flow`, and `slops-quality-baseline`.
- Considered but not applicable: `slops-tdd` for Stage A because no behavior implementation was authorized;
  `slops-native-ui-audit` and simulator/device skills because no screen composition changed; `slops-ship` and
  `slops-canary` because nothing was merged, deployed, or released.

## Next smallest safe step

Run a source-admission/legal/freshness decision pass, then founder review of the five architecture decisions
above. Do not write SQL, routes, packages, schedules, or production-host changes from the research fixture.
