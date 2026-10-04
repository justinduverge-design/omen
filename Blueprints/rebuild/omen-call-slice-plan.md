# The Omen-call slice — one path through every layer

> **Partially superseded 2026-10-01: the database sections only.** "Two design flaws", "Schema additions" and the database tickets' table lists are replaced by `Blueprints/rebuild/omen-database-redo-v1.md` (reviewed SQL in `sql/2026-10-01-redo/`). The node-pg-migrate framework this plan names was retired; production's own migration history owns the schema.

**Status:** PROPOSED — founder review. Written 2026-09-30 by Claude Code as project planner at the founder's request.
**Supersedes for sequencing:** the strict gate-by-gate order in `Blueprints/architecture/omen-rebuild-plan-v1.md` (keeps its layers and its safety rules). **Builds on:** `Blueprints/specs/omen-decision-engine-v2.md` (partially superseded 2026-10-04: the factor library and factor-adjusted read, S2/S4/S5, are retired; the API-stability rule still stands).

## Why a slice, not layers

The rebuild plan puts the iPhone at Gate 6, after contracts, database, providers, football data and the decision platform. Five layers of backend before the founder sees a result is how Omen ended up with screens, a database and an engine that were each "verified" and never met. Every layer will still be built, in the same dependency order, but **first for one path only**: a real league, real football data, the engine, the contract, the iPhone screen. When that path works, widening is repetition, not discovery.

**The path:** *Omen call → Omen evidence → Start/Sit detail*, for the founder's own Sleeper league, on iOS.

## Definition of done for the slice

On the founder's iPhone, for the founder's real Sleeper league, in a weekly beta build:

1. The Omen tab shows a start/sit recommendation whose **displayed reasons are exactly the factors that moved the number**, each with its magnitude, source and as-of time.
2. Evidence shows a row per factor, marks any factor Omen could not read, and lists the alternatives it rejected and why.
3. The band is **Confident / Leaning / Coin flip**, set by agreement between independent factors, with its drivers.
4. Each admitted factor has a backtest report; the engine's read is compared with the provider-projection-only pick, on Sleeper's historical projections and on the season's shadow log, and the result is stated whether or not it wins.
5. Every screen state on the path passes a contract test against the real server, and the iOS build was installed and screenshotted on the device.

## Double-check results, 2026-09-30

Every assumption the plan rests on was checked against the repo or the live data source. Results, including the ones that changed the plan:

| Assumption | Result |
|---|---|
| nflverse publishes injuries, depth charts, snap counts and player-week stats for 2026 | **Confirmed.** `injuries_2026`, `depth_charts_2026`, `snap_counts_2026`, `stats_player_week_2026` exist. |
| nflverse has schedule context (kickoff, rest, spread, total) for 2026 | **Confirmed.** The `schedules` release `games.csv` has 272 rows for 2026 with `weekday`, `gametime`, `home_rest`, `away_rest`, `spread_line`, `total_line`. |
| nflverse has historical provider projections | **False for nflverse, but Sleeper serves them.** Sleeper's projections endpoint returns weekly projections back to at least 2018 (about 300 players a week carry a PPR projection), including the underlying stat lines. Checked against Sleeper's own actuals: correlation with actual points 0.49 to 0.69 and mean error 4.5 to 5.4 points (2019, 2023, 2025 samples), which is not what restated projections would look like (near 1.0). **Caveat added after the first experiment:** among players projected at 8+ points only 1.9% did not play (QB 0.1%), lower than real life, so the snapshot probably reflects kickoff-time information and is a stronger baseline than a mid-week pick would have. **So the backtest can compare against a real provider baseline.** Caveats: the endpoint is undocumented, and its as-of timing cannot be proven from the outside, so the forward shadow log stays as the confirmation. |
| Temperature and wind are available before kickoff | **False.** `temp` and `wind` are empty until the game is played; `roof` is blank for some venues (e.g. DAL). The live weather factor must come from a forecast source (OpenWeather is already integrated) and a stadium-roof table, while the backtest can only use observed weather. That difference is a known bias and must be reported, not hidden. |
| A Sleeper roster joins to nflverse stats using ids nflverse already has | **False, and this was the biggest gap in the first draft.** nflverse's `players` table has `gsis_id` and `espn_id` but **no Sleeper or Yahoo id**. Only 34% of fantasy-relevant players are reachable through Sleeper's own `gsis_id`/`espn_id`. Without a crosswalk the slice cannot join a roster to any football data. |
| A crosswalk can be built | **Confirmed, two ways.** (a) The DynastyProcess `db_playerids.csv` maps 99.7% of 572 relevant 2025 players to a Sleeper id, but the repository is **GPL-3.0**; do not ship or commit it. (b) Our own match on normalized name plus birth date (fallback name plus position) between Sleeper's public player dump and nflverse `players` agrees with (a) on **98.8%** of the 572, with 0 ambiguous, 5 unmatched and 2 disagreements that are cases where (a) itself has no Sleeper id. **Decision: build our own crosswalk; use (a) only as a checker on a dev machine, never committed.** |
| The migration CI matches production | **False.** `migrations-ci.yml` runs `supabase/postgres:15.1.1.78`; production is Postgres 17.6. Rehearsals must run on 17. |
| Canonical `players` exists to reference | **False.** `migrations/` holds only the baseline and identity migrations. `players` and `player_provider_ids` are in the Gate 1 blueprint but not built, so S1 must create them first. |
| `rawVault.js` can hold receipts | **Confirmed**, and it enforces a current rights review date (`assertRightsReviewCurrent`); S2 must supply one or the job refuses to run, by design. |

