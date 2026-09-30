# The Omen-call slice — one path through every layer

**Status:** PROPOSED — founder review. Written 2026-09-30 by Claude Code as project planner at the founder's request.
**Supersedes for sequencing:** the strict gate-by-gate order in `Blueprints/architecture/omen-rebuild-plan-v1.md` (keeps its layers and its safety rules). **Builds on:** `Blueprints/specs/omen-decision-engine-v2.md`.

## Why a slice, not layers

The rebuild plan puts the iPhone at Gate 6, after contracts, database, providers, football data and the decision platform. Five layers of backend before the founder sees a result is how Omen ended up with screens, a database and an engine that were each "verified" and never met. Every layer will still be built, in the same dependency order, but **first for one path only**: a real league, real football data, the engine, the contract, the iPhone screen. When that path works, widening is repetition, not discovery.

**The path:** *Omen call → Omen evidence → Start/Sit detail*, for the founder's own Sleeper league, on iOS.

## Definition of done for the slice

On the founder's iPhone, for the founder's real Sleeper league, in a weekly beta build:

1. The Omen tab shows a start/sit recommendation whose **displayed reasons are exactly the factors that moved the number**, each with its magnitude, source and as-of time.
2. Evidence shows a row per factor, marks any factor Omen could not read, and lists the alternatives it rejected and why.
3. The band is **Confident / Leaning / Coin flip**, set by agreement between independent factors, with its drivers.
4. Each admitted factor has a backtest report; the engine's read is compared with the provider-projection-only pick over the season's shadow log, and the result is stated whether or not it wins.
5. Every screen state on the path passes a contract test against the real server, and the iOS build was installed and screenshotted on the device.

## Decisions I am making, and why

| # | Decision | Why |
|---|---|---|
| 1 | **Sleeper first, then ESPN, then Yahoo.** | Sleeper's API is public, stable and needs no cookie session. ESPN is the fragile one (cookies expire; three users were force-reconnected on 2026-09-29). Prove the engine on the easiest provider, then port. The engine and contracts are provider-neutral, so this costs nothing later. |
| 2 | **iOS only.** | Founder decision, 2026-09-30 (`Direction/decision_log.md`). |
| 3 | **Compact football data lives in Postgres; raw source files stay immutable artifacts.** | A season of player-week features is roughly a million numbers, which is small. Postgres gives transactional reads, access control and joins with decisions. Raw CSV and parquet stay as receipts outside the serving tables, as the football-intelligence architecture already requires. |
| 4 | **Store the band as issued; do not derive it at read time.** | See "Two design flaws" below. |
| 5 | **Start logging provider projections and Omen's read every week, now.** | Historical provider projections are not in nflverse (verify; I have not found them there). Without them the only honest comparison to "what ESPN already tells you" is a forward shadow log. Every week not logged is a week lost. |
| 6 | **Factor set for the slice:** opponent matchup, game context (roof, wind, temperature), rest and travel, player form and role, injury and depth-chart detail. Scheme and coaching, and primetime history, come after the harness can judge them. | These are the factors whose data is verified available today (nflverse `schedules`, `stats_player`, `injuries`, `depth_charts`, `snap_counts` all publish 2026 files). |
| 7 | **The agent that builds a step does not sign it off.** | The recurring failure. Each step below names an independent check and the evidence that must exist before merge. |

## Two design flaws in the Gate 1 schema blueprint (fix before WO-07 builds it)

`Blueprints/rebuild/gate1/schema-decisions-ledger.md` is being built into migrations by WO-07. Two things in it conflict with the engine and the Ledger:

1. **Band derived at read time.** The blueprint stores `confidence_pct` and derives `CONFIDENT / LEAN / NO_CALL` when reading, with thresholds that "may be tuned". The Ledger is an immutable record of what Omen said and when; if a threshold changes, every past decision would silently change the confidence it displays. The band, its driver list and the engine version must be **written at issue time**. Also, the names must be the shipped ones (`confident / leaning / coin_flip`), and under engine v2 the band comes from factor agreement, not from one number.
2. **No structured place for factors.** `premises` stores a claim as text and a source. The engine needs, per decision and per factor: a signed numeric contribution, a range, a direction, whether it was used, its source and as-of time. Text cannot be aggregated, audited or backtested.

## Schema additions for the slice (small)

Designed here; built and rehearsed on a scratch database, never applied to production without a founder-approved bounded order.

