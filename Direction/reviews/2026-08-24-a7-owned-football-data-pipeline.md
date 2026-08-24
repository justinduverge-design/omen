# A7 — Slops-owned football-data pipeline architecture

**Date:** 2026-08-24  
**Status:** research, replay, and architecture only  
**Decision authority:** founder selected an owned pipeline and rejected another paid subscription on 2026-08-22  
**Production effect:** none — no collector, timer, dependency, credential, SQL, migration, provider account, deploy, or feature flag was created or changed

## Executive decision

The lawful automated source set available under the founder's free/no-new-subscription constraint is intentionally narrow:

1. **nflverse-data release assets under CC BY 4.0** for immutable raw inputs, player/game identities, and the publisher's weekly reference totals.
2. **Omen-owned transformations and manifests** for normalization, three-format derivation, replay, provenance, and publication.

No second free source cleared both commercial automation rights and required weekly coverage. Sleeper requires a commercial licence; ESPN's governing terms prohibit commercial use and automated extraction; FantasyPros and SportsDataIO require commercial agreements; BALLDONTLIE is automation-licensed but paid and was explicitly rejected by the founder. None enters the production set by wishful interpretation.

This means “owned” is precise: Slops owns the captured snapshots, identity tables, transformations, quality evidence, replay, and operations. It does **not** mean Slops owns or independently originates NFL events, and it does not make nflverse source loss disappear. On total source loss the correct behavior is to preserve prior evidence, stop publication for new weeks, and alert. An unclear source is never silently substituted.

The recommended operating shape is **KVM1/VPS primary plus Command Center Pi witness**. The VPS performs collection and derivation; the Pi independently fetches and hashes manifests/snapshots and watches freshness. The Pi never becomes the only production writer.

## Scope and non-scope

In scope:

- historical and weekly factual NFL scoring for completed games;
- immutable capture, normalization, standard/half-PPR/PPR derivation, validation, correction, replay, and Tuesday publication;
- offensive players, kickers, and team defense/special teams as separate acceptance classes;
- a future-safe data-product boundary.

Out of scope:

- projections, lineup advice, injury/news ingestion, betting data, or live-game presentation;
- scraping any source without an affirmative automation right;
- deployment or scheduler activation;
- **ADP**. A future ADP corpus may reuse the raw/manifest framework, but it needs its own rights review, schema, source set, quality thresholds, and acceptance evidence. No ADP capability is built or claimed here.

## Source-rights review

Rights were treated as an admission test, not as cleanup. “Publicly reachable” did not count as permission.