## Provider readiness gate (must pass before the slice is built on a provider)

The engine needs seven things from a provider. A provider is **ready** for the slice only when each is verified live, by someone other than the builder, with the evidence recorded.

| Need | Sleeper | ESPN | Yahoo |
|---|---|---|---|
| Roster, slots, status | **Verified** (public API, adapter) | Capable (adapter, July spike); **not verified today** | Adapter exists; not verified today |
| Matchup and opponent | **Verified** (projections carry `opponent`) | Capable; not verified today | Adapter exists; not verified today |
| League scoring rules | **Exact** (adapter maps 32 of 37 events) | Partial: per-position defense scoring has no canonical form (`known_issues.md`) | **Refused** at the entitlement level (recorded 2026-08-26); scoring stays unknown |
| Current projections | **Verified live** (3,117 rows for week 4, with stat lines) | Capable (`stats[]`, `statSourceId: 1`); not verified today | Not verified |
| Historical projections (baseline) | **Verified back to 2018** | None | None |
| Waiver pool | Derived by subtracting every rostered player; correct only if every roster is read | Capable (E1); not verified today | Not verified |
| Injury and news detail | **Verified live** (`injury_status`, `injury_body_part`, `injury_notes`, `news_updated`) | Capable (`injuryStatus`); not verified today | Not verified |
| **Durability** | Public API, documented request limit; the projections endpoint is undocumented | **Fragile:** unofficial API on user-supplied session cookies that expire; three users hit expired-cookie errors through 2026-09-27; one connection row has no team id | OAuth with a granted entitlement; one connection, last touched 2026-09-17 |

**Verdict today:** Sleeper is ready. ESPN and Yahoo are *capable in code and not verified live*; that is why the slice starts on Sleeper. ESPN becomes ready when: (1) a read-only probe run from production for the founder's own connection passes roster, matchup, projections, waiver pool and injury reads and prints no cookie values; (2) cookie expiry is detected proactively and the user is prompted before the first failed call (the durable fix, currently a product item); (3) the ESPN terms position is recorded by the founder. Yahoo becomes ready when the same probe passes and the scoring-rules refusal has a documented workaround.

## External services readiness (checked 2026-09-30)

Every outside service Omen depends on, found by reading `src/` for hosts and environment variables, then tested from outside where that is possible without credentials. "Verified" means observed working today; "Configured" means production reports the key is set and nothing more.