| Table | Purpose | Key columns |
|---|---|---|
| `football_games` | One row per NFL game with the context factors read | `game_id` (nflverse), `season`, `week`, `kickoff_at`, `weekday`, `home_team`, `away_team`, `roof`, `surface`, `temp`, `wind`, `home_rest`, `away_rest`, `spread_line`, `total_line`, coaches, QBs, `source_ref` (content hash) |
| `player_week_features` | Compact per-player-week form and role numbers | `player_id` (canonical), `season`, `week`, `team`, `opponent`, target/air-yards/WOPR/snap share, carries, EPA, `features` jsonb, `source_ref` |
| `defense_position_allowed` | Opponent-versus-position table, derived | `team`, `position`, `season`, `week`, points/yards/EPA allowed, `window`, `source_ref` |
| `decision_factors` | Per-decision factor contributions | `decision_id`, `factor_key`, `family`, `contribution_points`, `range_lo`, `range_hi`, `direction`, `used` boolean, `source`, `source_as_of`, `evidence` jsonb; insert-only |
| `decisions` (change) | Store the band as issued | add `band`, `band_drivers` jsonb, `engine_version`; keep `confidence_score` internal, never sent to native |
| `projection_shadow_log` | Provider projection versus Omen read per player-week | `provider`, `player_id`, `season`, `week`, `provider_projection`, `omen_expected`, `omen_range`, `logged_at`; later joined to actuals |

## Steps

Each step lists **owner**, **output**, **independent check**, **evidence required before merge**, and **stop conditions**. "Jules builds" means Jules produces the PR from the written work order; nothing is merged on Jules's word.

### S0 — Freeze the slice contracts *(Claude)*
- **Output:** JSON Schemas and golden fixtures for `omen-decision-brief.v3`, `start-sit-detail.v2`, `decision-capabilities.v1` (nominal, degraded, no-play, unavailable, partial), generated from `canvas-contract-requirements-v1.json` and the shipped payloads. A contract-test job in CI.
- **Independent check:** the real production route's response for the founder's league validates against the schema (read-only request); the iOS decoder tests decode every fixture.
- **Evidence:** schema files, fixtures, green CI run, the recorded validation of a live response.
- **Stop if:** the live response does not match the shipped contract. Fix the schema to describe reality first, and log the difference; do not "correct" the server.

### S1 — Schema additions and the band fix *(Claude designs the DDL; Jules builds)*
- **Output:** the tables above as migrations under the WO-02 framework, one file per table, with `down` scripts, plus a pgTAP or SQL test proving RLS and the immutability triggers.
- **Independent check:** up, down, up again on a scratch database with a schema diff after each; the suite passes on the migrated schema, not on a stub.
- **Evidence:** rehearsal log, schema-diff output, RLS test output.
- **Stop if:** any step needs production credentials, or `down` cannot restore the baseline.
- **Action now:** before WO-07 opens a PR, tell Jules to apply the two flaws above. If a WO-07 PR already exists when this is read, it is **not merged** until it matches.

### S2 — Football data layer *(Jules builds; Claude reviews)*
- **Output:** a weekly job that downloads nflverse `schedules`, `stats_player`, `snap_counts`, `injuries`, `depth_charts`; stores the raw file with a content hash as an immutable receipt (reuse `src/services/footballData/rawVault.js`); loads the compact tables; records freshness and refuses to serve stale data silently.
- **Independent check:** a run against 2025 data on a scratch database reproduces byte-identical compact tables on a second run; row counts match the source files; a corrupted file is rejected with a named reason.
- **Evidence:** run logs, row-count table, the rejection test.
- **Stop if:** an upstream file changes shape (record it; do not adapt silently).
- **Rights note:** nflverse's repository is CC BY 4.0, but upstream rights for some families (FTN, `nfldata/schedules`) are not closed, and the paid-derived-product question has no maintainer answer (`omen-football-intelligence-architecture-v1.md`). Omen is free, so this does not block the slice; keep attribution and record the position.

### S3 — Sleeper slice and the shadow log *(Claude)*
- **Output:** the Sleeper roster and matchup read emitting the canonical shape; the shadow log writing provider projections and Omen's read each week from the first run.
- **Independent check:** the founder's Sleeper roster reads correctly against the Sleeper app.
- **Evidence:** the diff between Omen's read and the Sleeper app for the same roster.
- **Start the shadow log as early as possible**, before the engine exists, using the provider projection alone. That gives the season-long baseline. It needs `projection_shadow_log` (S1) applied to production, which is a founder-approved bounded order; until then it runs as a local file log from the founder's own league. Getting S1 applied is therefore the first production order to prepare.

### S4 — Factor library v1 *(Jules builds; Claude designs the interface and reviews)*
- **Output:** one module per factor family returning `{ adjustment, range, confidence, evidence }`, with unit tests using fixed fixtures; a factor with no data returns "not read" with a reason, never a default.
- **Independent check:** golden tests on hand-computed cases; a mutation check (change an input, the output must move in the expected direction).
- **Evidence:** the test suite, and a page per factor stating its data, its formula and its known limits.

