# Football intelligence + canvas foundation implementation plan

**Date:** 2026-09-25
**Status:** Planning / inventory complete; implementation intentionally not started
**Scope:** Omen football-intelligence backend, production data lifecycle, native design-system authority, and canvas-to-code contract foundation

## Executive decision

Omen currently has two different football systems that must remain distinct until an explicit integration
contract exists:

1. The A7B football-data/scoring pipeline, which captures and verifies scoring-oriented artifacts and is
   deliberately fail-closed before host activation.
2. The proposed football-intelligence system, which would derive Scheme DNA, System Signal, and Coaching
   Tree from tactical, participation, schedule, and coaching-history evidence.

The second system is not yet a production data product. It has a tested research/kernel slice, but it does
not yet have a canonical persisted fact model, Supabase schema, operational ingestion lifecycle, serving read
model, API route, or customer decision integration. The implementation plan below closes that gap in stages.

The canvas foundation is in a similar state: the source material is strong, but it is not yet one authority.
There are 32 artboards and 30 contracts, three spacing authorities, unresolved typography narratives, and at
least one stale API contract version reference. These are foundation defects, not reasons to add more screen code.

## Evidence inventory

### Football backend/data

- `src/services/footballData/rawVault.js` and `scripts/football-data.js` own exact, hashed nflverse
  `stats_player`, `stats_team`, and `schedules` artifacts for scoring verification.
- `src/services/footballDataFacts.js` is an A7B scoring canonicalization adapter. It is not a play-level,
  team/coach-season, or football-intelligence fact store.
- `src/services/footballData/productionRunner.js` publishes scoring acceptance artifacts only; it is not an
  intelligence publisher.
- `src/services/footballData/productionReadiness.js` models KVM1/Pi provisioning, witness, alerts, schedules,
  correction, recovery, and A4 gates as founder-approved actions. The contract does not prove those actions
  are activated.
- `src/omen_tuesday_cron.js` still consumes aggregate fantasy inputs and explicitly notes that per-event
  facts are a future seam.
- `src/server.js` has no football-intelligence router or Scheme DNA/System Signal/Coaching Tree endpoint.
- There is no football-intelligence SQL migration, RLS policy, persistence adapter, canonical play fact store,
  source-artifact table, derived-artifact table, or customer-serving read model.
- The research and foundation artifacts define the pure derivation kernel and bounded Ben Johnson proof, but
  do not establish an operational source-to-customer lifecycle.

### Canvas/design system

- `design/native-visual-lock-2026-09-13/` contains 32 artboards.
- `Blueprints/specs/design/screen-contracts/` contains 30 contracts; the missing contracts are
  `LedgerDegraded-v1.md` and `LedgerDetailDegraded-v1.md`.
- The 30-count remains stale in `Blueprints/specs/design/screen-journeys-v1.md`,
  `Blueprints/handoffs/2026-09-18-canvas-to-code-journeys.md`, and
  `Blueprints/specs/design/capability-symbols-v1.md`.
- The intended native authority is `Blueprints/specs/mobile/omen-native-design-system-registry-v1.md`,
  with iOS/Android token twins and `_shared.css` as the canvas CSS source.
- A web component scale (`4,8,12,16,24,32,48,64,96`), amended native scale
  (`2,4,6,8,10,12,14,16,20,24,32,40,48,64,96`), and canvas literals (`7,9,11,13`) coexist.
- The canvas README still describes a typography conflict that the registry describes as consolidated.
- `OmenCall-v1.md` contains both `omen-decision-brief.v3` and a stale v2 binding note.
- Existing checks prove CSS parity, token color parity, and screenshot-symbol reachability, but not
  artboard/contract coverage, spacing parity, typography parity, API-version consistency, or state coverage.

## Non-goals for this planning cycle

- No Supabase migration is applied.
- No new package is installed.
- No football-intelligence route is exposed.
- No scoring or publication flag is activated.
- No canvas CSS is rewritten by blind replacement.
- No native screen code is added until the contract foundation is reconciled.

## Staged plan and gates

### Stage A — Authority and architecture gate

**Goal:** establish what each fact is, who owns it, where it lives, and what it is allowed to say.

**Deliverables:**

1. Source matrix for `schedules`, `pbp_participation`, `ftn_charting`, and the initial Tier 1 families:
   URL/release, actual columns, grain, coverage, cadence, license, attribution, and customer-use boundary.
2. Domain ownership map: source fact, canonical fact, feature, model output, evidence, and customer language.
3. Storage ADR separating immutable raw/derived artifacts from compact queryable serving data.
4. Versioning/correction contract with source release, retrieval time, source hash, schema fingerprint,
   derivation version, model version, effective interval, supersession, and stale/partial/disputed states.