| Service | Used for | Status | Evidence and what is missing |
|---|---|---|---|
| **Supabase** (Postgres and Auth) | Database, sign-in | **Verified** | `/api/ready` reports reachable; 15 tables; Auth providers enabled: Apple, Google, Discord, email (matches the native apps). Schema drift is the problem, not availability. |
| **Sleeper** | Roster, matchup, scoring, projections, injuries, history | **Verified** | Live projections (3,117 rows, week 4) with stat lines; history to 2018. The projections endpoint is undocumented. |
| **nflverse** (GitHub releases) | Stats, schedule, injuries, depth charts, snaps | **Verified** | 2026 files present; `games.csv` has 272 games for 2026. |
| **ESPN public** (`site.api.espn.com`) | NFL schedule and scoreboard | **Verified** | 16 events, week 4, season 2026. |
| **ESPN private** (`lm-api-reads.fantasy.espn.com`) | Users' ESPN leagues | **Capable, not verified today; fragile** | Cookie-based, expires. See the provider gate above. |
| **Yahoo** (OAuth and fantasy API) | Users' Yahoo leagues | **Configured, not verified** | 1 connection, last touched 2026-09-17; scoring rules refused at the entitlement level. |
| **FantasyFootballCalculator** | ADP | **Verified** | 2026 PPR ADP live, 109 drafts, updated 2026-09-25. |
| **MyFantasyLeague** | ADP fallback | **Verified** | HTTP 200. |
| **OpenWeather** | Game weather | **Configured, not verified** | Key set in production; the endpoint is alive (401 without a key). Whether the production key works is unproven, and it only offers a current forecast: no history, so a backtest cannot use it. |
| **Local LLM** (`gemma3:4b` on the model host) | Narration | **Works, but too slow for the request path** | Reachable over the tailnet. Warm generation of a one-sentence answer took 4.7 to 6.7 seconds; a cold load took 13 seconds. The production narration budget is **1.25 seconds** (`MVP_LATENCY_BUDGET_MS.llm_narration`), so it almost certainly times out and falls back to "unavailable" (the mock response reports `llm_reasoning: unavailable`). |
| **Resend** (email) | Waitlist confirmation | **DNS correct; key not proven** | DKIM record present, sending subdomain MX and SPF point at SES, DMARC present (monitor-only). Whether the API key is valid and the domain shows verified in Resend needs the Resend dashboard. It is used only by the waitlist route, best-effort, and failures are swallowed silently. The daily founder digest is described as "already wired" but the only Resend call in `src/` is the waitlist. |
| **GlitchTip** (error tracking) | Errors | **Verified** | `/api/ready` reports valid DSN on the tailnet. |
| **Upstash Redis** | Roster cache | **Configured, not verified** | Flag only. |
| **Push notifications** (APNs) | Alerts | **Not built** | No sender exists in `src/`. |

**Findings that change the plan**

1. **Narration cannot depend on the local LLM in the request path.** The engine's explanation is generated deterministically from the factor contributions (already the rule). An LLM may polish it asynchronously or be dropped; it may never be required to answer, and it may not add reasons.
2. **Weather should come from Open-Meteo, not OpenWeather.** Open-Meteo needs no key and offers a live forecast, the observed record, and (via its Previous Runs API) **the forecast that was issued N days before a game**, which is what a backtest of a call made days ahead needs. Its "historical forecast" API is *not* that: it is stitched from each model run's initial hours, a short-lead forecast, and using it would leak a later, better forecast into the experiment (caught in code review, PR #495). Coverage of the N-days-before vintage varies by variable and season (wind at 3 days was missing for 2022-2023 in a spot check), so a game whose vintage was not archived is *not read*, never filled from another vintage. **Founder decision (made 2026-09-30):** Open-Meteo's free tier is non-commercial with a daily call limit; recorded, revisit before Omen charges or licenses its API.
3. **Resend is not a dependency of the engine and is low risk.** It stays as is. The claim that a daily digest runs over it should be checked before anything relies on it.

**Services that must pass a bounded live probe before their slice depends on them** (each read-only, prints no secret, run from production with founder approval): ESPN private, Yahoo, OpenWeather key (if kept), Resend key and domain status, Upstash. Sleeper, nflverse, ESPN public, Supabase, FFC and MFL need none.

## Decisions I am making, and why

