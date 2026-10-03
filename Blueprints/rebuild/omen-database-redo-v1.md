# Omen database redo v1 — designed from the screens back

**Status:** PROPOSED — founder approved the plan on 2026-10-01; this design and its SQL are
**review-only**. Nothing here has been applied to production. Codex reviews; the founder merges and
separately approves each production step (facts-of-record #8).
**Sprint item:** `D2-SchemaForSlice` (claimed 2026-10-01). Feeds `D3` (crosswalk job) and `D4` (data job).
**Inputs:**
- `Direction/2026-10-01-league-connections-review.md` (Task A, the findings this fixes)
- the 35 artboards and `Blueprints/specs/design/canvas-contract-requirements-v1.json`
- the 31 protected contracts in `test/contracts/`
- `Blueprints/specs/omen-decision-engine-v2.md`
- `Blueprints/specs/omen-projection-explainer-v1.md`
- `Direction/2026-09-30-first-factor-experiment.md`
- `Blueprints/rebuild/omen-call-slice-plan.md`
- the Gate 1 blueprints (now retired to `Archive/superseded-db-2026-10-01/gate1/`)

**SQL:** `sql/2026-10-01-redo/`. **Rehearsal:** `scripts/db/rehearse-redo.sh`, which also runs in CI
as the `redo-rehearsal` job.

## 1. The rule this design follows

The database holds only what a screen or the Ledger needs that **cannot be read live from the
provider at the moment it is shown**. Everything else is read live, every time, and never copied:
rosters, standings, matchups, the waiver pool and league settings. A copy is a second source of
truth, and copies are what drifted.

What cannot be read live, and so must be stored:

1. **Who the person is and which credentials they gave us.** Sign-in identity, provider
   credentials (as Vault references) and their health.
2. **Which leagues and teams they chose, and which one they are looking at.** The provider lists
   leagues; it does not remember choices.
3. **What Omen said, when, and why.** Providers cannot reproduce it, and the Ledger exists to prove
   it. This is the reason the database exists.
4. **What happened afterwards.** Tuesday scoring results, and what the person says they did.
5. **Provider projections as they were when Omen read them.** Providers overwrite projections, so
   the explainer's breakdown and the shadow log need the as-read copy.
6. **One player identity across providers.** Without it no football data, projection or Ledger player
   joins to anything.

## 2. Screens → data → where it comes from

Every artboard, grouped by journey. "Live" means read from the provider (or a public source) per
request; "DB" names the table; "computed" means server arithmetic on the other two, never stored.

| Screen(s) | Contract(s) | What it shows | Source |
|---|---|---|---|
| **SignIn, EmailCode** | `session.v1` | signed-in state | Supabase Auth (not our tables); `users` row created on first call |
| **ConnectLeague, ConnectFailed** | `platform-provider-state.v1` | per-provider state, recovery action | DB `platform_connections` (+ new `credential_state`) |
| **EspnConnect** | `espn-connect.v1` | cookies accepted, league bound | DB `platform_connections` via `connection_store_espn()`; live validation |
| **CommandNoLeague** | `dashboard-summary.v1` | no league yet | DB `platform_connections`, `league_memberships` |
| **CommandCenter** | `dashboard-summary.v1`, `league-overview.v1`, `waiver-analysis.v1`, `moves-history.v2` | week headline, matchup, waiver watch, Ledger line | live provider (matchup, waiver pool); DB `league_memberships` (which league); DB `decisions` + `decision_outcomes` (Ledger line) |
| **CommandQuiet, CommandQuietStraight** | `quiet-week.v1` | quiet-week line, neutral or straight | computed from live matchup + injuries |
| **SwitchSheet, SwitchLoading** | `league-directory.v1`, `league-active-selection.v1` | every followed league, active one, `follow_persistence`, `selection_persistence` | live discovery + DB `leagues`, `league_memberships` (`is_followed`, `is_active_selection`) |
| **OmenCall, OmenEvidence** | `omen-decision-brief.v3` | the call, band + drivers, risk, evidence rows, what Omen could not read, alternatives | computed live, then **written** to DB `decisions` + `decision_factors` as issued |
| **StartSitClear, StartSitIncomplete** | `start-sit-detail.v1/v2` | both players, projections, why, what could change it | live roster + DB `projection_snapshots` (as-read projection and stat line, for the points-by-source block); league scoring applied in memory |
| **TradeBuild, TradeRoster, TradeNeedsContext, TradeVerdict, TradeBuildThreeTeam, TradePartnerPicker, TradeFindReview** | `trade-capabilities.v1`, `trade-compare.v2`, `trade-find.v1` | rosters, verdict | live rosters (both sides); computed verdict. A verdict Omen *recommends* is a `decisions` row with `call_type = 'trade_suggestion'` |
| **TradeShare** | `trade-share.v1` | 30-day share link | **not Postgres**: `src/routes/trade.js` writes the share snapshot to `tradeShareStore` with a 30-day expiry. No table is needed; the Gate 1 `trade_shares` table is not adopted |
| **LeagueTable, LeagueDegraded, LeagueNoRosters** | `league-overview.v1` | standings, matchup, activity | live provider only |
| **LeagueWaiver, WaiverNoMove, WaiverNotDetermined** | `waiver-analysis.v1` | ranked pickups with their drops | live waiver pool; a pickup Omen *makes the call* on is a `decisions` row with `call_type = 'waiver_pickup'` |
| **Ledger, LedgerDegraded** | `moves-history.v2` | every call, followed or not, outcome, provenance | DB `ledger_current_calls` view + `decision_actions` + `decision_outcomes`, scoped by league |
| **LedgerDetail, LedgerDetailDegraded** | `move-detail.v1` | snapshot as issued, evidence at the time, user action, observed outcome, scoring contract | DB `decisions` (snapshot, scoring contract fields), `decision_factors` (evidence at the time), `decision_actions`, `decision_outcomes` |
| **Account** | `dashboard-summary.v1`, `user-export.v1`, `user-delete.v1` | connected leagues, export, delete | DB everything owned by the user; delete goes through `connection_revoke()` + `ledger_erase_user()` |
| **ReportPill** | `beta-report.v1` | in-app report | DB `beta_reports` (redo step 09; founder yes, 2026-10-01). Missing in production today, so every report fails |

### What each contract's Ledger fields map to

`moves-history.v2` row → table columns:

| Contract field | Column |
|---|---|
| `id` | `decisions.id` |
| `season` | `decisions.season` |
| `week` | `decisions.week` |
| `move_type` | `decisions.call_type` |
| `headline` | `decisions.headline` |
| `issued_at` | `decisions.issued_at` |
| `issued_at_timezone` | `decisions.issued_at_timezone` |
| `followed` | `decision_actions.followed` (no row ⇒ `null`, never "no") |
| `action_provenance` | `decision_actions.provenance` |
| `outcome` | `decision_outcomes.state` + `.result` (no row ⇒ `pending`) |
| `provenance` | `decision_outcomes.provenance` |

`move-detail.v1` adds:

| Contract field | Column |
|---|---|
| `snapshot.recommendation` | `decisions.recommendation` |
| `snapshot.scoring_format` | `decisions.scoring_format` |
| `snapshot.scoring_contract_version` | `decisions.scoring_contract_version` |
| `evidence_at_the_time[]` | `decision_factors` (statement, kind, category = family) |
| `feedback` | `decision_actions.stars` / `.note` |
| `observed_outcome` | `decision_outcomes` |

## 3. Entity list

Every new table has RLS on and **no client policies, and every client privilege is explicitly
revoked**. Production gives every new public table and function full access for `anon` and
`authenticated` by default (verified in production's default privileges, 2026-10-01). Native apps
never query the database directly, and the server uses `service_role`.

### Identity and connections (kept, repaired)

| Table | Purpose | Key | Change in this redo |
|---|---|---|---|
| `users` | one row per person; `id` = Auth id | `id` | FK to `auth.users` (step 01, deletes nothing); `updated_at` added (export reads it) |
| `platform_connections` | the **credential**: one per person per provider, Vault references only | `id`; unique (`user_id`, `platform`) | `credential_state`, `last_verified_at`, `last_failure_code`, `last_failure_at` (step 02); all credential writes and deletes through transactional functions |
| `consent_records`, `deletion_audit_log`, `oauth_state`, `waitlist_signups` | as today | — | client writes revoked on consent (step 07) |

### Leagues (new)

| Table | Purpose | Key | Notes |
|---|---|---|---|
| `leagues` | one row per real provider league per season, **shared** by every Omen user in it | unique (`provider`, `provider_league_id`, `season`) | display data only. **No scoring rules** (A6 rights question open) |
| `league_memberships` | which leagues a person follows, through which connection, with which team; the active selection | PK (`user_id`, `league_id`) | `connection_id` cascade: disconnecting a provider removes its follows in the same transaction. One active selection per person (partial unique index). A trigger refuses a membership through another person's connection or a different provider's league |

Writes go through `league_follows_replace()` (all-or-nothing per provider and season) and
`league_select_active()`. This replaces `league_follows` (never applied) and, once the server moves
over, `platform_connections.is_selected` and its single `league_id`.

### Players (new, empty until D3)

| Table | Purpose | Key |
|---|---|---|
| `players` | one identity per player, `omen:player:<slug>` | `id`; unique `gsis_id` |
| `player_provider_ids` | Sleeper / ESPN / Yahoo / nflverse id → canonical, with how it was matched | PK (`provider`, `provider_player_id`); unique (`player_id`, `provider`) |
| `player_identity_unresolved` | everything the crosswalk could not match with certainty, with the reason | PK (`provider`, `provider_player_id`) |

### The Ledger (new; replaces `moves` for new calls)

| Table | Purpose | Mutability |
|---|---|---|
| `decisions` | one row per issued call: league, team, season, week, call type, band + drivers (or why there is none), risk, headline, the recommendation exactly as served, scoring-contract fields, engine and contract version, issue time | append-only; a re-ask in the same week inserts a new row that **supersedes** the old one, and both are kept. **One call per team per week** (founder, 2026-10-02): the database allows exactly one first call per team-week, and each call can be superseded once, so there is always exactly one current call, even when two requests race |
| `decision_factors` | evidence rows as they stood at issue time: label (Projected / Observed context / Could change this), kind, used, contribution (only if used), range, sample size, source, as-of, reason if not read | append-only |
| `decision_actions` | what the person says they did; provenance explicit | the only mutable Ledger table |
| `decision_outcomes` | Tuesday scoring: state, win/loss, provenance, reconciliation, effectiveness, summary | no row = pending; `data_incomplete` may be completed; `resolved` / `not_executed` are final; "verified" requires exact reconciliation |
| `ledger_current_calls` (view) | the call nothing supersedes, per team per week | — |

Immutability is enforced by triggers because `service_role` bypasses RLS. The only way Ledger rows
are deleted is `ledger_erase_user()`, which account deletion calls. A plain delete of a user who has
Ledger rows **fails** instead of silently erasing history.

### Projections (new)

| Table | Purpose | Mutability |
|---|---|---|
| `projection_snapshots` | provider projection as read: points and the raw **stat line**, scope public or league, content hash of the raw payload | append-only |
| `projection_shadow_log` | provider projection beside Omen's read per player-week (Omen's read null until an engine exists) | append-only; one row per player-week per **league** per engine version. Provider, player, week, league and the provider's number are copied from the cited snapshot, never taken on the writer's word |
| `data_events` | the record of every batch stored in a compartment and every purge or retirement: when, which job, source hash, rights basis, row count, and for deletions the reason and approver | append-only, never deleted |

**Compartments (founder, 2026-10-01).** ESPN's exact projections are kept, "in a compartment where if
it ever comes down to it, we can delete it", and "everything got to be recorded, everything got to be
traceable":
- **One compartment per provider.** Every projection row names the `data_events` batch that wrote it,
  and every batch records the terms it was stored under (`rights_basis`, e.g. `espn_user_connection`).
- **One call removes a provider's compartment.** `projections_purge('espn', reason, approver)` deletes
  that provider's snapshots and shadow rows in one transaction and records a `purge` event with the
  counts and a hash of what was removed. It is the only path that can delete from these tables.

### Retired rows (new, step 08)

| Table | Purpose | Mutability |
|---|---|---|
| `retired_rows` | exact copies of rows a founder-approved retirement deleted, held 30 days so the step can be undone; `retired_rows_purge_due()` then removes them and records it | held copies only; deleted with the person's account |

## 4. Stored versus read live

| Stored (DB) | Read live, never stored |
|---|---|
| identity, credentials (Vault refs), credential health | rosters (all teams), lineups, slots |
| leagues followed, team per league, active selection | standings, matchups, scores |
| every call as issued, its evidence, the person's action, the outcome | waiver pool, transactions, activity |
| provider projections as read (stat line + points) | injuries and news (until a lawful source is chosen) |
| canonical players + crosswalk | weather and schedule (until D4; see §9) |
| shadow log | |
| **league scoring rules** in their own compartment (step 11; founder, 2026-10-02 night, superseding "applied in memory only") | |

**Rosters are deliberately not snapshotted.** The Gate 1 blueprint proposed `roster_snapshots` for
auditability. That stores other managers' rosters, who never signed up for Omen. No screen needs a
historical roster, and the Ledger keeps the evidence it needs in `decision_factors`.

## 5. What happens to today's tables

| Production table | Verdict | When |
|---|---|---|
| `users` | **keep**, repaired (step 01). `platform`, `league_id`, `team_name` retire later (empty in all 7 rows); `email` stays while the server requires it | retire: later step, separate approval |
| `platform_connections` | **keep** as the credential. `league_id`, `espn_team_id`, `is_selected` retire after the server reads `league_memberships`; `espn_swid` (plaintext column, empty, unused) retires | retire: later step |
| `moves` | **frozen, then retired.** The 3 league-scoped rows are copied into the Ledger (step 05). The 6 without a league are **deleted** (founder, 2026-10-01: "we can't solve who it owns"), recorded and held 30 days (step 08) | freeze after the server writes `decisions`; drop only with approval |
| `profiles` | **retire** (0 rows; favourite team feeds team theming, which is postponed by fact #19) | separate approval |
| `consent_records`, `deletion_audit_log`, `oauth_state`, `waitlist_signups` | **keep** | — |
| `league_office_*` (7) | **dropped 2026-10-02.** League Office was retired; the founder approved an outright drop, applied as migration `20261002231212` (`sql/applied/2026-10-02_drop_league_office.sql`). The Gate 1 uniqueness flag is moot. Do not restore | done |
| *(never applied)* `league_follows` | **superseded** by `league_memberships` | — |
| *(never applied)* `beta_reports` | **apply** as redo step 09 (founder yes, 2026-10-01): server-only, 30-day purge recorded in `data_events` | through the verification sequence |
| *(never applied)* `football_intelligence_signals` | **wait**: scheme feature is paused | later |

**Repo files that no longer describe anything real.** Retired 2026-10-01 with founder approval
(moved to `Archive/superseded-db-2026-10-01/` with a manifest, so old citations still resolve). Applied
SQL records moved to `sql/applied/`; reviewed-but-undecided files to `sql/pending/`:

- `Archive/superseded-db-2026-10-01/migrations/1790680789307_baseline.js` and `Archive/superseded-db-2026-10-01/migrations/1790735188136_identity-unification.js`
  (WO-06): not production, and WO-06 is replaced by step 01.
- `Archive/superseded-db-2026-10-01/sql/omen_rls_security.sql`, which says "idempotent" but stops with an error if re-run; production
  history now lives in `supabase_migrations`.
- `Archive/superseded-db-2026-10-01/sql/2026-09-03_multi_league_follows_review.sql`
- The Gate 1 `decisions` / `premises` / `user_actions` / `ledger_entries` designs in
  `Archive/superseded-db-2026-10-01/gate1/schema-decisions-ledger.md`.
- The `league_scoring_*` and `roster_*` tables in `schema-football-core.md`, and the rest of the Gate 1
  schema set (`schema-blueprint.md`, `schema-identity-access.md`), which this design replaces.
- `Archive/superseded-db-2026-10-01/test/migrationIdentity.test.js`, the `test-migrations` CI job and the `migrate` npm script, which
  existed only to run the files above.

## 6. Confidence: `NO_CALL` versus `coin_flip`, and number versus band

- **Names.** The band is `confident | leaning | coin_flip`: the shipped names in
  `omen-decision-brief.v3`, the visual lock and C1. `NO_CALL` (Gate 1) is **not a band**.
  - A week with no call has **no `decisions` row**.
  - A call issued without a band (the contract allows an empty band with `unavailable_reason`)
    stores `band = null` and `band_unavailable_reason`.
  - The database rejects any fourth band name.
- **Stored as issued, not derived on read.** Gate 1 (2026-09-29) stores a 0-100 number and derives
  the band at read time, with thresholds still "to be confirmed". The slice plan (2026-09-30) found
  two problems with that:
  - If a threshold changes, every past call silently changes the confidence the Ledger shows.
  - Under engine v2 the band comes from **agreement between factors**, not from one number.

  This design stores **both**: the band and its drivers as issued (served), and `internal_score`
  (never served, kept for audit and backtests). That satisfies the Gate 1 lock's "the raw number is
  stored" without letting the Ledger rewrite history. **Confirmed by the founder 2026-10-01.**

## 7. Migration plan — small steps, each reversible

Every step is one transaction with:
- a preflight that aborts on unexpected state;
- an explicit client-privilege revoke;
- a `.down.sql` that restores the exact pre-step schema **and data** (proven by fingerprint);
- a `.test.sql`.

Order of application in production. Each step is its own founder-approved order: approval →
restored-clone rehearsal (the 2026-09-30 method) → verification → production.

| # | Step | Risk | Rollback | Rollback is lossless until… |
|---|---|---|---|---|
| 07 | Close client writes (independent; can go first) | low | re-grant | always |
| 01 | Identity link + `users.updated_at` | low: FK `NOT VALID` then `VALIDATE`; deletes nothing; aborts if any orphan exists | drop FK + column | always |
| 02 | Credential health + transactional credential functions | low: additive | drop functions + columns | the server starts writing health (health history lost; credentials untouched) |
| 03 | Leagues + memberships + backfill (10 connections → 10 memberships) | low: additive, `platform_connections` untouched | drop tables | the server writes follows (export first) |
| 04 | Players + crosswalk tables (empty) | none | drop tables | always (the D3 job is deterministic) |
| 05 | Ledger + backfill (3 scoped moves copied; `moves` untouched) | medium: new write path | drop tables | **the server writes its first call here**; after that, export before rollback |
| 06 | Projection snapshots + shadow log + `data_events` + provider purge | low | drop tables | the first logged week (cannot be re-created) |
| 11 | `league_scoring_rules`: each league's scoring rules in a deletable compartment, kept for grading and advice; `scoring_rules_purge()`; backfill from league-scoped `moves.scoring_contract` (founder, 2026-10-02 night) | low: additive, `moves` untouched | drop table (a `retire` record is kept) | the server writes its own rule sets (export first) |
| 12 | `saved_trades` (T4): one row per saved trade, keyed on (user, provider, league, season, week, candidate); the trade stored with it; reasoning and trade fixed at first save; saved → sent → self-reported outcome; owner read, server writes; cascades from `users`, exported | low: additive, empty | drop table | the first saved trade (export first) |
| 09 | `beta_reports` for the Report button, with a recorded 30-day purge | low: additive | drop table | the first saved report |
| 10 | `account_erase()`: the whole account in one transaction (secrets, connections, Ledger, moves, consent, OAuth state; reports and held rows cascade), audit row written | low: additive function | drop function | always |
| 08 | Delete the 6 unscoped `moves` rows: aborts unless exactly 6; recorded; held 30 days | medium: deletes data, by founder decision | restore from the held copies | 30 days, then the copies are purged by design |
| later | Freeze `moves`; drop retired columns and tables | destructive | from export only | each needs its own approval |

**The database alone does not fix the phone.** The server must move to these tables. Each move is
its own code ticket, and none is part of this PR:

1. **Ledger write path.** `POST /api/omen/mvp-move` inserts into `decisions` + `decision_factors`
   (re-ask ⇒ supersede) instead of upserting `moves`. Feedback writes `decision_actions`.
2. **Ledger read path.** `GET /api/moves` and the detail route read `ledger_current_calls` + children,
   with no more tolerant column retries.
3. **Tuesday scoring.** It writes `decision_outcomes`. This is the fix for finding 2; scoring cannot be
   re-enabled before it.
4. **Follows and selection.** They call `league_follows_replace()` / `league_select_active()`, and
   `follow_persistence` becomes `"explicit"`.
5. **Connect, disconnect, Yahoo refresh and account deletion.** Connect, disconnect and Yahoo refresh call
   `connection_*()`. Account deletion calls `account_erase()` (step 10), one transaction, then deletes
   the Auth account.
6. **Scoring rules.** Whatever writes a call's scoring contract also writes the rule set into
   `league_scoring_rules` (with its `scoring_rules:<provider>` ingest) when the hash is new. Calls keep version and hash only.
7. **Saved trades (T4, #519).** `/api/trade/find` issues a batch token per response, folds it into each
   candidate id, and keeps the batch's candidates per user for 15 minutes (Redis). `POST /api/trade/saved`
   looks the id up in the caller's own batches and inserts one `saved_trades` row with the full trade; an
   expired or unknown id returns an error the app turns into "refresh the search". The export reads the table.
8. **Export.** Drop the nonexistent `moves.feature` / `moves.updated_at` from the select (a code bug,
   not a schema gap).
9. **Startup schema check.** Expected objects versus `information_schema`; `/api/ready` degraded on
   drift (finding 11).

## 8. First slice versus later

**Needed for the first thin Omen call** (founder's Sleeper league, iOS):
- steps 01–03 (identity, credentials, leagues)
- step 05 (the Ledger, so the call is recorded and Tuesday can score it)
- step 06 (projection snapshot for the explainer's points-by-source; shadow log from week one)
- step 04 (empty players; the call can be issued before the crosswalk fills it, because `player_id`
  columns are nullable)
- step 07

**Can wait:**
- **Game context.** `football_games`, `game_weather` (Open-Meteo via
  `src/services/weather/openMeteo.js`, stored with `kind` and `lead_days`, a missed vintage stored as
  not read), and `player_week_usage` (role, explainer layer 2).
- **Matchup.** `defense_position_allowed` (explainer layer 3).
- **Outcomes for the shadow log.** `player_week_actuals` (to score the shadow log against reality).

These are D4. After the factor experiment they serve **labelled observation only**, never a
projection adjustment, so they are not on the critical path for the first call. Their shape is in the
slice plan's table, with one change: every context row carries a `sample_size`, because the
explainer may not show a statistic without one.

## 9. Verification (what was run)

- **Snapshot equals production.** `catalog.js compare-production`: columns, constraints, indexes,
  policies and ACLs are identical to the read-only production catalog read of 2026-10-01.
- **Every step round-trips.** On scratch Postgres 17.11 (production 17.6), each step goes up → tests
  → down, and the down state equals the pre-step state in schema **and** data (every original table's
  contents hashed over production's columns, plus Vault). Up again is identical. A full reverse
  teardown returns to the production snapshot. Script: `scripts/db/rehearse-redo.sh`.
- **The harness can fail.** Ten deliberate faults were each caught by the guard meant to catch them:
  1. a Ledger call can be rewritten;
  2. client access is left open on a new table;
  3. an undo step leaves a column behind;
  4. an orphan user exists (step 01 refuses instead of deleting);
  5. the snapshot drifts from production;
  6. an undo step rewrites data;
  7. a band is stored without drivers;
  8. a 7th unscoped row exists (step 08 refuses: only 6 were approved);
  9. step 08's undo restores only some rows;
  10. a projection can be deleted outside the purge.

  The unmodified copy passes.
- **Production logging cannot capture secrets** (read-only settings check, 2026-10-01). `pgaudit.log`
  is `none` and `log_statement` is `ddl`, so function calls are not logged. Bound parameters are not
  logged even on error (`log_parameter_max_length_on_error = 0`).
- **The phone apps never write the database directly.** Neither app includes a Supabase database
  library (code search, 2026-10-01), so step 07 cannot break them.
- **Real Supabase (2026-10-02):** all nine steps pass on a real Supabase project with encrypted Vault,
  real roles and default privileges. Every file loaded byte-identical. See the handoff, V1.
- **Production's real data (2026-10-02):** all nine steps pass on a restored copy of last night's
  backup on KVM1, with undo exact on real data and step 08's "exactly 6" guard holding. See the
  handoff, V2.
- **Not run:**
  - the server's test suite against these tables (the server does not use them yet);
  - the old `test-migrations` CI job on Postgres 17. Moving it to `supabase/postgres:17.6.1.111`
    failed to start the container and was reverted to 15.1.1.78 (handoff). The new `redo-rehearsal`
    job runs on Postgres 17 and passes in CI.

## 10. Rights and privacy notes

- **The service key can read every stored credential.** Verified 2026-10-02 on production:
  `service_role` can read `vault.decrypted_secrets` directly (Supabase default); clients cannot reach
  Vault. The credential functions provide atomicity, not access control. Protecting the service key is
  what protects users' cookies.
- **League scoring rules are stored, in their own compartment** (step 11; founder, 2026-10-02 night;
  this replaced "never stored"). They are kept for two recorded uses: grading each call against the
  league's own scoring (A6) and advising in the format the league plays. Every rule set cites a recorded
  ingest, and `scoring_rules_purge()` removes a provider's rules in one recorded call. Calls keep only
  version and hash, so a purge breaks nothing. Projections are the provider's own numbers.
- **ESPN and Yahoo projections are kept, in their compartments** (founder, 2026-10-01). Every batch is
  recorded with its rights basis, and one recorded call removes a provider entirely (§3).
- **Account deletion removes everything person-owned in ONE transaction** (`account_erase()`, step 10;
  Codex review, #505):
  - Vault secrets and connections, refusing to continue if any secret is missing;
  - memberships (cascade);
  - the whole Ledger;
  - legacy moves, consent and OAuth state;
  - beta reports and held retired rows (cascade);
  - the `users` row, with the hash-only audit row written.

  All of it happens, or none of it does.

  Shared rows (`leagues`, `players`, projections) hold no personal data and stay.
- **Export** gains `decisions`, `decision_actions` and `decision_outcomes` (code ticket).

## 11. Founder decisions

Decided 2026-10-01:

1. **Confidence storage** (§6): confirmed.
2. **The 6 Ledger rows with no league:** delete them (step 08, recorded, 30-day held copy).
3. **Account linking:** wanted, "if possible". Minted as its own sprint item (`D6-AccountLinking`).
   It needs research before design: how Supabase Auth links an Apple and a Google identity on native
   iOS, and how two existing Omen accounts would be merged when the Ledger cannot be rewritten.
4. **ESPN and Yahoo projections:** kept, in a recorded, deletable compartment (§3).
5. **Retirement list:** approved; done (§5).

Still open:

6. **`beta_reports`** (the in-app "Report" button): yes (2026-10-01). Step 09.
7. **Verification before production:** founder, 2026-10-01: "we need to verify everything before we
   move anything to production." The open verifications and the approvals each needs are in
   `Blueprints/handoffs/2026-10-01-database-redo.md`.
