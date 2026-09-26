# Omen football intelligence architecture v1

**Status:** Stage A architecture approved for non-production implementation; production activation remains gated

**Date:** 2026-09-25

**Scope:** Customer-supporting football intelligence built from nflverse and related
open football data. This document does not activate collection, create SQL, add API
routes, or change the existing A7B scoring pipeline.

## Gate verdict

This document fixes the architecture boundary, ownership model, correction contract,
identity design, and logical first-customer contract. The initial architecture review
did **not** admit a source or authorize Stage B; it found two material blockers:

1. `pbp_participation` is not an in-season feed from 2023 onward. nflreadr says those
   FTN-supplied seasons are released only after all postseason games finish. There is no
   2026 asset as of the 2026-09-26 receipt below. It can support historical replay, not a
   current-week System Signal.
2. The repository-level CC BY 4.0 notice does not close upstream rights for all families.
   FTN-specific datasets carry CC BY-SA 4.0 and named attribution; `schedules` points to
   `nflverse/nfldata`, whose repository exposes no license; and nflverse's open licensing
   question for paid derived products has no maintainer answer as of this review.

Founder review on 2026-09-26 accepted the practical source posture and v1 evidence
thresholds. Gate A is therefore approved for a non-production Stage B implementation:
ordinary nflverse play-by-play is the complete, timely denominator; FTN charting is
optional tactical enrichment; participation data is historical calibration only.
Production activation remains blocked on an exact artifact root, off-host backup target,
restore proof, and the normal source receipts for each captured release.

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

### Source/ownership matrix — observed 2026-09-26

The hashes identify the upstream release assets seen during review. Tags such as
`schedules` and `players` are mutable channels, not immutable versions; Stage B must copy
bytes into Omen's artifact tier and verify the captured digest before using them.

| Family / upstream owner | Exact reviewed asset and observed digest | Actual grain and candidate columns | Coverage / cadence | Rights and attribution | Customer-use boundary | Admission |
|---|---|---|---|---|---|---|
| `schedules` / Lee Sharpe `nfldata`, distributed by nflverse | `schedules/games.csv`, updated `2026-09-26T10:06:48Z`, SHA-256 `131f22a980b0d7c5eeebcf1a848bdd67ed3ea544b7be86ae6d1c5a0caf02561e` | one row per game; `game_id`, season/week/date, teams, `away_coach`, `home_coach` | 1999+ per research; mutable asset updates when maintained file changes, so no guaranteed service cadence is asserted | Consume under the distributed nflverse CC BY 4.0 posture; retain nflverse and named-source attribution in receipts and Data Sources credits | Team/game/coach-alias context; never promotes a display string into canonical coach identity | **ADMITTED — founder accepted attribution posture** |
| ordinary nflverse `play_by_play` | current-season play-by-play release, captured by exact asset/hash receipt at ingestion | one row per play; game/play identity, down/distance, play type, participants named by event, results and contextual fields | current season; upstream workflow releases finished games frequently and refreshes recent games for corrections | nflverse CC BY 4.0; credit nflverse in product Data Sources and retained provenance | Complete timely denominator for eligible plays; does not claim full on-field personnel or formation participation | **ADMITTED — primary in-season denominator** |
| `pbp_participation` / NFL NGS through 2022; FTN via nflverse from 2023 | historical example `pbp_participation_2025.csv`, updated `2026-02-10T18:54:08Z`, SHA-256 `59069adfee7b0f464befba8a5e8be331e523633cc6a7ab403d37bcbcdfbe66ac`; no 2026 asset | one row per `nflverse_game_id` + `play_id`; formation/personnel/box fields | 2016+; from 2023 onward published only after postseason completion, not current-week | CC BY-SA 4.0; attribution names `FTN Data via nflverse` from 2023 or `NFL NextGenStats via nflverse` through 2022 | Historical calibration, replay, and model audit only; never represented as current-season evidence | **ADMITTED — historical only** |
| `ftn_charting` / FTN Data via nflverse | `ftn_charting/ftn_charting_2026.csv`, updated `2026-09-26T11:02:01Z`, SHA-256 `0c55b7038ae9d82ab35b128a736d626b189d0cb6b1e022f1d23a0355a9377cf1` | one row per charted play; motion, play-action, screen, RPO, pressure/context fields | 2022+; nflreadr says charted within 48 hours; freshness derives from covered games, not upload time alone | CC BY-SA 4.0; preserve `FTN Data via nflverse` attribution and license identity in provenance and product Data Sources credits | Optional current-week enrichment; every FTN-derived dimension reports measured eligible-play coverage | **ADMITTED — coverage-gated enrichment** |
| `players` / nflverse-players | `players/players.csv`, updated `2026-09-21T14:48:47Z`, SHA-256 `4dd70f328f31b0bb7cbf043412298d5a325863e27b8f2eeea22c9e925c808dee` | one row per `gsis_id`; current header has PFR/PFF/OTC/ESPN/smart IDs, but no Yahoo or Sleeper ID | living crosswalk; observed release has no contractual cadence | upstream repo license is MIT; distributed nflverse-data repo is CC BY 4.0; capture receipt must record applicable terms | Identity evidence only; absent provider IDs and name similarity never become silent matches | **CONDITIONAL — terms receipt and provider gaps** |

