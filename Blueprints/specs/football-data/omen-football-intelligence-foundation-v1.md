# Omen football-intelligence foundation v1

**Status:** Active Tuesday build contract
**Date:** 2026-09-24
**Authority:** `ATA-20260924-FDSI`
**Deadline:** Tuesday, 2026-09-29
**Product modules:** Scheme DNA, System Signal, Coaching Tree
**Production authority:** none

## 1. Outcome

Build a modular, lightweight, fast, evidence-first football-intelligence foundation that turns
lawfully obtained source facts into three related capabilities:

1. **Scheme DNA** — a versioned numerical fingerprint of demonstrated team or coach tendencies.
2. **System Signal** — an evidence-backed statement about a meaningful tendency, change, or
   similarity and its possible fantasy impact.
3. **Coaching Tree** — a time-aware graph of confirmed coach roles and modeled system influence.

Tuesday's finish line is one runnable, deterministic, non-production vertical proof plus the
contracts needed to extend it. It is not a production backfill, database migration, remote-host
installation, complete scheme taxonomy, or claim that coaching caused every observed outcome.

## 2. Governing sources

- `Direction/football-data-and-schemes-research.md` — nflverse family survey and scheme premise.
- `Direction/facts-of-record.md` — product, provider, privacy, and public-claim constraints.
- `Blueprints/specs/football-data/omen-football-scoring-acceptance-v1.md` — existing scoring-fact
  integrity and provenance patterns.
- `Blueprints/specs/football-data/omen-football-staging-shadow-v1.md` — primary/witness/promotion
  authority separation.
- Valor Ventures — Current-State Infrastructure Capability Map v0.1 (Google Drive).
- Valor Ventures — Infrastructure Architecture Baseline & Target-State Architecture v0.1
  (Google Drive).

The Drive artifacts are compute-placement context, not permission to mutate any node. Omen remains
Deployment #001 of Slops OS. Reusable infrastructure lessons are extracted without turning this
product task into an abstract platform rewrite.

## 3. Design principles

### 3.1 Own judgment; borrow infrastructure

Omen owns football identity contracts, provenance, feature semantics, confidence, Scheme DNA,
System Signal, Coaching Tree inference, and fantasy-facing decisions. Mature third-party libraries
should be preferred for commodity parsing, HTTP policy, schema validation, bounded caches, and graph
algorithms when their licences, maintenance, security, runtime cost, and sovereignty fit are proven.

### 3.2 Observations and inferences are different records

```text
source artifact
  -> observed fact
  -> derived feature/window
  -> modeled inference
  -> product explanation
```

Each layer retains the identifiers and versions needed to reproduce it. A downstream layer never
rewrites an upstream observation. Unknown, unavailable, unsupported, and insufficient-sample states
remain distinct.

### 3.3 Modular monolith, portable workloads

Keep one Omen backend and explicit module boundaries. Do not introduce microservices, Kafka,
Kubernetes, Spark, a graph database, or a distributed scheduler for v1. The feature builder must be
portable to another approved node later without changing its input or output contracts.

### 3.4 Precompute for the serving path

Historical parsing, aggregation, similarity, and candidate generation happen outside the request
path. User-facing routes read compact, versioned projections. No API request trains a model, parses
full-season data, or waits on an LLM to establish a fact.

### 3.5 Deterministic evidence before AI prose

Ollama or another language model may later turn a structured System Signal into natural language.
It may not create the underlying metrics, promote data, convert low confidence into high confidence,
or turn an inferred Coaching Tree edge into confirmed employment history.

### 3.6 Measure before buying or distributing

Use the existing fleet only where the role fits. Benchmark real workloads before buying hardware or
moving compute. Idle CPU is not, by itself, a reason to weaken an independent witness or security
sensor by assigning it unrelated work.

## 4. Functional requirements

### FR1 — Source registry

Every input family declares source, licence/attribution, coverage, cadence, stable keys, required
columns, optional columns, freshness policy, and failure behavior. Schema drift quarantines the
affected family; it never silently removes a feature from a high-confidence fingerprint.

### FR2 — Canonical identity

Canonical game, team, player, and coach identities are independent from any one provider. External
IDs are scoped by namespace and effective window. Alias resolution must be explicit and auditable.

### FR3 — Observed facts

Observed facts carry source artifact hash, source row/play key, season/week/game, subject, value,
availability, and normalization version. They do not contain scheme labels or fantasy advice.

### FR4 — Feature windows

Feature builders aggregate eligible observed facts for an exact team/coach/time window, record the
denominator and exclusions, and distinguish zero observations from an observed zero rate.

### FR5 — Scheme DNA

