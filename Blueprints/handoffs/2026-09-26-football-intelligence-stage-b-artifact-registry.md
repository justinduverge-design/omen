# Football intelligence Stage B — local artifact registry

**Date:** 2026-09-26

**Branch:** `codex/football-intelligence-plan`

## Outcome

The approved local/non-production Stage B is implemented through a validated, immutable candidate
read model. It begins with an injected-root,
content-addressed artifact registry with immutable source receipts, explicit admitted-source
uses, correction/supersession links, tamper-checked replay, and a rebuildable machine index.
It contains no SQL, route, package, scheduler, production path selection, remote-host change,
deployment, credential, authorized publication, or customer activation behavior.

The existing Omen disaster-recovery architecture was also reconciled. Database backup and
restore are already proven through KVM1 → encrypted Restic-on-KVM2, Steward freshness,
Command Center monitoring, and alert delivery. The remaining football-intelligence production
gate is to include the selected artifact root in that pattern and prove an artifact-specific
restore/hash/index/read-model rebuild. No second backup architecture is needed.

The adoption review of `cecd9b64c3a1d1fc5bb529e0d1cbd7b25cad5881` is complete. The registry was
retained rather than rebuilt: its injected-root isolation, content addressing, source admission,
immutable receipts, supersession link, generated index, CLI, tests, and DR-reuse boundary match
the Stage B acceptance contract. One seam was strengthened before reuse: receipt replay now verifies
the receipt and referenced object together, including declared byte length.

The next smallest Stage B slice landed as `e7c052c6437c83c42fb5afe1d20d3e9de473f02f`:

```text
exact registered ordinary nflverse PBP receipt
  -> verified receipt-bound replay
  -> injected TabularReader.readRows({ exact bytes, media type, required columns, schema fingerprint })
  -> bounded deterministic football-observed-fact.v1 plays
```

## Files

Added:

- `src/services/footballIntelligence/artifactRegistry.js`
- `src/services/footballIntelligence/sourceRegistry.js`
- `src/services/footballIntelligence/README.md`
- `scripts/football-intelligence-artifacts.js`
- `test/footballIntelligenceArtifactRegistry.test.js`
- `src/services/footballIntelligence/ordinaryPbp.js`
- `test/footballIntelligenceOrdinaryPbp.test.js`
- `Direction/reviews/2026-09-26-football-intelligence-dr-reuse-review.md`
- this handoff

Updated:

- `src/services/footballIntelligence/index.js`
- `scripts/README.md`
- `Blueprints/specs/football-data/omen-football-intelligence-architecture-v1.md`
- `Blueprints/prompts/football-intelligence-artifact-dr-decision.md`
- `Direction/known_issues.md`
- `Direction/2026-09-29-tuesday-readiness.md`
- `Direction/decision_log.md`
- `Blueprints/playbooks/skill-usage-ledger.md`
- `Blueprints/done/LEDGER.md`

## Contracts

- Registry: `football-intelligence-artifact-registry.v1`
- Source receipt: `football-intelligence-source-receipt.v1`
- Rebuildable index: `football-intelligence-artifact-index.v1`
- Reserved production root refused: `/var/lib/omen-football-intelligence`
- Current admitted families: `play_by_play`, `schedules`, historical-only
  `pbp_participation`, and coverage-gated `ftn_charting`

The index is a navigation projection, not replay authority. Immutable receipt and object
hashes remain authoritative.

The ordinary-PBP slice accepts only `raw_source` / `play_by_play` / `current_denominator`
receipts. It retains observed game/play, season/week/type, team, situation, pass/rush/scramble,
touchdown, yards gained, and exact provenance. It measures no-play/non-scrimmage exclusions and
fails closed on missing columns, row-count drift, invalid bounded values, or duplicate play keys.
It does not parse CSV/Parquet itself, infer identities, compute EPA, claim personnel/formation,
or consume FTN/participation data.

## Verification

