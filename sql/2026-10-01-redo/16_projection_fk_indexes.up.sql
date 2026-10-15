-- Step 16 — covering indexes for the foreign keys on the two projection logs that will grow.
--
-- The Supabase performance advisor lists 8 unindexed foreign keys (2026-10-15). This step adds the three
-- that matter and deliberately leaves the other five. Evidence, read-only, 2026-10-15
-- (Direction/reviews/2026-10-15-fk-index-decision.md):
--
--   projection_shadow_log   0 rows, append-only, one row per player-week per league per engine, grows weekly.
--   projection_snapshots    0 rows, append-only, same growth.
--     -> built now, while empty, an index is instant and takes no lock worth naming. Built later on
--        millions of rows it would need CREATE INDEX CONCURRENTLY and a window.
--   decisions (21 rows, 3 heap pages), retired_rows (6), football_intelligence_signals (384): a sequential
--     scan reads a few pages, and the parent rows (players, data_events, leagues) are never deleted.
--     Not indexed; the data-quality check flags any unindexed FK on a table past 10,000 rows.
--   nflverse_weekly_stats (season, week): nothing in src/ or scripts/ reads the table (only the daily
--     ingest writes it) and it is retired when the warehouse becomes primary. Not indexed.
--
-- Indexes only: no table, column, row or privilege changes. Client privileges are unaffected.

begin;

do $$
begin
  if to_regclass('public.projection_snapshots') is null or to_regclass('public.projection_shadow_log') is null then
    raise exception 'step 16 preflight: step 06 (projection tables) must be applied first';
  end if;
  if to_regclass('public.projection_shadow_log_player_week') is not null
     or to_regclass('public.projection_shadow_log_league') is not null
     or to_regclass('public.projection_snapshots_league') is not null then
    raise exception 'step 16 preflight: a step 16 index already exists';
  end if;
  -- Guard the "built while empty" assumption: if the logs already hold real volume this step should be
  -- re-planned as CREATE INDEX CONCURRENTLY outside a transaction.
  if (select count(*) from public.projection_shadow_log) > 100000
     or (select count(*) from public.projection_snapshots) > 100000 then
    raise exception 'step 16 preflight: a projection log holds over 100000 rows; build these with CREATE INDEX CONCURRENTLY instead';
  end if;
end $$;

-- Covers projection_shadow_log_player_id_fkey and serves the grading lookup (a player's weeks).
create index projection_shadow_log_player_week on public.projection_shadow_log (player_id, season, week);
-- Covers projection_shadow_log_league_id_fkey. Partial: public-scope rows have no league.
create index projection_shadow_log_league on public.projection_shadow_log (league_id) where league_id is not null;
-- Covers projection_snapshots_league_id_fkey. Partial for the same reason.
create index projection_snapshots_league on public.projection_snapshots (league_id) where league_id is not null;

commit;