| Candidate | Licence / ToS and automation right | Coverage and correction latency | Identifiers | Published limit | Decision |
|---|---|---|---|---|---|
| **nflverse-data** | Repository and database are labelled [CC BY 4.0](https://github.com/nflverse/nflverse-data/blob/main/LICENSE.md), allowing reuse and adaptation with attribution. Use only the needed nflverse-produced release families; do not assume every third-party-derived subfeed inherits a clean upstream right. GitHub permits release access subject to abuse limits. | Player/team stats update nightly after game days; the project recommends a Thursday refresh for NFL stat corrections. Raw PBP is generally available shortly after games; clean PBP/player stats update nightly. See the [official availability schedule](https://nflreadr.nflverse.com/articles/nflverse_data_schedule.html). | `game_id`; GSIS `player_id`; season/week/game type; nflverse player and roster identity releases. | No nflverse-specific request cap is published. Proposed use is a few release downloads per game day, not API polling. | **Admit**, with attribution, provenance, and source-family allowlist. This is the only current automated production source. |
| **Sleeper API / stats host** | Official docs say the API is free only for non-commercial use and direct commercial licensing is required. The documented guidance is under 1,000 calls/minute. See [Sleeper API introduction](https://docs.sleeper.com/). | Technically strong league/player coverage and fast in-week data; the scoring endpoint used in prior research is undocumented, so correction behavior and schema stability have no contract. | Sleeper player and league IDs; cross-provider IDs appear in the player corpus but are not a rights grant. | General guidance: under 1,000/minute. | **Exclude** unless the pending written commercial permission explicitly covers the exact stats endpoints, storage, derived scoring, and automation. |
| **ESPN public/hidden endpoints** | ESPN is governed by Disney's terms. The licence is personal/non-commercial; the restrictions prohibit commercial/business use and automated access, monitoring, copying, extraction, data mining, scraping, and dataset construction. See [Disney/ESPN Terms §2](https://disneytermsofuse.com/english/). | Broad and fast, but the endpoints used by community clients have no supported public scoring contract or correction SLA. | ESPN player/team/game IDs. | No supported public rate limit for these endpoints. | **Exclude.** The terms are prohibitive, not merely unclear. Existing user-authorized league integration is not permission to repurpose ESPN as a league-independent stats warehouse. |
| **BALLDONTLIE NFL** | Its [terms](https://www.balldontlie.io/terms.html) expressly permit commercial fantasy use, caching, storage, archives, derivatives, and automation through official interfaces. They prohibit bypassing tiers/rate limits and disclaim source accuracy/timeliness. | NFL stats and fantasy products are paid-tier features; timeliness is best-effort and corrections may occur without notice. | Vendor numeric player/game/team IDs. | NFL GOAT: 600/minute at $39.99/month; trial is 5/minute. See [NFL API plans](https://nfl.balldontlie.io/). | **Lawful but excluded by founder cost decision.** Best candidate if that decision changes; no account or credential was created. |
| **FantasyPros API** | Free access is non-production; personal paid access is non-commercial. Commercial applications, redistribution, historical/bulk access, and high-volume use require a custom commercial plan. See [FantasyPros API pricing and rights](https://www.fantasypros.com/api-data/). | The `player-points` endpoint covers NFL fantasy points over week ranges, plus player metadata/external IDs. Correction SLA is commercial-contract dependent. | FantasyPros IDs plus advertised external IDs. | Free says “generous daily”; commercial rate and SLA are custom. | **Exclude.** Rights and usable history require a commercial agreement, and pricing is not fixed publicly. |
| **SportsDataIO** | Discovery Lab is for personal/hobby use and is explicitly not licensed for commercial redistribution. Commercial fantasy applications require the sales-gated Leagues API. See [SportsDataIO developer access](https://sportsdata.io/developers). | Discovery data is next-day delayed; Leagues API is real-time with stats, PBP, rosters, injuries, and fantasy data. Historical Vault is separately sales-enabled. | Vendor player/game/team IDs. | Discovery: 100–1,000/day; commercial Leagues API: advertised unlimited, subject to agreement. | **Exclude.** The $99/month self-serve tier does not carry the needed commercial right; the lawful commercial tier is a new paid commitment. |

### Admitted source-family allowlist

Only these nflverse release families are proposed for the scoring pipeline:

- `pbp` / raw PBP: event facts used to produce Slops-derived totals;
- `stats_player`: publisher-produced weekly totals used as a calculation reference and temporary continuity input;
- `stats_team` and kicking summaries: team-defense and kicker acceptance work;
- `schedules`: expected-game completeness and canonical `game_id`;
- `players`, `rosters`, and weekly rosters: GSIS identity and team/position history.

PFR advanced stats, FantasyPros rankings, NGS, FTN charting, injuries, depth charts, and other adjacent nflverse-hosted families are **not admitted** by this memo. They are unnecessary for completed-game scoring and may carry different upstream rights.

## Target architecture

```text
nflverse allowlisted releases
          |
          v
 immutable raw snapshot + SHA-256 manifest ----> Pi witness hash/freshness check
          |
          v
 normalized games / players / teams / aliases
          |
          v
 versioned stat facts (player-game and team-game)
          |
          v
 derived Standard / Half PPR / PPR results
          |
          +----> independent calculation/reference comparison
          |
          v
 quarantined-or-approved weekly publication manifest
          |
          v
 Tuesday scoring reads approved manifest only
```

Every arrow is replayable. Raw bytes are never edited in place. A correction creates a new snapshot and a new derived version linked to the prior version.

## Data contracts

### Raw snapshot manifest

Required fields:

- `snapshot_id`: `<source>.<dataset>.<retrieved_at_utc>.<sha256-prefix>`;
- exact source URL, release/tag/asset identity, HTTP ETag and Last-Modified when supplied;
- retrieval start/end, HTTP status, byte length, SHA-256, content type;
- declared licence, terms URL, rights-review date, attribution string;
- season coverage, source schema fingerprint, and collector version;
- parent snapshot when this is a correction.

### Normalized identity

- Games: canonical key `season + game_id`; preserve old/provider IDs as aliases.
- Players: GSIS ID is canonical when present. Store names as aliases, never as the primary join. Alias rows carry source, validity interval, confidence, and review state.
- Teams/DST: canonical franchise-season identity plus the nflverse abbreviation valid for that date.
- Kicker and team-defense facts are modeled separately from offensive-player facts.
- A recommendation whose target cannot resolve uniquely is quarantined; fuzzy last-name matching is never sufficient for automatic publication.

### Derived result

Key: `(season, season_type, week, subject_type, subject_id, ruleset_version, raw_manifest_hash)`.

For offensive players, `omen-fantasy-v1` follows nflfastR's published calculation:

- Standard = passing yards / 25 + 4 × passing TD − 2 × interceptions + (rushing + receiving yards) / 10 + 6 × (rushing + receiving + special-teams TD) + 2 × two-point conversions − 2 × applicable lost fumbles.
- Half PPR = Standard + 0.5 × receptions.
- PPR = Standard + 1.0 × receptions.

The source implementation is [nflfastR `calculate_stats`](https://github.com/nflverse/nflfastR/blob/master/R/calculate_stats.R). Omen stores the formula as a versioned ruleset; it does not copy a mutable “current” result over old evidence.

Kickers and DST require explicit `omen-kicker-v1` and `omen-dst-v1` rule tables plus fixtures before production acceptance. Until then, those subjects fail closed rather than receiving an offensive-player total or an assumed platform default.

## Exact operating schedule

All wall-clock schedules use `America/New_York`; jobs also record UTC. These are proposed schedules, not enabled timers.

| Time | Job | Purpose |
|---|---|---|
| Daily 05:15 ET, Sep–Feb | allowlisted release capture | Capture a new immutable snapshot only when bytes/hash changed. This follows nflverse's nightly update window. |
| Monday 05:30 ET | Sunday completeness check | Confirm all completed Sunday games are represented; preliminary only, never Tuesday publication. |
| Tuesday 05:15 ET | post-MNF capture | Capture the input intended for that week's grading. |
| Tuesday 05:30 ET | normalize + derive + validate | Build versioned facts and all three scoring formats; quarantine on any hard check. |
| Tuesday 05:45 ET | Pi witness | Independently fetch manifest/current asset, compare byte count and SHA-256, and report freshness. |
| Tuesday 06:00 ET | publication decision | Publish one approved manifest or defer the week. Tuesday scoring may read only the approved manifest. |
| Tuesday 06:15, 06:45, 07:30 ET | bounded retries | Retry only unavailable/unchanged upstream states. Schema, rights, identity, or mismatch failures remain quarantined. |
| Thursday 05:15 ET | correction capture and full replay | Incorporate the NFL's Monday–Wednesday corrections, compare versions, and create correction events. |
| Thursday 06:00 ET | correction decision | Regrade only affected moves, preserving the original result/version and an audit reason. |
| July 15 annually | preseason rights/schema review | Re-open every terms link, licence, source path, field contract, schedule, and attribution before the new season. |

If the Tuesday 07:30 retry still has no approved manifest, the week remains pending and alerts; it never falls back to stale or fabricated stats.

## Storage and retention

Proposed KVM1 root: `/var/lib/omen-football-data` on a dedicated volume, outside the application image.

```text
raw/<source>/<dataset>/<season>/<retrieved_at>-<sha256>.*
manifests/<source>/<dataset>/<season>/<snapshot_id>.json
normalized/<schema_version>/<season>/<manifest_hash>/...
derived/<ruleset_version>/<season>/<week>/<manifest_hash>/...
published/<season>/<week>/<publication_id>.json
quarantine/<reason>/<snapshot_id>.json
```

Retention:

- raw snapshots: seven completed seasons plus current season, compressed, immutable;
- normalized and derived versions: same eight-season window;
- manifests, hashes, attribution, publication records, and correction lineage: indefinite;
- quarantined bytes: 90 days after resolution, but their manifest/failure record remains indefinite;
- transient download/parse workspace: deleted after 24 hours only after its hash is committed to a durable manifest;
- Pi witness: manifests indefinitely, current-season approved snapshot hashes, and the latest two compressed raw snapshots per dataset;
- backup: include manifests/publications in the existing encrypted KVM1→KVM2 Restic flow; the Pi remains the provider-diverse witness, not a credential holder.

The observed 2025 weekly-player CSV is 8,656,387 bytes uncompressed. At the proposed cadence, compressed snapshots and manifests fit comfortably within a single-digit-GB annual budget; a 20 GB alert and 30 GB hard stop are conservative starting thresholds. Measure actual PBP/kicking snapshots before implementation and revise the threshold from evidence.

## Idempotency, correction, and replay

- Content SHA-256 is the raw idempotency key. Re-fetching identical bytes creates a retrieval observation, not another raw object.
- Normalization and derivation are pure functions of manifest hash + schema/ruleset version.
- Publication is compare-and-swap on `(season, week)`: the same derived hash is a no-op; a different hash creates a correction candidate.
- A replay specifies exact manifest hashes. “Latest” is forbidden inside a replay.
- Replays write to a new run directory, compare to the referenced publication, and promote nothing automatically.
- Corrections preserve `supersedes`, changed subject IDs, old/new totals, reason, source retrieval time, and the affected move IDs.
- A software ruleset change never rewrites old results. It creates a new ruleset version and requires a full historical replay before adoption.

## Data-quality gates

Hard-stop checks:

1. licence/terms allowlist matches the fetched source family and review is not older than July 15 of the current season;
2. HTTP success, nonzero bytes, SHA-256, MIME/extension, and schema fingerprint are valid;
3. season, `REG`, week, and expected completed games agree with the schedule snapshot;
4. `(game_id, subject_id)` uniqueness and row cardinality stay within an evidenced band; duplicate/conflicting facts are zero;
5. every scoreable subject has a canonical GSIS/team identity; every recommended target resolves exactly once;
6. impossible values are zero: negative receptions/yards counts where disallowed, malformed IDs, PPR < half-PPR < standard for a positive-reception row, or non-finite totals;
7. exact scoring identities hold: `half − standard = 0.5 × receptions` and `PPR − standard = receptions` within `1e-8`;
8. Slops-derived Standard/PPR totals match the separately published nflverse reference totals within `1e-8` for every offensive row;
9. kicker and DST coverage is complete under their own rulesets before either subject class is publishable;
10. the Pi witness sees the same approved hash. A mismatch is a hard stop; an unavailable witness is an alert and may use a founder-defined one-run exception only after local checks pass.

Warning checks do not silently promote to hard failures without a reviewed threshold change: row-count drift, late upstream publication, alias churn, correction volume, and a source hash changing more than once after Thursday.

## Infrastructure roles

| Shape | Strengths | Failure modes / cost | Verdict |
|---|---|---|---|
| **KVM1 primary + Command Center Pi witness** | Keeps the data job beside Omen's cron and observability; VPS has ~3.8 GB RAM and stable networking; Pi 4 has 4 GB RAM/128 GB storage and is provider-diverse. Independent hash/freshness checks catch Hostinger, disk, and tampering/corruption classes. | Still one production writer; Pi/home outage removes witness but not raw processing. Adds a small native witness job and alert state. | **Recommended.** No Docker workload goes to the 512 MB Steward/Sentinel devices; Command Center is the only suitable Pi. |
| Pi primary + VPS failover | Provider-diverse primary and cheap storage. | Home power/ISP, microSD wear, reboots, and dynamic network become the Tuesday critical path. Failover requires leader election and risks double publication. | Reject for 1.0. The Pi is a witness, not the authoritative writer. |
| VPS only | Simplest implementation and easiest access to the existing cron/logging path. | KVM1 disk/host/provider failure can remove collector and evidence together; KVM1/KVM2 backups remain same-provider. No independent witness. | Acceptable for a local/staging spike only, not the final production shape. |

KVM2 may receive encrypted backup through the existing Restic path but should not become an active collector or failover writer: it is another Hostinger failure domain and already owns the private AI workload.

## Failure and failover behavior

| Failure | Required behavior |
|---|---|
| 404/unpublished release | Retry on the bounded schedule; retain pending moves; emit `source_deferred`, not a scored failure. |
| Timeout/5xx/rate limit | Exponential retry within the Tuesday window; respect `Retry-After`; no source switching outside the allowlist. |
| Schema drift or malformed CSV | Quarantine snapshot, alert with schema fingerprint only, keep last approved week immutable, and require parser/replay review. |
| Rights/terms change | Disable that source before the next fetch. Historical licensed snapshots remain with their recorded terms; no new collection until reviewed. |
| Identity ambiguity | Quarantine the subject/move; do not name-match automatically. Other unambiguous moves may proceed if the publication manifest records exclusions. |
| Derived/reference mismatch | Quarantine the entire week for the affected subject class. Never average or prefer one silently. |
| KVM1 outage | Pi/Steward freshness alert fires. No Pi publication. Recover KVM1, then replay exact snapshots before releasing. |
| Pi witness outage | Alert. Local derivation may complete, but automatic publication waits unless an explicit one-run operator exception is recorded. |
| Witness hash mismatch | Hard stop and preserve both observations. Re-fetch into new temp paths; do not overwrite either snapshot. |
| Total nflverse source loss | Prior weeks remain replayable; new weeks remain pending. Open a rights review for a replacement. Sleeper/ESPN do not become emergency fallbacks. |
| Thursday stat correction | New immutable snapshot and derived version; diff affected subjects; regrade affected moves with old/new evidence preserved. |

## Two-week non-production replay proof

On 2026-08-24, the public 2025 weekly-player release was downloaded to an ephemeral `/tmp` directory only. No repo data artifact, service, database, cache, or provider account was written.

- Source: `stats_player_week_2025.csv` from the nflverse `stats_player` release.
- Bytes: `8,656,387`.
- SHA-256: `e5e0615b3d96a3eaebfaee91e55afb4a4e7fe0caf057454177bcd7d6ad4bcfc2`.
- Replay calculation: a standalone Node/built-in-only script independently applied the published nflfastR formula to component columns, derived Standard/PPR, derived Half PPR as their midpoint, and compared Standard/PPR to the source's reference columns.

| Season/week | REG rows | Standard mismatches | PPR mismatches | Maximum floating delta |
|---|---:|---:|---:|---:|
| 2025 Week 1 | 1,072 | 0 | 0 | `3.55e-15` |
| 2025 Week 17 | 1,063 | 0 | 0 | `7.11e-15` |

Illustrative three-format outputs:

| Week | GSIS ID | Player | Standard | Half PPR | PPR |
|---|---|---|---:|---:|---:|
| 1 | `00-0030279` | Keenan Allen | 12.8 | 16.3 | 19.8 |
| 17 | `00-0030506` | Travis Kelce | 3.6 | 6.1 | 8.6 |

The reference is independent of Omen's calculation code but shares the nflverse publisher and underlying event lineage. It proves deterministic formula/replay correctness; it does **not** prove source-provider independence. The architecture therefore retains source-loss fail-closed behavior instead of overstating redundancy.

## Build and maintenance estimate

| Work | Estimate |
|---|---:|
| Rights allowlist, attribution, manifest contract | 4–6 h |
| Raw capture, content addressing, retention | 8–12 h |
| Game/player/team identity normalization | 10–14 h |
| Offensive, kicker, and DST versioned derivation | 12–18 h |
| Validation, quarantine, correction, and replay | 10–14 h |
| KVM1 runner integration, Pi witness, monitoring, runbook | 12–18 h |
| Staging shadow evidence and two additional replay weeks | 6–10 h |
| **Total build** | **62–92 h** |

Normal in-season maintenance: **0.5–1.0 hour/week** (9–18 hours across 18 regular-season weeks) for freshness, correction, disk, and source-change review. Hold a **12–24 hour incident reserve** for schema/source outages. Season-one total is therefore approximately **83–134 hours**, with expected incremental infrastructure spend of $0 on existing capacity.

## Phased implementation plan

1. **Phase 0 — architecture and evidence (this memo): complete.** Rights matrix, contracts, replay proof, topology, failure policy, and cost exist. No runtime change.
2. **Phase 1 — local raw/manifest spike:** build content-addressed capture and exact-manifest replay behind a non-production command. No timer, secret, database, or production path.
3. **Phase 2 — normalization and scoring acceptance:** GSIS/game identities; offensive formula; kicker/DST rulesets; historical replay across at least four varied weeks; hard quality gates.
4. **Phase 3 — staging shadow:** provision dedicated storage, KVM1 staging runner, Command Center witness, freshness/disk/hash alerts, and a correction drill. Each action needs its own approval.
5. **Phase 4 — production-readiness review:** re-check rights, measure storage/runtime, prove source unavailable/schema drift/hash mismatch/Pi outage/KVM1 recovery, and complete A4's no-write real-row rehearsal.
6. **Phase 5 — founder-gated production:** only after explicit approval, enable collection first; observe one week; separately approve Tuesday publication/scoring. Rollback disables publication and preserves all immutable evidence.

### Future ADP seam

The reusable boundary is a generic `dataset_kind + source + snapshot_manifest + schema_version` raw vault. A future ADP effort can add `dataset_kind=adp` and its own normalization/output tables without changing scoring facts. It must not reuse football-stat rights by implication, and ADP never enters the scoring acceptance suite.

## Acceptance statement

A7's research/architecture deliverable is complete: six sources were evaluated against rights and operational dimensions; the lawful set is named; the end-to-end architecture, schedules, retention, idempotency, replay, quality, topology, failure behavior, estimates, maintenance, and phases are specified; and two historical weeks replayed with zero formula/reference mismatches.

This is **not** permission to build or deploy the pipeline and is not evidence that a source-independent free fallback exists. Those claims would be false.
