# Handoff — 2026-08-25 — A7B Phase 2 normalization and scoring acceptance

**Branch:** `codex/a7b-football-data` (stacked after Phase 1 commit `45bfb44`)

**Assignment:** `ATA-20260825-01`

**Status:** Phase 2 complete locally; A7B remains open and returns to a founder gate before Phase 3 staging shadow work

**Production effect:** none — not pushed, merged, deployed, scheduled, provisioned, published, or connected to scoring

## Outcome

Omen now has a dependency-free local Phase 2 replay that consumes exact nflverse player, team, and schedule manifests; normalizes canonical games, GSIS players, and franchise-season teams; creates versioned offensive, kicker, and DST facts/results; enforces the approved hard quality gates; and writes a non-promoted acceptance artifact plus receipt.

A separate read-only validator binds the artifact bytes to the receipt SHA-256 and independently recomputes every offensive, kicker, and DST result.

## Implementation

- `src/services/footballData/rawVault.js` — adds fixed reviewed `stats_team` and `schedules` contracts plus reusable exact-snapshot loading.
- `src/services/footballData/scoringAcceptance.js` — CSV parser, canonical identities/aliases, fact versions, v1 rulesets, exact references, cardinality/coverage/uniqueness gates, local non-publication artifact.
- `src/services/footballData/acceptanceValidator.js` — independent three-ruleset recomputation and receipt/hash validation.
- `scripts/football-data.js` — adds exact-manifest `accept` mode.
- `scripts/validate-football-acceptance.js` — read-only validator CLI.
- `test/footballDataRawVault.test.js`, `test/footballDataScoringAcceptance.test.js` — allowlist, identity, scoring, failure, edge-case, and independent validation coverage.
- `Blueprints/specs/football-data/omen-football-scoring-acceptance-v1.md` — exact rules and quality contract.
- `Direction/reviews/2026-08-25-a7b-phase2-code-review.md` — no-P0/P1 review and data-validation assessment.

## Intended RED → GREEN

- RED: `node --test test/footballDataScoringAcceptance.test.js` failed because `../src/services/footballData/scoringAcceptance` did not exist.
- GREEN: final focused football-data suite **21/21** covers raw capture/replay plus quoted CSV, four-week scope, canonical identities, offensive/kicker/DST rules, duplicates, malformed/anonymous identities, impossible values, incomplete coverage, kicker drift, exact manifest hashes, and independent recomputation.

## Real four-week replay

Temporary local evidence root: `/private/tmp/omen-a7b-live.psGF8Z`.

### Exact source objects

| Dataset | Raw bytes | Raw SHA-256 | Manifest SHA-256 |
|---|---:|---|---|
| `stats_player` | 8,656,387 | `e5e0615b3d96a3eaebfaee91e55afb4a4e7fe0caf057454177bcd7d6ad4bcfc2` | `1343ff57c7995d97ecb79d415ecc9b685d55f61d879d5454e6562d156dcd5064` |
| `stats_team` | 229,660 | `91058a59d894855377b2f39f40c4e7bdbeef96d12144289dc68215209a1c93cb` | `43ae7822335a624aa26b51a544bee2a4773daf0c29e559571908004d637c309a` |
| `schedules` | 2,177,168 | `8821e3bd02ba2ebe227e33278d88b4e39d8e1fd4fffad34a944233edd49c7c03` | `44ecd3c0cf148436f23aaeffbc82a414f2e55dcfde102bb943fa4dda909027ea` |

Source-bundle SHA-256: `93343b47cc4205e27f8bfd531d3d9dd5fa2ebf5fa69cc68c926da480dfcfd72e`.

### Replay results

| Week | Completed games | Offensive facts | Kicker facts | DST facts | Max offensive reference delta |
|---:|---:|---:|---:|---:|---:|
| 1 | 16 | 1,071 | 32 | 32 | `3.552713678800501e-15` |
| 7 | 15 | 1,034 | 30 | 30 | `3.552713678800501e-15` |
| 14 | 14 | 973 | 28 | 28 | `3.552713678800501e-15` |
| 17 | 16 | 1,062 | 32 | 32 | `7.105427357601002e-15` |
| **Total** | **61** | **4,140** | **122** | **122** | **`7.105427357601002e-15`** |

- Canonical identities: 61 games, 1,658 GSIS players, 32 franchise-season teams.
- Player reference mismatches: 0.
- Kicker/team aggregate mismatches: 0.
- Independent offensive/kicker/DST recomputation mismatches: 0/0/0.
- Duplicate facts/results, unresolved targets, impossible values: 0.
- Observed cardinality: 58–75 player rows/game; 26–38 player rows/team-game.
- Explicit non-scoreable exclusions: 4 blank-identity team-penalty rows with zero scoring values.

Final acceptance SHA-256: `5c4cbc0568ce85a94512b7722144a7cddcb83fe74bd088f04d90f7a628a00bea`.

Final receipt: `/private/tmp/omen-a7b-live.psGF8Z/phase2-acceptance/20260825T220012188Z-93343b47cc4205e2/receipt.json`.

Both acceptance and validation report `publication_authorized: false` and `promoted: false`.

## Verification

- Focused football-data suite: **21/21**.
- Full backend suite: **679/679** with the original checkout's existing dependency runtime via `NODE_PATH`; no install or package change.
- `npm audit --audit-level=moderate`: 0 vulnerabilities.
- Changed JavaScript syntax checks: pass.
- `git diff --check`: clean.
- Sprint-staleness checker: no findings in the checks it can perform.
- Code/security/data review: APPROVE, no P0/P1.

## Skills and procedure receipt

- `data-analytics:validate-data` shaped source/grain/completeness/join/reference/recomputation evidence and the residual-confidence statement.
- `engineering:code-review` shaped security, correctness, performance, failure, and maintainability review.
- `run-slops-saloon` is N/A for this phase: no UI, route, rendered state, or browser behavior changed.
- UI/design/native/provider-account/release/deploy/canary skills are N/A because this is a local public-data CLI with no client, credential, production, or release action.

## Remaining A7B work and next gate

A7B's overall `Done when:` is not met. Phase 3 still needs separately authorized staging shadow work: dedicated storage/runner design, correction/source-loss/schema-drift drills, KVM1 recovery behavior, Command Center Pi witness/freshness evidence, and alerts. Later gates still own production-readiness, A4's no-write rehearsal, collection enablement, and separately approved publication/scoring.

No automatic continuation into Phase 3 is authorized by this handoff.