| # | Decision | Why |
|---|---|---|
| 1 | **Sleeper first, then ESPN, then Yahoo.** | Sleeper's API is public, stable and needs no cookie session. ESPN is the fragile one (cookies expire; three users were force-reconnected on 2026-09-29). Prove the engine on the easiest provider, then port. The engine and contracts are provider-neutral, so this costs nothing later. |
| 2 | **iOS only.** | Founder decision, 2026-09-30 (`Direction/decision_log.md`). |
| 3 | **Compact football data lives in Postgres; raw source files stay immutable artifacts.** | A season of player-week features is roughly a million numbers, which is small. Postgres gives transactional reads, access control and joins with decisions. Raw CSV and parquet stay as receipts outside the serving tables, as the football-intelligence architecture already requires. |
| 4 | **Store the band as issued; do not derive it at read time.** | See "Two design flaws" below. |
| 5 | **Backtest against Sleeper's historical projections, and confirm with a forward shadow log.** | Sleeper serves weekly projections to 2018 (see the double-check table), so the "does Omen beat the provider" question can be answered on history now. The shadow log still starts as early as possible because it is the only proof of as-of timing and it covers ESPN and Yahoo projections, which have no history. |
| 9 | **Weather from Open-Meteo (live forecast, observed, and forecast-at-lead for backtests); narration deterministic from contributions.** | **DECIDED by the founder 2026-09-30** (`Direction/decision_log.md`). Client and stadium table are built and tested: `src/services/weather/openMeteo.js`, `src/data/stadiums.json`. Non-commercial terms recorded; revisit before Omen charges or licenses its API. |
| 8 | **Own the player crosswalk; do not import a GPL file.** | Measured above: our own name-plus-birthdate match reaches 98.8% and unmatched players are held as *unresolved*, never guessed. |
| 6 | **Factor set for the slice:** opponent matchup, game context (roof, wind, temperature), rest and travel, player form and role, injury and depth-chart detail. Scheme and coaching, and primetime history, come after the harness can judge them. | These are the factors whose data is verified available today (nflverse `schedules`, `stats_player`, `injuries`, `depth_charts`, `snap_counts` all publish 2026 files). |
| 7 | **The agent that builds a step does not sign it off.** | The recurring failure. Each step below names an independent check and the evidence that must exist before merge. |

## Two design flaws in the Gate 1 schema blueprint (fix before WO-07 builds it)

`Archive/superseded-db-2026-10-01/gate1/schema-decisions-ledger.md` is being built into migrations by WO-07. Two things in it conflict with the engine and the Ledger:

1. **Band derived at read time.** The blueprint stores `confidence_pct` and derives `CONFIDENT / LEAN / NO_CALL` when reading, with thresholds that "may be tuned". The Ledger is an immutable record of what Omen said and when; if a threshold changes, every past decision would silently change the confidence it displays. The band, its driver list and the engine version must be **written at issue time**. Also, the names must be the shipped ones (`confident / leaning / coin_flip`), and under engine v2 the band comes from factor agreement, not from one number.
2. **No structured place for factors.** `premises` stores a claim as text and a source. The engine needs, per decision and per factor: a signed numeric contribution, a range, a direction, whether it was used, its source and as-of time. Text cannot be aggregated, audited or backtested.

## Schema additions for the slice (small)

Designed here; built and rehearsed on a scratch database, never applied to production without a founder-approved bounded order.

| Table | Purpose | Key columns |
|---|---|---|
| `players`, `player_provider_ids` | **The canonical player and the crosswalk (from the Gate 1 blueprint, football core). Built first; every table below references `players`.** | `players(id omen:player:<slug>, gsis_id, name, position, birth_date, status)`; `player_provider_ids(player_id, provider, provider_player_id, match_method, verified_at)`; unresolved players held in a separate `player_identity_unresolved` list |
| `football_games` | One row per NFL game with the context factors read; source is the nflverse `schedules` release | `game_id` (nflverse), `season`, `week`, `kickoff_at`, `weekday`, `home_team`, `away_team`, `roof`, `surface`, `temp`, `wind`, `home_rest`, `away_rest`, `spread_line`, `total_line`, coaches, QBs, `source_ref` (content hash) |
| `game_weather` | Forecast or observed weather per game, with its source and as-of time | `game_id`, `source` (`forecast`\|`observed`), `temp`, `wind`, `precip`, `roof_resolved`, `as_of` |
| `player_week_features` | Compact per-player-week form and role numbers | `player_id` (canonical), `season`, `week`, `team`, `opponent`, target/air-yards/WOPR/snap share, carries, EPA, `features` jsonb, `source_ref` |
| `defense_position_allowed` | Opponent-versus-position table, derived | `team`, `position`, `season`, `week`, points/yards/EPA allowed, `window`, `source_ref` |
| `decision_factors` | Per-decision factor contributions | `decision_id`, `factor_key`, `family`, `contribution_points`, `range_lo`, `range_hi`, `direction`, `used` boolean, `source`, `source_as_of`, `evidence` jsonb; insert-only |
| `decisions` (change) | Store the band as issued | add `band`, `band_drivers` jsonb, `engine_version`; keep `confidence_score` internal, never sent to native |
| `projection_shadow_log` | Provider projection versus Omen read per player-week | `provider`, `player_id`, `season`, `week`, `provider_projection`, `omen_expected`, `omen_range`, `logged_at`; later joined to actuals |