Not admitted in the first slice: `player_stats`, `snap_counts`, `depth_charts`, rosters,
injuries, and next-gen statistics. They remain catalog candidates and require their own
grain, cadence, coverage, rights, and attribution review.

Primary evidence:

- [nflverse schedules release](https://github.com/nflverse/nflverse-data/releases/tag/schedules)
- [participation loader and source-specific terms](https://github.com/nflverse/nflreadr/blob/main/R/load_participation.R)
- [FTN loader, cadence, and attribution](https://github.com/nflverse/nflreadr/blob/main/R/load_ftn_charting.R)
- [player loader and identity scope](https://github.com/nflverse/nflreadr/blob/main/R/load_players.R)
- [nflverse-data CC BY 4.0 license](https://github.com/nflverse/nflverse-data/blob/main/LICENSE.md)
- [unanswered commercial-use licensing question](https://github.com/nflverse/nflverse-data/issues/101)

The first implementation may admit fewer families than this catalog. A source is not
considered admitted merely because its column names appeared in research; an exact
release, rights record, schema fingerprint, and replay receipt are required.

The alternative-source review is recorded in
`Direction/reviews/2026-09-26-participation-source-admission.md`. No independent open,
current-season participation feed was found. NFL Big Data Bowl releases are bounded
competition datasets, not a weekly production source. Sportradar and SportsDataIO remain
future paid adapters if Omen later needs official/live depth beyond the admitted stack.

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

An upstream publisher owns the observation; Omen ingestion owns faithful capture; the
data foundation owns normalization and identity; derivation owns reproducible features;
publication owns the accepted serving version; product owns bounded language. No
downstream owner may upgrade authority—for example, turning a schedule display name into
a confirmed coach identity or correlation into causation.

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
evidence bundles live as immutable, content-addressed artifacts. The location,
retention, backup, restore, encryption, and access policy are unresolved and must be
accepted before any production capture, publication, or activation.

For the non-production Stage B slice, the implementation must accept an injected local
artifact root and must not encode KVM1, KVM2, Supabase Storage, S3, R2, or any vendor into
domain code. The production target remains deferred until the founder purchases or
selects reliable storage. `Blueprints/prompts/football-intelligence-artifact-dr-decision.md`
is the restart prompt for that decision.

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

Raw play-level history and full normalized exports must not be copied wholesale into
Supabase. Supabase holds identifiers, receipts, bounded dimensions/crosswalk assertions,
publication metadata, compact evidence summaries, and customer read rows. Every
evidence-derived row points to immutable artifact/hash/version identifiers. If volume or
query shape later requires a columnar store, that is a separate capacity decision.

Supabase is a rebuildable index and serving projection, never byte-level replay
authority. Loss of an artifact makes its dependent candidate unpublishable; loss of a
serving projection is repaired from accepted artifacts. A serving row may not detach
from or outlive its evidence receipt.

### Serving rule

No customer route may read a raw file, unversioned “latest” alias, or half-built
derivation directly. A route reads a published serving version whose status is
`published` and whose evidence/version references validate.

## Versioning and correction contract

The source-artifact state machine is:

```text
captured -> validated -> accepted -> superseded
    |           |
    +--------> quarantined
```

The independently versioned derivation/publication state machine is:

```text
computed -> validated -> candidate -> published -> superseded
    |          |            |
    +-------> quarantined    +-> rejected
```

Required rules:

1. A source receipt records family, upstream owner, release tag, asset name/URL,
   upstream update time, retrieval time, exact SHA-256, byte length, media type, schema
   fingerprint, row count, observed event-time range, rights identifier, attribution
   text, and coverage audit.
2. A canonical export is identified by ordered source hashes, normalization version,
   identity-snapshot version, schema fingerprint, row count, and canonical hash.
3. A derivation is identified by ordered canonical hashes, fact-window key, derivation
   version, model version (or explicit `none`), parameters hash, and code revision.
   Floating dependency versions are forbidden.
4. A rerun with identical inputs and versions must produce identical canonical output
   and derivation hash.
5. A source correction creates a candidate that compares against the currently
   published version at the same scope. It lists changed subjects and does not publish
   automatically.
6. Schema drift, rights change, incomplete source, identity dispute, denominator
   change, or non-deterministic rerun quarantines the candidate and leaves
   the prior published version readable with a stale/coverage indicator.
7. Corrections never rewrite an effective interval. A new version records its
   superseded ID, reason, effective interval, and publication/retraction actor and time.
8. “Latest” may be a read-model query ordered over validated published versions, but
   it must resolve to an explicit version in the response and evidence.
9. Rollback changes the serving pointer/status; it does not delete artifacts or rewrite
   history.
10. Freshness is family- and event-time-based. GitHub upload time alone never proves
    covered games are current. A source without an accepted cadence/SLA remains
    `freshness_unknown`, which cannot satisfy a current-week signal.

## Identity and temporal rules

- Omen canonical IDs are opaque internal IDs, never provider IDs promoted to authority.
- A crosswalk is an effective-dated assertion containing entity type, canonical ID,
  namespace/external ID, asserting artifact/row, validity interval, confidence class,
  review state, and optional superseded assertion. Conflicts are `disputed`, never
  last-write-wins.
- The reviewed nflverse player asset supplies GSIS/PFR/PFF/OTC/ESPN/smart IDs, not Yahoo
  or Sleeper IDs. Those mappings require independent provider assertions. Fuzzy names
  may create a review candidate but never a serving identity.
- Coaches require an internal person ID. Schedule coach strings are aliases, not stable
  IDs. Normalization may group review candidates only; an edge remains unresolved until
  corroborated or manually confirmed with evidence.
- Coach/team relationships are effective-dated by game/date and role. A coach moving
  teams must produce separate edges; overlapping roles require explicit handling.
- Team identity uses a stable franchise ID plus effective-dated season/team aliases.
  Relocation/name history stays separate from provider abbreviations, preserving the
  historical team on each game.
- A feature window may not use observations after the decision timestamp. Future games,
  later roster states, or post-event corrections are excluded from historical signals.

## First customer System Signal contract (logical v1)

The first API should serve a bounded signal rather than a “scheme label.” The proposed
logical response is `football-intelligence-signal.v1`:

```json
{
  "contract_version": "football-intelligence-signal.v1",
  "status": "pending",
  "signal_type": "coach_transfer_system_signal",
  "subject": {"team_id": "CHI", "coach_id": "coach_internal_id", "season": 2025},
  "as_of_utc": "2025-10-07T12:00:00Z",
  "summary": null,
  "interpretation": {
    "direction": null,
    "association_only": true,
    "what_could_change_this": ["Approve the source slice, thresholds, and publication candidate."]
  },
  "scheme_dna": {"contract_version": "scheme-dna.v1", "artifact_id": "", "dimensions": []},
  "coaching_tree": {"contract_version": "coaching-tree.v1", "confirmed_edges": [], "inferred_edges": []},
  "evidence": {
    "source_artifacts": [],
    "games": null,
    "plays": null,
    "charted_plays": null,
    "current_window": {"start": null, "end": null},
    "comparison_window": {"start": null, "end": null},
    "coverage_ratio": null
  },
  "quality": {
    "state": "candidate",
    "coverage": "not_evaluated",
    "confidence": null,
    "limitations": []
  },
  "freshness": {
    "state": "unknown",
    "computed_at_utc": null,
    "latest_observation_at_utc": null,
    "stale_after_utc": null
  },
  "publication": {"artifact_id": "", "artifact_version": "", "published_at_utc": null}
}
```

The route path, formulas, minimum sample/coverage thresholds, and freshness SLA remain
versioned policy rather than hard-coded source behavior. Founder-approved v1 starting
thresholds are: current window at least 4 completed games and 120 eligible offensive
plays; comparison window at least 8 completed games and 250 eligible offensive plays;
and at least 70 percent charting coverage for any FTN-derived dimension. Calibration may
version these thresholds without changing source or identity contracts. The contract supports these
states without changing shape, using `null`/empty fields plus `reason_code` and
limitations where evidence cannot honestly populate a value:

- `unavailable`: no admitted source or derivation;
- `insufficient_coverage`: not enough games/plays/charting;
- `stale`: a prior result exists but source freshness has expired;
- `disputed`: source disagreement or unresolved identity/temporal conflict;
- `pending`: a validated candidate exists but publication has not occurred.

Allowed reason-code families include `source_not_admitted`, `rights_unresolved`,
`freshness_unknown`, `source_stale`, `insufficient_games`, `insufficient_plays`,
`coverage_gap`, `identity_unresolved`, `identity_disputed`,
`derivation_quarantined`, and `not_published`. Customer summary text is templated from
state and evidence. An LLM may rephrase only while preserving semantics and may never
turn an unavailable signal into advice.

The customer copy must never say “this coach runs scheme X” unless a future, separately
approved taxonomy and evidence standard supports that claim.

## Stage A approval gates

Before SQL, routes, packages, or production wiring:

- [x] Founder admits ordinary nflverse play-by-play and schedules, historical-only
      participation, and coverage-gated FTN charting with attribution.
- [x] Founder approves the first coach-transfer slice and the bounded meanings of Scheme
      DNA, Coaching Tree, and System Signal.
- [x] Founder accepts Supabase as compact serving/index tier and immutable artifacts as
      replay authority.
- [x] Identity/effective-date and provider-neutral player/coach namespace rules accepted.
- [x] Versioning, correction, stale, dispute, and rollback states accepted.
- [x] First customer state matrix and adaptable v1 evidence thresholds accepted.
- [x] Design-system/canvas contract inventory is complete for the future customer slice.
- [ ] Production artifact target, retention, off-host backup, restore proof, encryption,
      and access policy. **Deferred; blocks production activation, not local Stage B.**

Stage B may begin only as a local/non-production implementation using injected storage
and deterministic fixtures. Production activation remains prohibited until the deferred
artifact/DR item is accepted and restore-tested. A passing unit test cannot substitute
for that production decision.