Scheme DNA produces a versioned feature vector, sample and coverage metadata, confidence ceiling,
and limitations. V1 may describe tendencies and similarity. It may not publish a named football
scheme class unless a separately validated classifier earns that label.

### FR6 — System Signal

A System Signal states what changed or matched, the baseline, effect direction, evidence window,
sample, confidence, affected fantasy subjects when supported, alternative explanations, and
limitations. A signal may be `emerging`, `established`, `reversing`, or `insufficient_data`; those
states must be defined by the model contract rather than generated prose.

### FR7 — Coaching Tree

Coaching Tree stores confirmed role assignments separately from inferred influence edges. Every
inferred edge carries the compared fingerprints, similarity method/version, sample/coverage, and
confidence. Head-coach rows from schedules must not be presented as coordinator or play-caller
history.

### FR8 — Reproducibility

The same ordered or shuffled eligible facts with the same model/config versions produce the same
canonical output and hash. A material model/config change changes the model version or hash.

### FR9 — Historical vertical proof

One real coach/team transition must run through source facts, normalized inputs, feature windows,
Scheme DNA, a System Signal, and Coaching Tree confirmed/inferred edges. The chosen case must be
feasible from lawful public data and clearly label every missing attribution or role fact.

### FR10 — Read projection

The proof emits a compact read model suitable for later Omen API use. It must be useful without
requiring access to the full raw dataset or executing the model on the request path.

## 5. Non-functional requirements

### Performance

- Pure Scheme DNA computation over a prepared bounded fact set: target under 250 ms locally.
- System Signal comparison over prepared fingerprints: target under 50 ms locally.
- Coaching Tree projection for the bounded proof: target under 100 ms locally.
- Future serving read: target under 50 ms excluding network/database latency.
- No Tuesday proof requires more than 512 MiB peak memory; measure rather than assume.

These are design targets, not claims until benchmarked. Production capacity cannot be inferred from
one local run.

### Reliability and integrity

- Idempotent output addressed by input hashes plus normalizer/model versions.
- Fail closed on missing required keys, unsupported schema, non-finite metrics, or conflicting
  confirmed assignments.
- Partial feature families lower coverage/confidence; they do not become zero.
- No promoted output depends solely on LLM text.
- Source correction creates a new artifact that names what it supersedes.

### Security and privacy

- Public football data only in the Tuesday proof.
- No provider credentials, private league payloads, user roster data, or production database reads.
- Logs contain dataset names, hashes, counts, timings, and safe error codes—not source rows that may
  later include private data.
- External libraries receive local fixtures only unless a future reviewed integration says otherwise.

### Cost and operations

- No new recurring service or hardware purchase for v1.
- No production host or timer change for v1.
- Prefer boring files and pure functions for the proof.
- Any package addition requires a separate exact approval after the reuse audit.

## 6. Logical architecture

```text
SourceRegistry
  -> RawArtifact / Manifest
  -> SourceAdapter
  -> CanonicalIdentityResolver
  -> ObservedFactNormalizer
  -> FeatureWindowBuilder
  -> SchemeDNA.compute
  -> SystemSignal.compare
  -> CoachingTree.project
  -> FootballIntelligenceReadModel
```

### Proposed module tree

```text
src/services/footballIntelligence/
  contracts.js
  canonicalize.js
  sourceRegistry.js
  identity.js
  featureWindows.js
  schemeDna.js
  systemSignal.js
  coachingTree.js
  readModel.js

test/footballIntelligenceContracts.test.js
test/footballIntelligenceFeatureWindows.test.js
test/schemeDna.test.js
test/systemSignal.test.js
test/coachingTree.test.js
test/footballIntelligenceVerticalProof.test.js
test/fixtures/football-intelligence/
```

The final tree may narrow after the backend-seam audit. Route code, provider clients, database
clients, and process-global configuration do not belong in the pure model kernel.

## 7. Core contracts

### 7.1 Source artifact reference

```json
{
  "source_family": "pbp_participation",
  "source_season": 2025,
  "artifact_sha256": "...",
  "source_schema_fingerprint": "...",
  "retrieved_at": "...",
  "licence": "CC-BY-SA-4.0",
  "attribution": "FTN Data via nflverse",
  "coverage": { "from": "...", "through": "..." }
}
```

Exact licence and attribution values come from the source registry; the example is not a blanket
statement for all seasons or families.

### 7.2 Observed fact

```json
{
  "contract_version": "football-observed-fact.v1",
  "fact_key": "...",
  "game_id": "...",
  "play_id": "...",
  "team_id": "...",
  "subject_type": "team",
  "subject_id": "...",
  "metric": "offense_motion",
  "value": true,
  "availability": "observed",
  "source": { "artifact_sha256": "...", "row_key": "..." },
  "normalization_version": "football-intelligence-normalization.v1"
}
```

