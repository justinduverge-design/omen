# Foreign-key index decision — 2026-10-15

The Supabase performance advisor lists 8 unindexed foreign keys and the brief asked for all 8 plus a
`(season, week)` index on `nflverse_weekly_stats`. Rule applied: skip what is not useful, prove it, then
prune. All queries below were read-only on 2026-10-15.

| Candidate | Rows | Decision | Proof |
|---|---|---|---|
| `projection_shadow_log.player_id` | 0 | **Add**, as `(player_id, season, week)` | Append-only, grows weekly. Cheapest while empty. The grading lookup is "a player's weeks", which this serves too. |
| `projection_shadow_log.league_id` | 0 | **Add**, partial `where league_id is not null` | Same growth. Public-scope rows have no league, so the partial index is smaller and still serves the FK check. |
| `projection_snapshots.league_id` | 0 | **Add**, partial | Same. |
| `decisions.primary_player_id`, `.comparison_player_id` | 21 (3 heap pages, 232 kB) | **Skip** | A sequential scan reads 3 pages. Parent `players` rows are never deleted (`ON DELETE RESTRICT`). |
| `football_intelligence_signals.supersedes_id` | 384 (55 pages) | **Skip** | Self-reference, no delete path, 1,364 index scans already on the table's other indexes. |
| `retired_rows.data_event_id`, `.user_id` | 6 (2 pages) | **Skip** | `data_events` is never deleted. The `user_id` cascade runs only inside `account_erase()` over 6 rows held 30 days. |
| `nflverse_weekly_stats (season, week)` | 6,378 | **Skip** | `grep` finds no reader of the table in `src/` or `scripts/`; only the daily ingest writes it. Its 69,432 index scans match the daily upserts (6,378 rows over about 11 days) and use the primary key. The table is retired when the warehouse becomes primary (`sql/2026-10-01-redo/README.md`). A new index would only slow the daily upsert. |

The 9 "unused" indexes are untouched, as instructed.

**Revisit trigger.** An unindexed FK on a table past 10,000 rows should be indexed. Task 4's data-quality
checks will include that query, so the skip decisions re-open themselves.

**Rehearsal.** Step 16 was run on a scratch Postgres **16.15** (the sandbox has no 17): up, test, down,
up again, with schema and data fingerprints identical at each stage, plus a negative control (drop one
index, the test fails). The harness's production-catalog comparison could **not** run on 16 (Postgres 17
adds the `MAINTAIN` privilege the snapshot records), so that gate, and the Postgres 17 CI job, remain the
authority. **Not run on a Supabase branch**: `create_branch` timed out and created nothing; branch cost
needs the founder's agreement.
