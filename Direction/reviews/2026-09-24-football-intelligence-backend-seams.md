# Football intelligence — backend seam audit

**Date:** 2026-09-24
**Status:** Architecture evidence for `FDSI-TUESDAY`; no production, package, SQL, or endpoint change

## Verdict

Do not rebuild the Omen backend and do not add Scheme DNA computation to `src/services/omen.js`.
Build an additive `footballIntelligence/` slice beside the existing scoring-validation pipeline:

```text
footballData/rawVault concepts
  -> footballIntelligence source adapters and normalization
  -> canonical facts and feature windows
  -> Scheme DNA
  -> System Signal and Coaching Tree
  -> versioned read model
  -> existing decision-context/evidence-enrichment seam
```

The request path reads a precomputed read model. It never parses seasons of data, builds
fingerprints, or infers coaching influence live.

## P0 invariants

### Keep intelligence separate from scoring acceptance

`src/services/footballData/rawVault.js` and
`src/services/footballData/scoringAcceptance.js` are deliberately shaped around player/team scoring
facts. Reuse their immutable-manifest, exact-hash, replay, witness, freshness, correction, and
fail-closed ideas. Do not change `omen-football-scoring-acceptance.v1` or make Scheme DNA a scoring
fact.

### Preserve exact rights and provenance per family

The vault already records source identity, rights, URL, retrieval time, content hash, schema
fingerprint, source columns, and parent snapshot. Each new family needs its own record. Do not apply
one generic nflverse licence to FTN-derived charting or participation.

The audit found a standing provenance contradiction to correct separately:
`src/services/matchupService.js` describes nflverse-data as MIT while the reviewed vault contracts
record the relevant data as CC BY 4.0. Code and dataset licences must not be conflated.

### Keep computation off the request path

`src/routes/omen.js` already gives deterministic decisions the critical path and treats enrichment
as bounded/advisory. Scheme computation belongs ahead of the request. Missing or stale read models
return explicit unavailable/pending evidence rather than latency or fabricated inference.

### Separate confirmed and modeled edges

`src/services/decisionContext.js` already separates input state, use, observation/freshness, and
limitations. Coaching Tree uses `confirmed_assignment` and `inferred_system_influence` as distinct
types. A schedule head-coach field cannot silently become coordinator or play-caller history.

## Existing primitives to reuse

- `rawVault.js` — content-addressed writes, conflict detection, cancellable fetch, manifest/schema
  checks, replay receipts, and explicit non-promotion.
- `productionRunner.js` — allowlisted commands, exact SHA inputs, payload-free operational status,
  and batch receipts. Concepts only for Tuesday; no production runner change.
- `stagingShadow.js` — witness match/mismatch/unavailable, freshness/capacity holds, correction
  comparison, and non-promoted failure injection.
- `decisionContext.js` — deduplicated loaders and public evidence receipts without exposing private
  values. Add a future `scheme_intelligence` input instead of a second receipt framework.
- `mvpEvidenceEnrichment.js` — advisory prose may not choose the move or change deterministic
  risk/confidence. This is the later System Signal narration seam.
- `latencyBudget.js` — actual `AbortSignal` and timeout/failure distinction for bounded read-model
  retrieval, not for offline job deadlines.
- `scoringContract.js` — example of provider-neutral enums, version inspection, pure computation,
  explicit coverage, and fail-closed behavior. Mirror the pattern, not the vocabulary.
- `footballData/acceptanceValidator.js` — independent recomputation and hash/schema/cardinality
  checks. Scheme artifacts require a validator independent from producer functions.

## New-slice composition root

The backend currently constructs Supabase clients in approximately 25 modules. Tuesday does not
attempt an app-wide dependency-injection rewrite. The new slice starts constructor-first:

```js
createFootballIntelligenceContext({
  artifactStore,
  readModelRepository,
  sourceRegistry,
  cache,
  http,
  clock,
  logger,
});
```

Pure contracts/models receive data, not process-global clients. No new module-scope service-role
client is permitted in this slice.

## Parsing boundary

CSV parsing exists independently in `rawVault.js`, `scoringAcceptance.js`,
`omen_tuesday_cron.js`, and `matchupService.js`. Do not create a fifth parser.

Tuesday defines a `TabularReader` port and uses bounded fixtures. A later separately approved
`csv-parse` adoption must preserve BOM, CRLF, multiline quotes, duplicate/empty-header rejection,
row-width checks, source-size limits, and schema fingerprints.

## Multi-node stop condition: leases before workers

The existing League Office worker selects queued rows, then later updates one to running without an
atomic status predicate or lease. Two workers can select the same job. That may be tolerable for its
current single-worker operating assumption; it is not a safe template for using more Valor nodes.

Before a football-intelligence workload runs concurrently across nodes, it needs:

```text
queued
  -> running(worker_id, lease_expires_at, attempt)
  -> completed(output_hash)
  -> retryable_failed | terminal_failed
```

Required properties: atomic claim, lease expiry, bounded retry, idempotency key derived from exact
input-manifest hashes plus model version, optional heartbeat for genuinely long jobs, exact-hash
validation before publication, and duplicate-execution-safe publication. Tuesday stays
single-process; it does not fake distributed safety.

## Read-model repository

Routes must not parse raw files. Define storage-independent reads:

```js
getSchemeDna({ entityType, entityId, throughWeek, version })
getSystemSignals({ teamId, throughWeek, version })
getCoachNode({ coachId, throughWeek, version })
```

Tuesday may back this with immutable fixture/artifact JSON. A future approved implementation may use
Supabase or another store without changing callers.

## Debt to contain, not solve now

- `src/services/omen.js` is roughly 2,050 lines; `src/adapters/espn.js` roughly 1,404; several route
  and adapter files are 700–900 lines. Line count is not itself a defect. The rule is to add no
  scheme computation, storage, or product copy to those files.
- Cache behavior is fragmented across Maps, Redis, promise caches, and swallowed errors. Define a
  tiny port for the new slice; do not refactor every cache by Tuesday.
- Network policy varies across raw vault, DvP, provider adapters, and routes. Reuse the hardened
  raw-vault policy for future collection rather than performing a global rewrite now.
- Route composition is module-global. Later integration should add one thin injected read/enrichment
  call, not convert the entire Omen router into a factory during this work.

## Smallest safe module shape

```text
src/services/footballIntelligence/
  contracts.js
  canonicalize.js
  featureWindows.js
  schemeDna.js
  systemSignal.js
  coachingTree.js
  readModel.js
  validateArtifact.js

future, after the pure proof:
  sources/
  normalize/
  repositories/
  pipeline/
  context.js
```

The pure proof earns the larger tree. It does not scaffold unused architecture in advance.