### 7.3 Feature window

```json
{
  "contract_version": "football-feature-window.v1",
  "window_id": "...",
  "subject": { "type": "team", "id": "..." },
  "from": { "season": 2025, "week": 1 },
  "through": { "season": 2025, "week": 4 },
  "eligible_plays": 241,
  "features": {
    "motion_rate": { "value": 0.31, "numerator": 74, "denominator": 241 },
    "play_action_rate": { "value": 0.22, "numerator": 53, "denominator": 241 }
  },
  "coverage": "partial",
  "limitations": []
}
```

### 7.4 Scheme DNA

```json
{
  "contract_version": "scheme-dna.v1",
  "model_version": "scheme-dna-model.v1",
  "subject": { "type": "team", "id": "..." },
  "window_id": "...",
  "features": {},
  "sample": { "eligible_plays": 241, "games": 4 },
  "coverage": "partial",
  "confidence": "medium",
  "limitations": [],
  "input_hash": "...",
  "output_hash": "..."
}
```

### 7.5 System Signal

```json
{
  "contract_version": "system-signal.v1",
  "signal_type": "tendency_similarity",
  "state": "emerging",
  "subject": { "type": "team", "id": "..." },
  "baseline": { "scheme_dna_hash": "..." },
  "comparison": { "scheme_dna_hash": "..." },
  "evidence": [],
  "confidence": "medium",
  "fantasy_implications": [],
  "alternative_explanations": [],
  "limitations": []
}
```

### 7.6 Coaching Tree edge

```json
{
  "contract_version": "coaching-tree-edge.v1",
  "edge_type": "confirmed_assignment",
  "from": { "type": "coach", "id": "..." },
  "to": { "type": "team", "id": "..." },
  "effective_window": {},
  "source": {},
  "confidence": "confirmed"
}
```

An `inferred_system_influence` edge additionally requires model version, compared DNA hashes,
similarity evidence, and a confidence other than `confirmed`.

## 8. Scheme DNA v1 feature boundary

Candidate offensive features, subject to verified columns and coverage:

- offensive personnel distribution;
- offense formation distribution;
- shotgun/under-center/empty rates where observed;
- motion, play-action, RPO, and screen rates;
- early-down and neutral-script pass tendencies from play-by-play;
- target/air-yard distribution by eligible position groups;
- pace/situation features only when their denominators are explicit.

Candidate defensive features:

- defensive personnel distribution;
- defenders-in-box distribution;
- blitzers distribution/rate where charted;
- response by offensive personnel and situation;
- target/efficiency distribution by eligible position group.

V1 excludes named coverage labels, causal claims, player-tracking geometry, proprietary labels, and
any feature whose source or denominator cannot be reproduced. A smaller reliable vector outranks a
larger guessed one.

### Tuesday feature profile

The first proof uses deterministic features that exist across the comparison window: quarterback
location (under center, shotgun, pistol), backfield-count distribution, motion, no-huddle,
play-action, RPO, screen, quarterback-out-of-pocket, box-count, and blitzers/pass-rushers among
eligible opponent dropbacks. `read_thrown` is excluded because its 2022 primary-read values are
structurally missing. Participation-only personnel, formation, man/zone, and coverage-family
features may be used for completed-season fingerprints; 2023+ participation is published only
after postseason and cannot support a live in-season claim.

The neutral-script slice is regular-season plays in quarters 1–3 with absolute score differential
at most 8, excluding kneels, spikes, and no-plays. Every feature publishes numerator, denominator,
missing count, source family, and effective window. Tuesday uses no learned adjustment model.

Tuesday's bounded proof compares scalar rates directly on their natural 0–1 scale and uses
Jensen-Shannon distance for categorical distributions. Fixed weights live in the model contract.
League-season standardization remains a later model-version candidate because the three-cohort
fixture is not a defensible league reference population. The combined 0–1 similarity is a model
score, not a probability, scheme label, or causal estimate.

## 9. Confidence and missingness

Confidence is derived from explicit inputs, not prose tone. V1 must include at least:

- sample sufficiency;
- feature coverage;
- source-family availability;
- window recency;
- comparison stability;
- confirmed assignment availability.

Required states:

- `available` — valid output at the reported confidence;
- `insufficient_data` — valid inputs but inadequate sample/coverage;
- `source_unavailable` — required source was not obtainable;
- `unsupported` — requested feature/relationship is outside the contract;
- `invalid` — integrity or schema failure; no output may be used.

No state is silently collapsed into an empty feature map.

## 10. Compute placement

### Omen Production

