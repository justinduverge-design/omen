# Football intelligence Stage A inventory

**Date:** 2026-09-25

**Purpose:** Evidence record for the architecture gate. This is an inventory and plan,
not an implementation claim.

**Review update 2026-09-26:** Founder review admitted the layered source strategy and
approved the architecture for local, non-production Stage B implementation. Ordinary
nflverse play-by-play is the timely denominator; FTN charting is coverage-gated tactical
enrichment; participation data is historical calibration only. Production activation
remains **HOLD** until the vendor-neutral immutable-artifact location, retention, backup,
restore, encryption, and access policy is approved and restore-tested. Exact receipts are
in `Blueprints/specs/football-data/omen-football-intelligence-architecture-v1.md` and
`Direction/reviews/2026-09-26-participation-source-admission.md`.

## Current facts

- The existing `src/services/footballData` pipeline is A7B scoring-data infrastructure.
  It captures exact nflverse `stats_player`, `stats_team`, and `schedules` releases,
  validates them, and produces scoring acceptance/correction/recovery evidence.
- `src/services/footballDataFacts.js` is an A7B-to-A6 scoring canonicalization adapter;
  it is not a general football-intelligence fact model.
- The research catalog identifies `pbp_participation`, `ftn_charting`, schedules,
  snap/depth/roster data, and player crosswalks as inputs to a future intelligence
  system. No source publishes a canonical “scheme” label.
- `pbp_participation` from 2023 onward is post-season data, not an in-season feed; no
  2026 asset exists in the reviewed release. It cannot support a current-week slice.
- Current `players.csv` contains GSIS/PFR/PFF/OTC/ESPN/smart IDs, not Yahoo or Sleeper
  IDs. The earlier research statement that one row solved all three fantasy-provider
  crosswalks is disproven by the current header.
- FTN charting/participation carry CC BY-SA 4.0 plus named attribution. The schedules
  upstream repository exposes no license, and nflverse's paid-product licensing question
  remains unanswered. Customer use is blocked pending a rights receipt/legal review.
- The repository has Supabase-backed application tables, but no football-intelligence
  SQL schema, route, read model, or RLS contract.
- The server mounts existing customer routes but no football-intelligence router.
- The production-readiness evaluator is fail-closed and keeps collection, publication,
  and scoring activation as separate approved actions. That evaluator must not be
  mistaken for a completed intelligence ingestion lifecycle.

## Architecture gap statement

The missing work is not merely “wire a route.” The product path is incomplete between
source observations and customer explanation:

```text
admitted source -> canonical fact/dimension -> derived output -> published read model
                -> API state contract -> decision-surface explanation
```

The Stage A architecture document closes the design boundary without claiming that any
of those new components have been implemented.

## Architecture decisions ready for founder review

1. Immutable, content-addressed source/derived artifacts are replay authority;
   Supabase/Postgres is only the compact identity, metadata, publication, and serving
   projection tier.
2. Corrections create superseding versions and never rewrite prior bytes or effective
   intervals. Source, canonical, derivation, and publication versions are independent.
3. Omen internal IDs are canonical. Every external-ID link is an effective-dated,
   sourced assertion; conflicts fail closed. Coach names are aliases, not identities.
4. The first customer slice is a bounded coach-transfer System Signal. It describes
   association/similarity only and carries evidence, coverage, freshness, limitations,
   and `what_could_change_this`.
5. `available` is forbidden until minimum samples, coverage denominators, freshness
   SLA, source rights, and publication state are accepted and satisfied.

## Proposed implementation sequence after approval and source admission

1. Artifact registry and source receipts.
2. Identity/dimension and minimum canonical fact persistence.
3. Feature windows with time-safe joins.
4. Scheme DNA and Coaching Tree derivations.
5. System Signal and evidence bundles.
6. Versioned serving read model.
7. Read-only authenticated API with honest states.
8. One customer decision-surface vertical slice.
9. Operational freshness/correction/rollback gates.

The first slice should remain narrow: a coach-transfer System Signal over a bounded
historical window, with Scheme DNA and Coaching Tree as evidence rather than a broad NFL
scheme classifier.

## Explicit exclusions from this Stage A commit

- No SQL migrations.
- No API route or server wiring.
- No npm dependency.
- No production host, secret, timer, backup, or Supabase mutation.
- No changes to A7B scoring behavior.
- No assertion that a scheme label is an observed source fact.

## Remaining production blocker

The source strategy, provider-neutral identity posture, first coach-transfer signal, and
adaptable v1 evidence thresholds are approved. The sole architecture decision still
blocking production ingestion and activation is the vendor-neutral immutable-artifact
operating policy: location, retention, off-device backup, restore proof, encryption, and
access. Local Stage B must inject its artifact root and must not make a developer laptop,
Supabase Storage, or a specific vendor part of the domain contract.

## Gate result

Stage A is **approved for local/non-production implementation**. The next smallest safe
step is the artifact registry and source-receipt kernel against injected local storage,
with no SQL, route, package, schedule, or production-host change. Production ingestion,
publication, and activation remain prohibited until the artifact/DR decision and restore
proof are complete.