- PASS — focused football-intelligence suites: 29 / 29.
- PASS — post-adoption focused suites: 19 / 19, including 12 source-catalog/registry/replay/ordinary-PBP tests.
- PASS — post-adoption full `npm test -- --test-reporter=dot` (exit 0; 509 dot-reporter tests).
- PASS — full `npm test -- --test-reporter=dot` (exit 0).
- PASS — `git diff --check`.
- PASS — `node scripts/check-kickoff-drift.js`.
- PASS — canvas coverage 32 / 32 / 32 and canvas foundation 32 screens.
- PASS — Layer 0 Valor Brain 3 / 3.
- FAIL, standing — sprint staleness reports the same 13 existing findings.
- FAIL, standing — Layer 0 Truth Gate reports the same 222 P0 broken-path/dead-header findings after
  two new path-like prose false positives were removed. No new Stage B file remains in the findings.

## Remaining production decisions

1. Exact production primary artifact root and capacity.
2. Retention for objects and receipts.
3. Inclusion in the approved encrypted backup set.
4. Fresh isolated artifact restore with exact hashes.
5. Index and compact read-model rebuild from restored evidence.
6. Freshness/failure status wired into the existing witness/alert pattern.

These require separate production/host authorization. Provider-diverse backup remains a useful
future strengthening because KVM1 and KVM2 are both Hostinger, but it is not falsely described
as part of the already-proven recovery path.

## Next smallest safe step

Local Stage B is closed at implementation commit
`dd1d150696b61cf240a61c872f3dd7718445397b`. The next permitted step is not another Stage B
kernel: it is the separately gated production artifact-root/retention/backup/restore decision and
proof. An authenticated read-only API, SQL repository, scheduler, production collection, publication,
and customer explanation remain later work and require their own current authority.

## Stage B completion addendum — 2026-09-26

The completion pass adopted the existing registry and ordinary-PBP work, then closed the remaining
local sequence:

```text
exact admitted receipts
  -> verified replay
  -> injected TabularReader
  -> schedules / ordinary PBP / FTN / historical participation source facts
  -> effective-dated provider-neutral identity assertions
  -> canonical scalar observed facts
  -> as-of feature windows
  -> Scheme DNA / System Signal / Coaching Tree
  -> independently validated compact read model
  -> immutable derived receipt and verified replay
```

- Ordinary PBP remains the current eligible-play denominator and now carries the observed
  `no_huddle` input used by the first feature window.
- FTN remains optional tactical enrichment. Its receipt coverage must meet 70%; otherwise its
  observations remain explicit `not_covered`/`null` facts that are ineligible for computation.
- Participation remains `historical_calibration_only` and is not accepted by the current-window
  projection.
- Omen team/franchise/coach identities are opaque provider-neutral IDs. NFLverse, Yahoo, Sleeper,
  ESPN, CBS, and future identifiers remain effective-dated namespace assertions; unresolved or
  disputed assertions never become serving IDs.
- `football-intelligence-evidence-policy.v1` enforces 4 games/120 plays for current Scheme DNA and
  8 games/250 plays in each comparison window. Thresholds are model policy, not observed facts.
- Read models are independently validated before registration. Their canonical bytes, exact source
  artifact IDs, immutable derived receipt, correction link, and publication-candidate state replay
  with hash and byte-length verification. Registration never authorizes publication.
- Feature windows enforce the source family declared by each metric and support an explicit as-of
  cutoff, preventing later observations from entering an earlier replay.

Verification for this completion:

- PASS — football-intelligence suites: 56 / 56.
- PASS — full backend suite: 1,236 / 1,236.
- PASS — `git diff --check`.
- PASS — kickoff drift; read order matches at 13 entries.
- PASS — Layer 0 Valor Brain 3 / 3.
- FAIL, standing — sprint staleness reports 13 pre-existing findings.
- FAIL, standing — Layer 0 Truth Gate reports 222 P0 and 105 P1 findings in historical/live-tree
  documentation. No completion-pass source or test file is named by the reported P0s, but repository
  close-out remains formally blocked under the governing rule.
- No endpoint contract changed.
- No SQL, route, package, scheduler, production host/root, remote storage, credential, deployment,
  publication authorization, or customer activation was added.