> **Read first (2026-09-30):** `Direction/2026-09-30-first-factor-experiment.md`. Adding context to the projection did not measurably improve close start/sit calls. S2, S4 and S5 below describe building the factor pipeline; they are **on hold: all eight families were tested and none met the bar** (the harness in S5 now exists as `scripts/research/context-vs-projection/`; see the update at the bottom of that report). S0, D2's band-as-issued fix and the shadow log are unaffected.

## Steps

Each step lists **owner**, **output**, **independent check**, **evidence required before merge**, and **stop conditions**. "Jules builds" (S4 and S5 only) means Jules produces the PR from the written work order; nothing is merged on Jules's word.

### S0 — Freeze the slice contracts *(Claude)* — **IN PROGRESS: `omen-decision-brief.v3` done, others next**

**Done 2026-09-30:** 31 contracts under protection (127 fixtures) (`test/contracts/README.md`): schemas, fixtures recorded from the real route tests or built by the production builders, locks that fail on any removal, retype or loosening, server tests, and iOS tests that decode the same fixtures with the app's own types. It found two user-facing bugs: an expired ESPN connection showed "update the app", and every FAAB/priority waiver league rendered as "not determined" on iOS because the server never sent `budget_text`/`order_text` (now composed server-side). **Still open in S0:** live-mode fixtures and a validated real production response; the states no test reaches (listed in the README); contracts iOS decodes through private code.
- **Output:** JSON Schemas and golden fixtures for `omen-decision-brief.v3`, `start-sit-detail.v2`, `decision-capabilities.v1` (nominal, degraded, no-play, unavailable, partial), generated from `canvas-contract-requirements-v1.json` and the shipped payloads. A contract-test job in CI.
- **Independent check:** the real production route's response for the founder's league validates against the schema (read-only request); the iOS decoder tests decode every fixture.
- **Evidence:** schema files, fixtures, green CI run, the recorded validation of a live response.
- **Stop if:** the live response does not match the shipped contract. Fix the schema to describe reality first, and log the difference; do not "correct" the server.

### S1 — Schema additions and the band fix *(Claude or Codex session — database lane; Jules does not touch it)*
- **Output:** the tables above as migrations under the WO-02 framework, one file per table, with `down` scripts, plus a pgTAP or SQL test proving RLS and the immutability triggers.
- **Independent check:** up, down, up again on a scratch database with a schema diff after each; the suite passes on the migrated schema, not on a stub.
- **Also in S1:** change `migrations-ci.yml` to a Postgres 17 image so rehearsals match production (currently 15).
- **Evidence:** rehearsal log, schema-diff output, RLS test output, and the CI image change.
- **Stop if:** any step needs production credentials, or `down` cannot restore the baseline.
- **Action now:** before WO-07 opens a PR, tell Jules to apply the two flaws above. If a WO-07 PR already exists when this is read, it is **not merged** until it matches.

### S1b — Player crosswalk *(Claude or Codex session — writes database tables, so database lane)*
- **Output:** a job that builds `players` and `player_provider_ids` from Sleeper's public player dump and the nflverse `players` release, matching on normalized name and birth date (fallback name and position). Ambiguous or unmatched players are written to an unresolved list with the reason; **never guessed**. Sleeper's own `espn_id` and `yahoo_id` populate the ESPN and Yahoo mappings.
- **Independent check:** on a dev machine only, compare against the DynastyProcess `db_playerids.csv` (GPL-3.0; do not commit it or its derivatives). Coverage of players with at least one snap in the last season must be at least 98%, with zero known-wrong matches.
- **Evidence:** the coverage report, the unresolved list, and the disagreement list with a reason for each.
- **Stop if:** coverage is below 98%, or any match is wrong.