### S5 — Backtest harness and reports *(Jules builds; Claude judges the results)*
- **Output:** a harness that, for each factor, runs 2018 through 2025 out of sample (train on earlier seasons, test on the next), against a **form-only baseline** (trailing average points). Reports: error with and without the factor, by position, and where it helped or hurt.
- **Independent check:** the harness reproduces on a second machine or run; a planted fake factor (random noise) must show no improvement, proving the harness can say no.
- **Evidence:** report per factor. A factor is admitted only if it improves out-of-sample error; rejected factors are listed with the reason.
- **Decision gate (Claude and the founder):** which factors ship in the first beta.

### S6 — Engine behind the adapter, in shadow *(Claude)*
- **Output:** the engine combines admitted factors into an expectation with per-factor contributions; the adapter maps it to the public contracts; it runs beside the current optimizer on real requests and logs both.
- **Independent check:** the shadow diff, reviewed by the founder and Claude, showing where and why the two picks differ on real weeks.
- **Evidence:** the diff report; no user-facing change yet.

### S7 — Serve and prove on the phone *(Claude)*
- **Output:** the engine serves the founder's account behind a flag; iOS renders the factor rows on OmenCall and Evidence; the contract tests are green in CI.
- **Independent check:** the native device gate in `definition-of-done.md`: built and installed on the founder's iPhone, screenshots from the device, real league, dark, artboard comparison listed element by element.
- **Evidence:** the screenshots and the comparison list.

### S8 — Weekly beta cadence *(founder and Claude)*
- Each week: a build on the phone, the on-device regression checklist run, one thing widened (next screen, then ESPN, then Yahoo), and the shadow-log comparison reported.

## Rules that bind Jules, Muse and me

1. **Nothing merges on the builder's word.** The independent check for the step must have run, with its evidence attached to the PR.
2. **No production database change** except through a bounded, founder-approved order: exact SQL, a restored-clone rehearsal, stop conditions. WO-06's unapplied migration falls under this and is held until it keeps a reversible copy of what it deletes.
3. **No secrets, no provider credentials** in prompts, logs or fixtures.
4. **Additive-only public contracts** within a version (`omen-decision-engine-v2.md`, "Keeping the API from breaking again").
5. **A factor never ships on plausibility.** It ships on an out-of-sample result.
6. **Say what was not verified.** A PR description lists what was not checked; silence is not a pass.

## Ready-to-paste work orders for Jules

Each is self-contained. Paste the order into the Jules task; do not add the plan.

**WO-S1 (schema):** *"Repo: justinduverge-design/omen. Read `Blueprints/rebuild/omen-call-slice-plan.md` sections 'Two design flaws' and 'Schema additions', and `Blueprints/rebuild/gate1/schema-decisions-ledger.md`. Add migrations under `migrations/` (node-pg-migrate, one file per table, with `down`) for `football_games`, `player_week_features`, `defense_position_allowed`, `decision_factors`, `projection_shadow_log`, and change `decisions` to store `band` (`confident|leaning|coin_flip`), `band_drivers` jsonb and `engine_version`, keeping the score internal. RLS on every table; immutability triggers on `decision_factors`. Prove up → down → up on a scratch database with schema diffs and run the full suite on the migrated schema. Never touch production; never merge. In the PR, list what you did not verify."*

**WO-S2 (data layer):** *"Read `Blueprints/rebuild/omen-call-slice-plan.md` S2 and `src/services/footballData/`. Build the weekly nflverse job for `schedules`, `stats_player`, `snap_counts`, `injuries`, `depth_charts`. Store each raw file as an immutable content-hashed receipt (reuse `rawVault.js`); load the compact tables from WO-S1; refuse stale or corrupt input with a named reason. Prove: a 2025 run on a scratch database is byte-identical on a second run, row counts match the source, and a corrupted file is rejected. No production access, no merge."*

**WO-S4 (factor library):** *"Read `Blueprints/specs/omen-decision-engine-v2.md` and S4. Implement factor modules for matchup, game context (roof, wind, temperature), rest/travel, player form/role, injury/depth-chart detail. Each returns `{adjustment, range, confidence, evidence}`; no data returns `not_read` with a reason, never a default. Golden tests from hand-computed cases and a mutation test per factor. A doc per factor: data, formula, known limits."*

**WO-S5 (harness):** *"Read S5. Build a backtest harness over 2018–2025, out of sample, against a form-only baseline. Must include a planted random-noise factor that shows no improvement, proving the harness can reject. Emit a per-factor report by position. Must reproduce on a second run."*

## Open questions for the founder

1. Ratify this plan and the two design-flaw fixes.
2. The first-beta factor set (my recommendation is decision 6 above).
3. Is the founder's Sleeper league the right test league, or should a second one be added for variety?
4. Who merges: my recommendation is that Claude reviews and the founder merges, and Muse's role reduces to reading and reporting until it has earned merge authority back with evidence.
