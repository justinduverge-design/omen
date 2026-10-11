begin;

-- Weekly player projections as delivered by a third party (first source: Sleeper's public projections
-- endpoint, whose records are tagged with the upstream company, currently "rotowire").
--
-- This is NOT open data and it is NOT an nflverse fact. Founder decision 2026-10-11: store it, use it only
-- inside the product, never redistribute the raw projections, keep source and provenance on every row, and
-- keep a kill switch (FOOTBALL_PROJECTIONS_DISABLED=1 stops the ingest stage and the read path; dropping
-- these three tables removes the data). Commercial permission from the provider is still pending.
--
-- Additive only: nothing in 0001/0003 is altered. Current rows and append-only history are separate tables.
-- The fetch receipt is its own table because warehouse_ingest_events pins rights_basis to nflverse open data.

create table football.projection_fetch_runs (
  id              bigint generated always as identity primary key,
  run_id          text not null check (run_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'),
  source          text not null check (source in ('sleeper')),
  season          integer not null check (season between 1999 and 2100),
  week            integer not null check (week between 1 and 23),
  rights_basis    text not null check (rights_basis = 'provider_projection_permission_pending'),
  source_url      text not null check (source_url ~ '^https://'),
  source_ref      text check (source_ref is null or source_ref ~ '^sha256:[0-9a-f]{64}$'),
  source_bytes    bigint check (source_bytes is null or source_bytes >= 0),
  source_rows     integer check (source_rows is null or source_rows >= 0),
  state           text not null check (state in ('succeeded', 'failed')),
  fetched_at      timestamptz not null,
  finished_at     timestamptz not null default clock_timestamp(),
  rows_inserted   integer check (rows_inserted is null or rows_inserted >= 0),
  rows_changed    integer check (rows_changed is null or rows_changed >= 0),
  rows_unchanged  integer check (rows_unchanged is null or rows_unchanged >= 0),
  rows_unmatched  integer check (rows_unmatched is null or rows_unmatched >= 0),
  error_code      text,
  error_summary   text check (error_summary is null or length(error_summary) <= 500),
  unique (run_id, source, season, week),
  check (
    (state = 'succeeded' and source_ref is not null and source_rows is not null and rows_inserted is not null
       and rows_changed is not null and rows_unchanged is not null and rows_unmatched is not null
       and error_code is null and error_summary is null)
    or (state = 'failed' and error_code is not null)
  )
);
create index projection_fetch_runs_latest
  on football.projection_fetch_runs (source, season, week, finished_at desc)
  where state = 'succeeded';

-- Current projection per (source, season, week, source player). fetched_at is the last fetch that
-- CONFIRMED this row (it advances on an unchanged re-fetch, so freshness is one comparison); a row the source
-- stopped delivering keeps its older fetched_at and is excluded by the read path. player_id is the warehouse
-- player via the crosswalk and stays NULL until the crosswalk knows the source id (team defences, rookies).
create table football.player_weekly_projections (
  source            text not null check (source in ('sleeper')),
  season            integer not null check (season between 1999 and 2100),
  week              integer not null check (week between 1 and 23),
  source_player_id  text not null check (length(source_player_id) between 1 and 128),
  player_id         text references football.football_players(player_id) on delete restrict,
  company           text check (company is null or length(company) <= 64),
  stat_line         jsonb not null check (jsonb_typeof(stat_line) = 'object'),
  content_hash      text not null check (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  version           integer not null check (version >= 1),
  first_fetched_at  timestamptz not null,
  last_changed_at   timestamptz not null,
  fetched_at        timestamptz not null,
  fetch_run_id      bigint not null references football.projection_fetch_runs(id) on delete restrict,
  primary key (source, season, week, source_player_id),
  check (last_changed_at >= first_fetched_at and fetched_at >= last_changed_at)
);
create index player_weekly_projections_player
  on football.player_weekly_projections (player_id, season, week)
  where player_id is not null;
create index player_weekly_projections_freshness
  on football.player_weekly_projections (source, season, week, fetched_at desc);
create index player_weekly_projections_run on football.player_weekly_projections (fetch_run_id);

-- Append-only history: one row per distinct content for a player-week, version 1 first.
create table football.player_weekly_projection_versions (
  source            text not null,
  season            integer not null,
  week              integer not null,
  source_player_id  text not null,
  version           integer not null check (version >= 1),
  player_id         text references football.football_players(player_id) on delete restrict,
  company           text,
  stat_line         jsonb not null check (jsonb_typeof(stat_line) = 'object'),
  content_hash      text not null check (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  fetched_at        timestamptz not null,
  fetch_run_id      bigint not null references football.projection_fetch_runs(id) on delete restrict,
  primary key (source, season, week, source_player_id, version)
);
create index player_weekly_projection_versions_run
  on football.player_weekly_projection_versions (fetch_run_id);

-- Belt and braces for append-only: even a role that holds UPDATE/DELETE (a re-applied broad grant) cannot
-- rewrite or remove a version.
create function football.reject_projection_version_change() returns trigger
language plpgsql as $$
begin
  raise exception 'football.player_weekly_projection_versions is append-only';
end
$$;
revoke execute on function football.reject_projection_version_change() from public;
create trigger player_weekly_projection_versions_append_only
  before update or delete on football.player_weekly_projection_versions
  for each row execute function football.reject_projection_version_change();
create trigger player_weekly_projection_versions_no_truncate
  before truncate on football.player_weekly_projection_versions
  for each statement execute function football.reject_projection_version_change();

revoke all on football.projection_fetch_runs, football.player_weekly_projections,
  football.player_weekly_projection_versions from public;
revoke all on football.projection_fetch_runs, football.player_weekly_projections,
  football.player_weekly_projection_versions
  from omen_warehouse_reader, omen_warehouse_writer, omen_warehouse_backup;
grant select on football.projection_fetch_runs, football.player_weekly_projections,
  football.player_weekly_projection_versions to omen_warehouse_reader, omen_warehouse_backup;
grant select, insert, update on football.projection_fetch_runs, football.player_weekly_projections
  to omen_warehouse_writer;
-- History is append-only: the writer can add versions and read them, never rewrite or remove one.
grant select, insert on football.player_weekly_projection_versions to omen_warehouse_writer;
grant usage, select on all sequences in schema football to omen_warehouse_writer;

commit;