### S2 — Football data layer *(Claude or Codex session — loads database tables, so database lane)*
- **Output:** a weekly job that downloads nflverse `schedules` (the release `games.csv`), `stats_player` (`stats_player_week_<season>.csv`), `snap_counts`, `injuries`, `depth_charts`; resolves each stats row to a canonical player through the S1b crosswalk (rows for unresolved players are counted and reported, not dropped silently); and writes weather as a separate forecast-or-observed record; stores the raw file with a content hash as an immutable receipt (reuse `src/services/footballData/rawVault.js`); loads the compact tables; records freshness and refuses to serve stale data silently.
- **Independent check:** a run against 2025 data on a scratch database reproduces byte-identical compact tables on a second run; row counts match the source files; a corrupted file is rejected with a named reason.
- **Evidence:** run logs, row-count table, the rejection test.
- **Stop if:** an upstream file changes shape (record it; do not adapt silently).
- **Rights note:** nflverse's repository is CC BY 4.0, but upstream rights for some families (FTN, `nfldata/schedules`) are not closed, and the paid-derived-product question has no maintainer answer (`omen-football-intelligence-architecture-v1.md`). Omen is free, so this does not block the slice; keep attribution and record the position.

### S3 — Sleeper slice and the shadow log *(Claude)*
- **Output:** the Sleeper roster and matchup read emitting the canonical shape; the shadow log writing provider projections and Omen's read each week from the first run.
- **Independent check:** the founder's Sleeper roster reads correctly against the Sleeper app.
- **Evidence:** the diff between Omen's read and the Sleeper app for the same roster.
- **Start the shadow log as early as possible**, before the engine exists, using the provider projection alone. That gives the season-long baseline. It needs `projection_shadow_log` (S1) applied to production, which is a founder-approved bounded order; until then it runs as a local file log from the founder's own league. Getting S1 applied is therefore the first production order to prepare.

### S4 — Factor library v1 *(Jules builds, no database access; Claude designs the interface and reviews)*
- **Output:** one module per factor family returning `{ adjustment, range, confidence, evidence }`, with unit tests using fixed fixtures; a factor with no data returns "not read" with a reason, never a default.
- **Independent check:** golden tests on hand-computed cases; a mutation check (change an input, the output must move in the expected direction).
- **Evidence:** the test suite, and a page per factor stating its data, its formula and its known limits.

### S5 — Backtest harness and reports *(Jules builds from local files, no database access; Claude judges the results)*
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

## Who touches the database (founder decision, 2026-09-30)

**Jules never touches the database.** That means no migrations, no SQL, no schema or table changes, no loaders or jobs that write rows, no database credentials, and no scratch databases of its own. **Muse never does either.** All database work (S1, S1b, S2, and anything after) is done by a **Claude or Codex session** from a ticket in `Direction/current_sprint.md` (lane D), and its production steps still require a founder-approved bounded order.

Jules's remaining work is code that needs no database: **S4** (factor functions over plain objects and fixtures) and **S5** (a backtest harness that reads nflverse files from a local directory). Neither may import a database client.

**Independent check.** The session that builds a migration does not sign it off: Codex's automated PR review (already on this repo) and a second session read it, and the founder merges.

## Rules that bind Jules, Muse and me

1. **Nothing merges on the builder's word.** The independent check for the step must have run, with its evidence attached to the PR.
2. **No production database change** except through a bounded, founder-approved order: exact SQL, a restored-clone rehearsal, stop conditions. WO-06's unapplied migration falls under this and is held until it keeps a reversible copy of what it deletes.
3. **No secrets, no provider credentials** in prompts, logs or fixtures.
4. **Additive-only public contracts** within a version (`omen-decision-engine-v2.md`, "Keeping the API from breaking again").
5. **A factor never ships on plausibility.** It ships on an out-of-sample result.
6. **Say what was not verified.** A PR description lists what was not checked; silence is not a pass.

## Database tickets (Claude or Codex sessions only; never Jules or Muse)

Tracked as `D2`, `D3`, `D4` in `Direction/current_sprint.md`. Each is self-contained: paste it into a fresh Claude Code (or Codex) session in this repo. Rehearse on a **scratch Postgres 17** (a local container), never on production; a production step is a separate founder-approved bounded order.

