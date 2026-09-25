# Omen football intelligence architecture v1

**Status:** Stage A proposal — documentation only

**Date:** 2026-09-25

**Scope:** Customer-supporting football intelligence built from nflverse and related
open football data. This document does not activate collection, create SQL, add API
routes, or change the existing A7B scoring pipeline.

## Decision summary

Omen will treat football intelligence as a versioned derived-data product with four
separate layers:

```text
admitted source artifacts
  -> canonical facts and dimensions
  -> versioned derived intelligence
  -> compact customer-serving read model
```

The recommended serving store is Supabase/Postgres because it is already Omen's
operational database and identity boundary. Raw source bytes and replay evidence must
remain immutable artifacts outside the serving tables. This avoids turning Postgres
into a play-by-play warehouse while still giving customer reads indexed, transactional
and access-controlled data.

The first customer slice is a coach-transfer System Signal backed by Scheme DNA and
Coaching Tree evidence. It is an association signal, not a published scheme label and
not a claim of coach causation.

The existing A7B football-data/scoring pipeline remains a separate bounded system. It
continues to grade Omen's own recommendations and must not become the storage or API
contract for football intelligence.

## Non-goals

- A universal NFL scheme taxonomy.
- A claim that a coach caused a team's performance change.
- Loading raw play-by-play into customer-facing tables.
- Replacing A7B scoring reconciliation or its activation gates.
- Exposing a signal when evidence is absent, stale, disputed, or under-covered.
- Adding a new database, queue, vendor, or production timer during Stage A.

## System boundaries

### Source facts

Source facts are observations copied from an admitted release. They retain source
identity, retrieval time, exact bytes/hash, schema fingerprint, license/attribution,
and row-grain metadata. They are never edited in place.

Initial source candidates:

| Source family | Intended grain | Role | Minimum admission requirement |
|---|---|---|---|
| `schedules` / `games.csv` | game | coach/team assignment, game context | coach fields and game identity present |
| `pbp_participation` | play | formation/personnel/tactical context | play/game/team identity and admitted columns present |
| `ftn_charting` | play or charted play | motion, play-action, RPO, pressure/context signals | charting release and coverage recorded |
| `player_stats` | player-week | fantasy-facing outcome/context | source release and player identity present |
| `snap_counts` | player-game/week | role and participation context | player/team/game identity present |
| `depth_charts` / rosters | player-team-date | role and identity context | effective date and team identity present |
| `players` / crosswalk sources | player | provider identity bridge | IDs are retained as source values, not guessed |

The first implementation may admit fewer families than this catalog. A source is not
considered admitted merely because its column names appeared in research; an exact
release, rights record, schema fingerprint, and replay receipt are required.

### Canonical facts

Canonical facts normalize source rows into stable Omen vocabulary without assigning a
scheme label. They must retain the source row key and source artifact hash so every
derived value can be traced back to observations.

Examples:

- `game_fact`: game, season, week, season type, teams, coach references, date;
- `team_assignment_fact`: team, coach, role, effective game/date interval;
- `play_context_fact`: game/play/team, formation/personnel, motion/play-action/RPO
  observations where available;
- `player_role_fact`: player/team/date or week, roster/depth/snap context;
- `player_identity`: provider IDs and confidence/authority metadata.

Canonical facts preserve `unknown`, `not_reported`, `not_covered`, and `conflicted`
as distinct states. They must not coerce missing tactical observations to zero.

### Derived intelligence

Derived outputs are reproducible computations over a declared fact window:

- **Scheme DNA:** a versioned tendency vector, not a categorical scheme name;
- **Coaching Tree:** time-bounded coach/team/role edges, with confirmed and inferred
  relationships separated;
- **System Signal:** a comparison or transfer signal that names the windows, sample,
  similarity method, evidence quality, and limitations.

### Serving read model

The read model contains only the bounded fields needed by customer reads and API
contracts. It references derived artifact/version IDs and evidence summaries. It is
replaceable and rebuildable; it is not the source of truth for raw facts.

## Ownership map

| Object | Classification | Owner | Can be edited? | Customer-visible? |
|---|---|---|---|---|
| Source bytes | source artifact | ingestion/provenance | no; supersede only | no |
| Source manifest | provenance | ingestion/provenance | no | summarized |
| Canonical fact | normalized observation | data foundation | no; new version supersedes | indirectly |
| Feature window | derived intermediate | intelligence derivation | no; recompute/version | no |
| Scheme DNA | derived model output | intelligence derivation | no; recompute/version | summarized |
| Coaching Tree edge | confirmed/inferred model relation | intelligence derivation | no; supersede/version | summarized |
| System Signal | derived interpretation | intelligence derivation | no; recompute/version | yes, bounded |
| Evidence bundle | provenance/explanation | data foundation + derivation | append-only | summarized |
| Serving read row | projection | API/read model | replace by versioned publish | yes |
| Customer explanation | product copy | product/API surface | normal product revision | yes |

## Required metadata on every derived output

Every feature window, Scheme DNA, Coaching Tree edge, and System Signal must carry or
reference:

- `artifact_id` and `artifact_version`;
- `source_artifact_ids` and exact source hashes;
- `source_schema_fingerprint`;
- `fact_window_start` / `fact_window_end` and season/week scope;
- `derivation_version`;
- `model_version` when a model is used;
- `computed_at_utc`;
- `coverage` (games, plays, charted plays, or player-weeks as applicable);
- `quality_state`;
- `confidence` only when its calculation is defined;
- `supersedes_artifact_id` when replacing an accepted version.

`confidence` is not a substitute for coverage. A high-confidence result with a tiny
sample is still a low-coverage result.

## Storage decision

### Immutable artifact tier

Raw downloads, normalized export bundles, manifests, validation receipts, and derived
evidence bundles live as immutable, content-addressed artifacts. The implementation
may use the approved Omen filesystem/object-storage path, but Stage B must document the
exact root and backup policy before activation.

Artifact paths must be bound to hashes and must reject overwrite conflicts. A corrected
source creates a new artifact and a supersession record; it never mutates the prior
bytes.

### Relational tier

Supabase/Postgres is the recommended relational tier for:

- source/artifact metadata;
- dimensions and crosswalks;
- bounded canonical facts needed for reads and joins;
- derived output metadata and evidence summaries;
- serving read rows and publication state.

Raw play-level history should not be copied wholesale into the serving schema. If
volume or query shape later requires a columnar store, that is a separate capacity
decision, not an implicit Stage B dependency.

### Serving rule

No customer route may read a raw file, unversioned “latest” alias, or half-built
derivation directly. A route reads a published serving version whose status is
`published` and whose evidence/version references validate.

## Versioning and correction contract

The minimum state machine is:

```text
captured -> validated -> derived -> candidate -> published
              |            |          |
              +-> quarantined          +-> superseded
```

Required rules:

1. A source release is identified by source, release/asset identity, retrieval time,
   exact hash, byte length, and schema fingerprint.
2. A derivation is identified by source hash set, fact-window key, derivation version,
   and model version.
3. A rerun with identical inputs and versions must produce identical canonical output
   and derivation hash.
4. A source correction creates a candidate that compares against the currently
   published version at the same scope. It lists changed subjects and does not publish
   automatically.
5. A schema drift or incomplete required source quarantines the candidate and leaves
   the prior published version readable with a stale/coverage indicator.
6. “Latest” may be a read-model query ordered over validated published versions, but
   it must resolve to an explicit version in the response and evidence.
7. Rollback changes the serving pointer/status; it does not delete artifacts or rewrite
   history.

## Identity and temporal rules

- Player provider IDs are source values. A crosswalk row records which source asserted
  each ID and when; fuzzy names cannot silently create an identity.
- Coaches require a stable normalized person key plus source display names. An unknown
  or ambiguous coach remains unresolved.
- Coach/team relationships are effective-dated by game/date and role. A coach moving
  teams must produce separate edges; overlapping roles require explicit handling.
- Team identity uses stable canonical team IDs with relocation/name history retained.
- A feature window may not use observations after the decision timestamp. Future games,
  later roster states, or post-event corrections are excluded from historical signals.

## First customer contract (proposal)

The first API should serve a bounded signal rather than a “scheme label.” The proposed
logical response is `football-intelligence-signal.v1`:

```json
{
  "status": "available",
  "signal_type": "coach_transfer_system_signal",
  "subject": {"team_id": "CHI", "season": 2025},
  "summary": "Recent offensive tendencies resemble the coach's prior Detroit window.",
  "scheme_dna": {"version": "scheme-dna.v1", "dimensions": {}},
  "coaching_tree": {"edges": []},
  "evidence": {
    "source_versions": [],
    "games": 0,
    "plays": 0,
    "charted_plays": 0,
    "window": {"start": null, "end": null}
  },
  "quality": {
    "state": "derived",
    "coverage": "sufficient",
    "confidence": null,
    "limitations": []
  },
  "freshness": {"computed_at_utc": null, "stale_after_utc": null},
  "artifact_version": ""
}
```

The exact dimensions and route path remain Stage A approval items. The contract must
also support these honest states without changing shape:

- `unavailable`: no admitted source or derivation;
- `insufficient_coverage`: not enough games/plays/charting;
- `stale`: a prior result exists but source freshness has expired;
- `disputed`: source disagreement or unresolved identity/temporal conflict;
- `pending`: a validated candidate exists but publication has not occurred.

The customer copy must never say “this coach runs scheme X” unless a future, separately
approved taxonomy and evidence standard supports that claim.

## Stage A approval gates

Before SQL, routes, packages, or production wiring:

- [ ] Source matrix has exact releases, rights, row grain, cadence, and admitted columns.
- [ ] Founder approves the first source slice and the name/meaning of Scheme DNA,
      Coaching Tree, and System Signal.
- [ ] Relational-versus-artifact boundary is accepted.
- [ ] Identity and effective-date rules are accepted.
- [ ] Versioning, correction, stale, dispute, and rollback states are accepted.
- [ ] First customer read and response state matrix are accepted.
- [ ] Design-system/canvas contract inventory is complete enough for the customer slice.

Stage B may begin only when all gates above are recorded as approved in a decision log
or follow-up architecture review. A passing unit test cannot substitute for an absent
architecture decision.

