# Football Core Schema Blueprint — Omen Rebuild (Gate 1)

- **Date:** 2026-09-29
- **Status:** Proposed — architecture review, then frozen before implementation work orders.
- **Sources:** domain invariants (I1–I11), traceability index, `sql/omen_rls_security.sql`, `sql/league_office_record_book.sql`, `sql/league_office_weekly_message.sql`, `sql/2026-06-12_phase1_adp_scoring_schema_review.sql` (review-only), `sql/2026-09-03_multi_league_follows_review.sql` (review-only), `sql/2026-08-26_a6_scoring_contract_production.sql`, screen contracts LeagueTable-v1 / LeagueWaiver-v1.
- **Domain boundary:** football core = players, leagues, seasons/weeks, scoring configs, rosters. NOT in this blueprint: identity tables (WO-06), `moves`/Ledger/decision-record normalization (WO-07, separate blueprint), the League Office feature store (assessed below, kept as-is).

## Design decisions (read before the tables)

1. **Shared leagues, not per-user league rows.** `leagues` is backend-owned and shared: one row per `(provider, provider_league_id)`. The user↔league relationship lives in `league_memberships` (already reviewed 2026-09-03: "one account, many leagues, is a join"). Rationale: a family league followed by two Omen users must not fork into two league rows with diverging settings. Ownership (I1) is expressed through `league_memberships.user_id`; duplicating league data per user would violate single-source-of-truth. This is an explicit, documented I1 scoping: I1 governs user data; league/fixture data is league-scoped and reached through the follow join.
2. **Canonical player id format** follows the convention already established in `football_intelligence_signals` (`omen:team:`, `omen:coach:`): `omen:player:<slug>`, text PK with a regex check. Provider ids (Sleeper/ESPN/Yahoo/**nflverse**) live only in the mapping table, pointing at the canonical id (I2).
3. **Column naming:** `provider` (not `platform`) and `week` (not `week_num`) in all new tables, per I3/I9. Existing `platform` columns are renamed at migration time.
4. **`week` convention:** integer NOT NULL; `0` = offseason/preseason state; 1–18 regular season; 19+ postseason. Offseason is a valid state (I4), never null, never a crash.
5. **Waiver deadline is computed, not stored.** "Claims process Tue 3:00 AM" is a function of provider rules + calendar and can shift; storing it risks serving a stale deadline. The waiver analysis computes it at read time and the decision envelope carries `as_of`/`expires_at`.
6. **No Supabase-only features beyond RLS.** Plain Postgres 17 otherwise — the schema must survive a move off Supabase (ADR-002 portability hedge).
7. **One migration per table**, ordered by FK dependency (order listed at the end).

---

## Table 1 — `players` (canonical)

**Purpose:** the one player identity for all of Omen (I2). Backend-owned reference data — no user data lives here (same posture as `adp_sources`).

| Column | Type | Constraints |
|---|---|---|
| `id` | text | PK; `CHECK (id ~ '^omen:player:[a-z0-9][a-z0-9._-]*$')` |
| `full_name` | text | NOT NULL |
| `first_name` | text | |
| `last_name` | text | |
| `position` | text | NOT NULL; `CHECK (position IN ('QB','RB','WR','TE','K','DEF','DST'))` — playing positions only; FLEX/SUPERFLEX are slot concepts, not positions |
| `nfl_team` | text | nullable (free agents have no team) |
| `created_at` | timestamptz | NOT NULL DEFAULT now() |
| `updated_at` | timestamptz | NOT NULL DEFAULT now() |

- **Indexes:** `(position, nfl_team)`, trigram/GIN on `full_name` for search (TradeBuild player search).
- **RLS:** authenticated SELECT; service_role all. No anon.
- **Replaces:** `adp_player_rankings.player_id` / `provider_player_id` dual-id confusion (migrate to canonical); `moves.target_player` free text (new rows reference canonical id; historical rows — see open questions).
- **Required by:** LeagueWaiver ("RB · TEN" identity), TradeBuild/TradeRoster/TradeVerdict (trade-compare.v2), StartSitClear (start-sit-detail.v1), OmenCall/OmenEvidence.

## Table 2 — `player_provider_ids` (mapping)

**Purpose:** every provider-native id points AT the canonical id, never the reverse (I2).

| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK DEFAULT gen_random_uuid() |
| `player_id` | text | NOT NULL REFERENCES players(id) ON DELETE CASCADE |
| `provider` | text | NOT NULL; `CHECK (provider IN ('sleeper','espn','yahoo','nflverse'))` |
| `provider_player_id` | text | NOT NULL |
| `created_at` | timestamptz | NOT NULL DEFAULT now() |

- **Constraints:** UNIQUE (`provider`, `provider_player_id`); UNIQUE (`player_id`, `provider`).
- **RLS:** authenticated SELECT; service_role all. No anon.
- **Replaces:** ad-hoc provider-id joins scattered through API code; fixes the I2 direction violation.
- **Required by:** every provider adapter read path; roster sync; trade-compare input citation.

## Table 3 — `leagues` (canonical league identity)

**Purpose:** one row per real league, (provider, provider_league_id) identity (I3). Backend-owned, shared across followers.

| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK DEFAULT gen_random_uuid() |
| `provider` | text | NOT NULL; `CHECK (provider IN ('sleeper','espn','yahoo'))` |
| `provider_league_id` | text | NOT NULL |
| `name` | text | display only, e.g. "SLOPS SALOON" — never used as identity |
| `season` | integer | NOT NULL |
| `team_count` | integer | `CHECK (team_count BETWEEN 2 AND 20)` — "WEEK 7 · 12 TEAMS" |
| `waiver_type` | text | NOT NULL; `CHECK (waiver_type IN ('faab','rolling','none'))` — I7 explicit difference |
| `waiver_budget_total` | numeric(9,2) | nullable; set when waiver_type='faab' ("$63 of $100") |
| `last_synced_at` | timestamptz | |
| `provider_quirks` | jsonb | NOT NULL DEFAULT '{}' — I7: real provider differences documented here (e.g. ESPN transaction-feed gaps), never hidden; `CHECK (jsonb_typeof(provider_quirks)='object')` |
| `created_at` | timestamptz | NOT NULL DEFAULT now() |
| `updated_at` | timestamptz | NOT NULL DEFAULT now() |

- **Constraints:** UNIQUE (`provider`, `provider_league_id`, `season`) — leagues re-instantiate per season; `CHECK (waiver_budget_total IS NULL OR waiver_type='faab')`.
- **Indexes:** (`provider`, `season`).
- **RLS:** authenticated SELECT where the user follows the league (`EXISTS (SELECT 1 FROM league_memberships f WHERE f.league_id = leagues.id AND f.user_id = auth.uid())`); service_role all. No anon.
- **Replaces:** `users.platform` / `users.league_id` single-league columns (removed per I3). `platform_connections.league_id` STAYS as the active-league pointer within a provider (per the 2026-09-03 multi-league review — additive, not replaced).
- **Required by:** SwitchSheet (league-directory.v1), LeagueTable (league-overview.v1), CommandCenter.

## Table 4 — `seasons`

**Purpose:** explicit season boundaries; one source of truth for "what week is it" so clients never compute it (I4; decision envelope: lock times never client-computed).

| Column | Type | Constraints |
|---|---|---|
| `season` | integer | PK, e.g. 2026 |
| `preseason_start` | date | |
| `week_1_start` | date | |
| `regular_season_weeks` | integer | NOT NULL DEFAULT 18 |
| `season_end` | date | |
| `current_week` | integer | `CHECK (current_week BETWEEN 0 AND 25)` — maintained by scheduled job; 0 = offseason |
| `is_offseason` | boolean | NOT NULL DEFAULT false — maintained by scheduled job |
| `updated_at` | timestamptz | NOT NULL DEFAULT now() |

- **RLS:** authenticated SELECT; service_role all. No anon.
- **Replaces:** hardcoded season/week constants in code.
- **Required by:** every weekly-scoped read; quiet-week logic (CommandQuiet); waiver deadline computation.
- **Open:** which job owns `current_week`/`is_offseason` updates (future work order; see open questions).

## Table 5 — `league_scoring_configs`

**Purpose:** per-league scoring configuration stored as data, never assumed (I5). Adapted from the reviewed 2026-06-12 design, re-keyed from user-owned to league-owned.

| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK DEFAULT gen_random_uuid() |
| `league_id` | uuid | NOT NULL REFERENCES leagues(id) ON DELETE CASCADE |
| `season` | integer | NOT NULL |
| `scoring_format` | text | NOT NULL DEFAULT 'ppr'; `CHECK (scoring_format IN ('ppr','half_ppr','standard','custom'))` |
| `teams` | integer | `CHECK (teams IS NULL OR teams BETWEEN 2 AND 20)` |
| `source` | text | NOT NULL DEFAULT 'platform'; `CHECK (source IN ('platform','manual','demo','imported'))` |
| `config_hash` | text | `CHECK (config_hash ~ '^sha256:[0-9a-f]{64}$')` — decisions cite this in `inputs_cited` (I5: "decisions must reference which scoring config they used") |
| `default_scoring_rules` | jsonb | NOT NULL DEFAULT '{}'; object check |
| `raw_platform_settings` | jsonb | NOT NULL DEFAULT '{}'; object check — verbatim provider payload for audit |
| `last_synced_at` | timestamptz | |
| `created_at` | timestamptz | NOT NULL DEFAULT now() |
| `updated_at` | timestamptz | NOT NULL DEFAULT now() |

- **Constraints:** UNIQUE (`league_id`, `season`) — one config per league per season.
- **RLS:** authenticated SELECT via the league_memberships join (same pattern as leagues); service_role all (backend syncs from provider; writes stay backend-owned until validation contracts exist). No anon.
- **Replaces:** `moves.scoring` free-text default 'PPR' (the I5 violation — silent default). The per-move `scoring_contract` jsonb + hash pattern on `moves` is KEPT as decision-time provenance, now referencing `config_hash`.
- **Required by:** every decision surface (OmenCall, StartSit, TradeVerdict, LeagueWaiver projections) — I5.

## Table 6 — `league_scoring_rules`

**Purpose:** normalized per-stat scoring rules (from the reviewed design, unchanged in shape).

| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK DEFAULT gen_random_uuid() |
| `config_id` | uuid | NOT NULL REFERENCES league_scoring_configs(id) ON DELETE CASCADE |
| `category` | text | NOT NULL |
| `stat_key` | text | NOT NULL |
| `points` | numeric(9,4) | NOT NULL; `CHECK (points BETWEEN -100 AND 100)` |
| `per_unit` | numeric(9,4) | NOT NULL DEFAULT 1; `CHECK (per_unit > 0)` |
| `applies_to_positions` | text[] | NOT NULL DEFAULT '{}' |
| `metadata` | jsonb | NOT NULL DEFAULT '{}'; object check |
| `created_at` / `updated_at` | timestamptz | NOT NULL DEFAULT now() |

- **Constraints:** UNIQUE (`config_id`, `stat_key`).
- **RLS:** same follows-join SELECT as configs; service_role all.

## Table 7 — `league_roster_slots`

**Purpose:** league roster construction — which slots exist and who may fill them (from the reviewed design, unchanged in shape).

| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK DEFAULT gen_random_uuid() |
| `config_id` | uuid | NOT NULL REFERENCES league_scoring_configs(id) ON DELETE CASCADE |
| `slot_key` | text | NOT NULL (QB, RB, WR, TE, FLEX, SUPERFLEX, K, DEF, BENCH, IR) |
| `slot_count` | integer | NOT NULL; `CHECK (slot_count BETWEEN 0 AND 30)` |
| `is_starter` | boolean | NOT NULL DEFAULT true |
| `position_groups` | text[] | NOT NULL DEFAULT '{}' |
| `metadata` | jsonb | NOT NULL DEFAULT '{}'; object check |
| `created_at` / `updated_at` | timestamptz | NOT NULL DEFAULT now() |

- **Constraints:** UNIQUE (`config_id`, `slot_key`).
- **RLS:** same as configs.

## Table 8 — `roster_snapshots`

**Purpose:** point-in-time roster reads with honest labeling — a row can say "live at T" or "cached as of T" (I6). This table is what makes "no trade read without rosters" provable and decisions reproducible (I8).

| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK DEFAULT gen_random_uuid() |
| `league_id` | uuid | NOT NULL REFERENCES leagues(id) ON DELETE CASCADE |
| `team_id` | text | NOT NULL — provider-native team id within the league (the user's team AND opponents'; trade-compare needs both sides) |
| `season` | integer | NOT NULL |
| `week` | integer | NOT NULL |
| `source` | text | NOT NULL; `CHECK (source IN ('live','cached'))` — only live reads wear the LIVE mark |
| `read_at` | timestamptz | NOT NULL — when the provider was read; this IS the as_of label |
| `created_at` | timestamptz | NOT NULL DEFAULT now() |

- **Constraints:** UNIQUE (`league_id`, `team_id`, `season`, `week`, `read_at`) — history is kept, not overwritten.
- **Indexes:** (`league_id`, `team_id`, `season`, `week`, `read_at` DESC) for latest-snapshot lookup.
- **RLS:** authenticated SELECT via the league_memberships join; service_role all. No anon. (No `user_id` column: snapshots are league-scoped synced data; ownership is expressed through the follow join — same scoping decision as `leagues`. Opponent teams have no Omen user; per-user duplication would fork the data.)
- **Replaces:** nothing exists — rosters are currently read live and discarded, which is why historical trade reads can't be audited. New capability, derived from I6/I8.
- **Required by:** TradeBuild/TradeRoster/TradeVerdict (both sides' rosters), StartSitClear (lineup + bench), LeagueWaiver ("everyone on your bench" drop analysis), OmenCall.

## Table 9 — `roster_entries`

**Purpose:** the players in a snapshot, in their slots, referencing canonical ids (I2).

| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK DEFAULT gen_random_uuid() |
| `snapshot_id` | uuid | NOT NULL REFERENCES roster_snapshots(id) ON DELETE CASCADE |
| `player_id` | text | NOT NULL REFERENCES players(id) |
| `slot` | text | NOT NULL (QB/RB/WR/TE/FLEX/SUPERFLEX/K/DEF/BENCH/IR/TAXI) |
| `is_starter` | boolean | NOT NULL DEFAULT false |
| `created_at` | timestamptz | NOT NULL DEFAULT now() |

- **Constraints:** UNIQUE (`snapshot_id`, `player_id`) — one row per player per snapshot.
- **RLS:** authenticated SELECT via snapshot → league → follows join; service_role all.
- **Required by:** same screens as roster_snapshots.

## Table 10 — `league_scarcity_weights` (deferred detail)

From the reviewed design (position, replacement_rank, scarcity_weight, baseline_points per config). **Propose:** keep the table shape but mark it backend-computed analytics, not config — its rows are derived from scoring rules + ADP, and the derivation job is a future work order. Include in the migration set for shape completeness; population deferred. (If architecture review prefers, drop from v1 and re-propose with the VORP work.)

---

## league_office_* assessment (7 tables)

All seven are the **League Office feature store** (record book + weekly group-chat message), service-role only, `user_id`-owned. They are NOT football core and stay out of this blueprint's migrations. Verdict: **KEEP all 7 as-is.**

| Table | What it is | Verdict | Reason |
|---|---|---|---|
| `league_office_sync_jobs` | per-(user, platform, league, season, week) provider sync job tracking | KEEP | Operational table for the League Office sync; no contract conflicts |
| `league_office_matchups` | synced matchup scores/projections | KEEP | Feature-scoped; unique on (user, platform, league, season, week, game_id) is sound |
| `league_office_executives` | league managers ("executives") | KEEP | Feature-scoped directory |
| `league_office_rivalries` | user-defined rivalries | KEEP | Feature-scoped |
| `league_office_lines` | betting lines for the group-chat message | KEEP | ⚠️ see flag below |
| `league_office_awards` | weekly awards (now Top Performer / Pickup of the Week / Drop of the Week) | KEEP | ⚠️ see flag below |
| `league_office_accolades` | season payouts | KEEP | Feature-scoped; has the uniqueness constraint I9 demands elsewhere |

**Flag for WO-06 (identity):** the weekly-message migration re-keyed `league_office_awards` and `league_office_lines` uniqueness to `(league_id, season, week, …)` — dropping `user_id` from the identity. Ownership columns remain non-nullable (I1-safe), but the "reconnects must not create a second record" logic now assumes one League Office record per league regardless of which user syncs it. That assumption must be reconciled with the single-identity redesign: either the League Office becomes league-scoped (consistent with this blueprint's `leagues` decision) or the uniqueness goes back to user-scoped. Do not guess here — WO-06 decides.

## Replacements index (old → new)

| Current | Target | Work order |
|---|---|---|
| `users.platform`, `users.league_id` (single league) | removed; `leagues` + `league_memberships` | WO-06/07 |
| `moves.scoring` text default 'PPR' | `league_scoring_configs` + `config_hash` cited per decision | WO-07 |
| `moves.week_num` | `week` everywhere | WO-07 (I9) |
| `moves.target_player` text | `player_id` → `players(id)` on new tables | WO-07 |
| `adp_player_rankings.player_id` / `provider_player_id` dual ids | `players` + `player_provider_ids` | migration WO |
| `platform` column naming | `provider` in all new tables | migrations |
| roster reads discarded after use | `roster_snapshots` + `roster_entries` | new WO |
| hardcoded season/week logic | `seasons` | new WO |

## Migration order (one per table)

1. `players` → 2. `player_provider_ids` → 3. `leagues` → 4. `seasons` (independent, anytime after 1) → 5. `league_scoring_configs` → 6. `league_scoring_rules` → 7. `league_roster_slots` → 8. `roster_snapshots` → 9. `roster_entries` → 10. `league_scarcity_weights` (shape only; population deferred).

## Open questions (not guesses)

1. **Shared vs per-user leagues — RESOLVED 2026-09-29 (founder).** Shared `leagues` + `league_memberships` join. Tables 3/5/8/9 stay league-scoped; ownership flows through the membership join.
2. **Historical `moves.target_player` migration** — free-text names → canonical ids needs fuzzy matching or NULL-with-flag. WO-07 decides the policy.
3. **`seasons.current_week` / `is_offseason` updater** — which scheduled job owns it; until it exists, these columns stay null/false and reads fall back to date math.
4. **League Office user-scoping** — see the WO-06 flag above.
5. **`league_scarcity_weights`** — include shape-only now, or defer entirely to the VORP work.
6. **TAXI slot** — included in roster entry slots for I7 (leagues with taxi squads); harmless for leagues without.
7. **nflverse as a "provider"** in `player_provider_ids` — proposes treating the evidence backbone as a first-class id source so snapshot joins never go through a fantasy provider's id.