**T-S1 = D2 (schema)** — **rewritten 2026-10-02; the earlier text (node-pg-migrate under `migrations/`, the Postgres 15 job) described a framework that was retired.** *"Repo: justinduverge-design/omen. The schema is built: `sql/2026-10-01-redo/` holds reviewed steps 01-10, each with `.up.sql`, `.down.sql` and `.test.sql`, designed in `Blueprints/rebuild/omen-database-redo-v1.md`. Do not add node-pg-migrate files or a `migrations/` directory; production's own `supabase_migrations` history owns the schema. Change a step by editing its three files, then prove it with `scripts/db/rehearse-redo.sh` on a scratch Postgres 17 (up → tests → down equals before → up identical, schema and data) and in CI (`redo-rehearsal`). Before any production order, rehearse on a restored backup (`scripts/db/kvm1-restored-clone.sh`, founder-approved) and, for Vault behaviour, on the throwaway Supabase project through the connector (`scripts/db/supabase-rehearsal-helpers.sql`). Never touch production; a production step is a separate founder-approved order. List what you did not verify."*

**T-S1b = D3 (crosswalk)** *"Read `Blueprints/rebuild/omen-call-slice-plan.md`, sections 'Double-check results' and S1b. Build the player crosswalk job: fetch Sleeper's public `https://api.sleeper.app/v1/players/nfl` and the nflverse `players` release; match on normalized name plus birth date, falling back to name plus position; write `players` and `player_provider_ids`; write ambiguous or unmatched players to an unresolved list with the reason; never guess. Do NOT download, commit or embed the DynastyProcess file (GPL-3.0). Report coverage over players with at least one snap in the last season (target at least 98%, zero known-wrong). Scratch Postgres 17 only (a local container); never touch production; do not merge. Say what you did not verify."*

**T-S2 = D4 (data layer)** *"Read `Blueprints/rebuild/omen-call-slice-plan.md` S2 and `src/services/footballData/`. For weather, use the existing `src/services/weather/openMeteo.js` and `src/data/stadiums.json` (already built and tested; do not write another weather client): for past games call it with `leadDays` equal to the lead at which the pick would have been issued (for example 3 for a Sunday game picked on Thursday), never with the short-lead archive, and store the result in `game_weather` with its `kind` and `lead_days`; a vintage that was not archived comes back `lead_time_unavailable` and is stored as not read; a `not_read` result is stored as not read with its reason, never as a default. Build the weekly nflverse job for `schedules`, `stats_player`, `snap_counts`, `injuries`, `depth_charts`. Store each raw file as an immutable content-hashed receipt (reuse `rawVault.js`); load the compact tables from WO-S1; refuse stale or corrupt input with a named reason. Prove: a 2025 run on a scratch database is byte-identical on a second run, row counts match the source, and a corrupted file is rejected. Scratch Postgres 17 only; no production access; do not merge."*

## Work orders for Jules (no database)

Each is self-contained. Paste the order into the Jules task; do not add the plan. **Jules may not import a database client, write SQL or a migration, or ask for database credentials.**

**WO-S4 (factor library) — RETIRED 2026-10-04, do not dispatch; see the banner in `Blueprints/specs/omen-decision-engine-v2.md`:** *"Read `Blueprints/specs/omen-decision-engine-v2.md` and S4. You do not touch the database: no SQL, no migrations, no database client, no credentials. Your functions take plain objects and return plain objects. Implement factor modules for matchup, game context (roof, wind, temperature), rest/travel, player form/role, injury/depth-chart detail. Each returns `{adjustment, range, confidence, evidence}`; no data returns `not_read` with a reason, never a default. Golden tests from hand-computed cases and a mutation test per factor. A doc per factor: data, formula, known limits."*

**WO-S5 (harness):** *"Read S5. You do not touch the database: read nflverse files (and Sleeper historical projections) from a local cache directory that you download into, never a database; no SQL, no migrations, no database client. Build a backtest harness over 2018–2025, out of sample, against a form-only baseline. Must include a planted random-noise factor that shows no improvement, proving the harness can reject. Emit a per-factor report by position. Must reproduce on a second run."*

## Open questions for the founder

1. Ratify this plan and the two design-flaw fixes.
2. The first-beta factor set (my recommendation is decision 6 above).
3. Is the founder's Sleeper league the right test league, or should a second one be added for variety?
4. Who merges: my recommendation is that Claude reviews and the founder merges, and Muse's role reduces to reading and reporting until it has earned merge authority back with evidence.