5. Identity/crosswalk design for nflverse, GSIS/PFR, provider player IDs, teams, relocations, and coaches.
6. Scope decision: retain both continuous team fingerprint and coach-keyed transfer signal as concepts, but
   ship the bounded coach-keyed transfer signal first.
7. First customer contract: one response shape, evidence/coverage fields, uncertainty language, and no-data
   behavior.

**Gate A:** no schema or route implementation begins until all seven artifacts agree and the founder approves
the storage and first-customer-slice decisions.

### Stage C — Canvas/design-system foundation gate (parallel with A)

**Goal:** make the canvas package mechanically consumable by future canvas-to-code runs.

**Deliverables:**

1. Canonical 32-artboard inventory and corrected 32-count references.
2. `LedgerDegraded-v1.md` and `LedgerDetailDegraded-v1.md`, or an explicit documented exemption if one is
   intentionally chosen.
3. Artboard/contract coverage checker that fails on missing contracts, orphan contracts, duplicate IDs,
   missing artboards, and missing family/journey metadata.
4. Authority table distinguishing web spacing, native spacing, canvas optical exceptions, native color twins,
   web CSS, and legacy/reference-only documents.
5. Token conformance checks for iOS/Android spacing keys, typography roles, rhythm aliases, canvas literals,
   raw colors, and font families.
6. Contract/API version lint, including the OmenCall v2/v3 contradiction.
7. Machine-readable state and interaction requirements for hit targets, Dynamic Type, long content,
   horizontal overflow, unavailable/degraded/empty/partial states, and scroll permissions.
8. Quiet-week straight state decision and contract.

**Gate C:** a future canvas session must be able to prove one-to-one artboard/contract coverage and one
canonical token authority before native screen implementation starts.

### Stage B — Football implementation gate

**Goal:** build the operational intelligence data product against the approved A architecture.

**Implementation order:**

1. Source-artifact registry and receipt persistence.
2. Minimum canonical fact ingestion for schedules, participation, and FTN charting.
3. Identity/crosswalk and team/coach-season dimensions.
4. Feature windows with deterministic denominator and missingness policy.
5. Scheme DNA derivation artifacts.
6. System Signal derivation with explicit association/causality language.
7. Coaching Tree graph with confirmed employment edges separate from inferred influence edges.
8. Compact versioned serving read model.
9. Read-only authenticated API contracts.
10. Idempotent rerun, correction, supersession, and stale/unavailable behavior.

**Required first vertical:**

```text
schedules + pbp_participation + ftn_charting
→ team/coach-season facts
→ Scheme DNA
→ coach-transfer System Signal
→ persisted evidence/read model
→ authenticated API
→ one existing Omen explanation block
```

Keep this separate from the A7B scoring publisher. The scoring pipeline remains a source/verification system,
not the intelligence database.

**Gate B:** no customer route or production schedule until deterministic replay, idempotency, correction,
provenance, authorization/RLS, and degraded-state tests all pass.

### Stage D — Customer integration gate

**Goal:** expose one useful, honest customer interpretation rather than a generic “scheme” label.

**Deliverables:**

- one API-backed decision explanation;
- source coverage and freshness visible in the response;
- confirmed/derived/inferred/unavailable distinctions;
- “what could change this” behavior;
- native and web contract updates;
- nominal, loading, empty, degraded, and unavailable evidence;
- inspected visual and interaction proof.

**Gate D:** the first customer read must be real-data-backed, authenticated, reversible, and able to fail closed
without manufacturing a recommendation.

### Production activation gate

Before calling the football-intelligence backend fully production-ready, require:

- real admitted-source retrieval and rights receipts;
- immutable replayable artifacts;
- schema and row-grain validation;
- deterministic derivation hash on rerun;
- idempotent re-ingestion;
- correction/supersession behavior;
- persisted read model;
- API contract and auth/RLS tests;
- stale/partial/unavailable/disputed response tests;
- freshness/coverage observability;
- retry and alert behavior;
- one production-like customer read;
- serving rollback that disables exposure without deleting evidence.

## Implementation decision

We should proceed in parallel with Stage A and Stage C only. After their outputs are reviewed together, begin
Stage B in a fresh implementation pass. Stage D remains downstream of the real API contract and must not be
mocked into existence from the canvas.

The current evidence supports a deliberate “plan first” posture. The next implementation task is not a route,
SQL migration, or token rewrite; it is to complete and review the Stage A/C authority artifacts and their
mechanical checks.
