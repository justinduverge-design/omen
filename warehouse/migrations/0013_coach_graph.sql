begin;

-- The coach graph. Coaches, and which role each held for which team in which season, from Wikipedia's
-- team-season staff lists (facts; each row keeps its page title and revision for CC BY-SA attribution).
-- It is a graph, not a tree: a coach can hold several roles, serve several head coaches, and carry several
-- systems. "Worked under" is never stored; football.coach_lineage derives it from shared team-seasons.
-- Inferred scheme influence (Scheme DNA similarity) is a separate edge type, added later.

create table football.coach_index_runs (
  id           bigint generated always as identity primary key,
  source       text not null check (source in ('wikipedia_team_seasons')),
  rights_basis text not null check (rights_basis = 'wikipedia_cc_by_sa_facts'),
  pages        integer not null check (pages >= 0),
  assignments  integer not null check (assignments >= 0),
  fetched_at   timestamptz not null,
  finished_at  timestamptz not null default clock_timestamp()
);

create table football.coaches (
  coach_id      text primary key check (coach_id ~ '^omen:coach:[a-z0-9-]{1,100}$'),
  display_name  text not null check (display_name <> ''),
  source_title  text not null unique check (source_title <> ''),
  index_run_id  bigint not null references football.coach_index_runs(id) on delete restrict
);

create table football.coach_assignments (
  coach_id      text not null references football.coaches(coach_id) on delete restrict,
  team_id       text not null references football.football_teams(team_id) on delete restrict,
  season        integer not null check (season between 1999 and 2100),
  role          text not null check (role in ('head_coach', 'assistant_head_coach', 'offensive_coordinator', 'defensive_coordinator',
                                              'special_teams_coordinator', 'passing_game_coordinator', 'run_game_coordinator')),
  source_title  text not null,
  source_revision bigint,
  source_ref    text not null check (source_ref ~ '^sha256:[0-9a-f]{64}$'),
  index_run_id  bigint not null references football.coach_index_runs(id) on delete restrict,
  primary key (coach_id, team_id, season, role)
);
create index coach_assignments_team_season on football.coach_assignments (team_id, season);

-- Who worked under whom: every staff member of a team-season under that season's head coach.
create view football.coach_lineage as
  select staff.coach_id, staff.role, head.coach_id as head_coach_id, staff.team_id, staff.season
    from football.coach_assignments staff
    join football.coach_assignments head
      on head.team_id = staff.team_id and head.season = staff.season and head.role = 'head_coach'
   where staff.coach_id <> head.coach_id;

comment on table football.coach_index_runs is '[ledger] Receipt for each coach-graph load from Wikipedia team-season pages.';
comment on table football.coaches is '[identity] Coaches, keyed by their Wikipedia page title (one id across teams and years).';
comment on table football.coach_assignments is '[facts] Which role each coach held for which team in which season, with the source page and revision.';
comment on view football.coach_lineage is '[facts] Derived: each staff member and the head coach he served under, per team-season.';

insert into football.warehouse_map (name, layer, grain, source, refresh, purpose, gaps) values
  ('coach_index_runs', 'ledger', 'one row per coach-graph load', 'Wikipedia team-season pages', 'daily 07:15 ET (backfill once, then the current season)',
   'Receipt for coach-graph loads, so every coach and assignment says where it came from.', array[]::text[]),
  ('coaches', 'identity', 'one row per coach', 'Wikipedia team-season staff lists', 'daily 07:15 ET',
   'Coaches keyed by Wikipedia page title, so one coach links across teams and seasons.', array[]::text[]),
  ('coach_assignments', 'facts', 'one row per (coach, team, season, role)', 'Wikipedia team-season staff lists (CC BY-SA facts, title + revision kept)', 'daily 07:15 ET',
   'The coach graph: who was head coach, coordinator or assistant head coach for which team each season.',
   array['Play caller is not listed on the pages; inferred scheme influence (Scheme DNA) is a later edge type.', 'Pages that omit a staff section leave that team-season without assignments.']::text[]),
  ('coach_lineage', 'facts', 'one row per (staff coach, head coach, team, season)', 'derived from coach_assignments', 'always current (a view)',
   'Who worked under whom: every staff member and the head coach he served, per team-season. Derived, never typed in.', array[]::text[]);

revoke all on football.coach_index_runs, football.coaches, football.coach_assignments, football.coach_lineage
  from public, omen_warehouse_reader, omen_warehouse_writer, omen_warehouse_backup;
grant select on football.coach_index_runs, football.coaches, football.coach_assignments, football.coach_lineage
  to omen_warehouse_reader, omen_warehouse_backup, omen_warehouse_writer;
grant insert on football.coach_index_runs, football.coaches, football.coach_assignments to omen_warehouse_writer;
grant update on football.coaches to omen_warehouse_writer;
grant usage, select on sequence football.coach_index_runs_id_seq to omen_warehouse_writer;

commit;