Future role: scheduled primary collection, validation, promotion authority, and serving compact read
models. Heavy history rebuilds run off-peak and under measured resource limits. No production change
is part of the Tuesday proof.

### Private AI / backup VPS

Future possible role: bounded offline explanation or analytical batch work. Backup integrity wins
all resource conflicts. AI and backup are separate logical capabilities even while sharing a host.
No Tuesday remote-host change.

### Command Center

Keep independent hash/freshness/schema witness and monitoring duties. Do not assign primary
computation, promotion, or remediation. Its microSD and current service concentration make new
durable workload inappropriate.

### Steward and Sentinel

Keep narrow operational/security witness roles. Do not fill them with unrelated computation.

### Supabase

Candidate future store for compact canonical/derived query projections after an exact schema and SQL
approval. Raw immutable evidence remains file/object oriented. No Tuesday SQL.

### CI/local development

Tuesday proof runs from deterministic fixtures in CI/local tests. GitHub Actions verifies code; it
is not the routine production data processor.

## 11. Reuse audit decision rule

Every candidate receives:

- capability and exact package/repository;
- licence and attribution obligations;
- latest release and maintenance activity;
- known security advisories or dependency surface;
- runtime/platform fit, including ARM where relevant;
- network/telemetry/egress behavior;
- operational and bundle cost;
- fit with current Node/CommonJS code;
- adopt, adapt, observe, or skip verdict;
- what Omen continues to own.

Popularity is evidence of use, not evidence of correctness. No package is added under this contract
without separate founder approval.

## 12. Test strategy

### Unit — many and fast

- canonical ordering and hashing;
- identity namespace behavior;
- per-feature numerator/denominator rules;
- missing versus zero;
- sample and coverage confidence ceilings;
- similarity math and thresholds;
- confirmed versus inferred edge construction;
- read-model projection.

### Integration — bounded fixtures

- source rows to observed facts;
- facts to windows;
- windows to DNA;
- two DNA artifacts to a System Signal;
- assignments plus DNA artifacts to Coaching Tree edges;
- full historical vertical proof.

### Mutation/falsifier cases

- shuffle source rows: output remains exact;
- remove required column: invalid/quarantined;
- remove optional family: coverage lowers and limitation appears;
- duplicate/conflict a confirmed assignment: fail closed;
- shrink sample: signal becomes `insufficient_data`;
- alter model config: output/model hash changes;
- corrupt source hash: proof refuses replay;
- add LLM prose variation: deterministic evidence remains unchanged.

### Broader checks

- focused football-intelligence tests;
- full `npm test`;
- `git diff --check`;
- record-integrity and close-out gates;
- dependency and audit checks only if a separately approved package change occurs.

## 13. Tuesday execution slices

### Slice A — contracts and research

Land this spec, source/reuse audit, selected historical case, fixture provenance, and explicit
exclusions.

### Slice B — pure kernel

Implement canonicalization, hashing, feature windows, Scheme DNA, System Signal, Coaching Tree, and
read projection without I/O or process-global clients.

### Slice C — historical proof

Run the selected Ben Johnson transition through the complete pipeline and commit bounded, lawful
fixtures plus attribution: Detroit 2024 while Johnson was offensive coordinator, Chicago 2024
before his arrival, Chicago 2025 after his appointment as head coach, and Detroit 2025 as an
optional retention/control branch. Official Detroit and Chicago sources establish role edges. The
comparison asks whether Chicago moved toward Detroit's earlier profile; it does not claim Johnson
caused the move. Roster, quarterback, opponent, staff, injury, and play-calling confounding remain
explicit limitations. Inspect output for football plausibility without elevating plausibility into
proof.

### Slice D — review and close-out

Run focused/full checks, architecture and code review, document measured performance and limits,
update decision/skill/done records as appropriate, and leave production/package/SQL/remote-host work
as explicit gated next actions.

## 14. Deliberate exclusions

- production deployment or backfill;
- Supabase schema creation/application;
- new package installation;
- coordinator directory assembled from unlicensed scraping;
- proprietary PFF/Sharp labels or data;
- a universal named-scheme classifier;
- causal claims about coach impact;
- native/web UI;
- an LLM in the evidence path;
- autonomous production remediation;
- new hardware or services.

## 15. Revisit triggers

Revisit the architecture when one of these is measured:

- prepared data no longer fits bounded memory/time targets;
- request-time read latency fails its target;
- the feature builder interferes with production serving or backup windows;
- a second product needs the same kernel;
- graph queries become materially awkward in relational storage;
- source volume or cadence justifies columnar/object-store changes;
- a new lawful source materially expands scheme coverage;
- local AI workloads demonstrate a need for dedicated compute.

Until a trigger fires, prefer the simplest design that preserves the contracts.
