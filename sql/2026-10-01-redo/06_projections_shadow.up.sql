-- REVIEW ONLY. NOT APPLIED. Facts-of-record #8.
--
-- Step 06 — provider projections as Omen read them, the shadow log, and the data record that makes
-- every stored row traceable and every provider's data removable in one call.
--
--   data_events            append-only record of every batch written into a compartment and every
--                          purge or retirement: when, which job and version, the source content hash,
--                          the rights basis it was stored under, how many rows, and who approved a
--                          deletion. Founder, 2026-10-01: "Everything got to be recorded. Everything got
--                          to be traceable."
--   projection_snapshots   one row per provider projection read: the provider's points and the raw
--                          projected STAT LINE (the explainer's "where the points come from" block,
--                          approved design, D5 layer 1). Every row names the data_events batch that
--                          wrote it. League scoring rules are not stored here: they have their own
--                          compartment, step 11 (league_scoring_rules; founder, 2026-10-02 night).
--   projection_shadow_log  per player-week: the provider's projection beside Omen's read (null until an
--                          engine exists), so any "beats the provider" claim rests on a forward record.
--
-- The compartment (founder, 2026-10-01): ESPN's exact projections ARE kept, "in a compartment where
-- if it ever comes down to it, we can delete it." Each provider's rows are one compartment.
-- `projections_purge(provider, reason, approved_by)` deletes that provider's snapshots and shadow rows
-- in one transaction and writes a 'purge' event with the counts and a hash of what was removed. It is
-- the ONLY path that can delete from these append-only tables. Projections hold no personal data: an
-- ESPN or Yahoo projection read through someone's connection is scoped to the LEAGUE, never to a person.
--
-- Server-only: RLS on, no policies, client privileges revoked.

begin;

do $$
begin
  if to_regclass('public.projection_snapshots') is not null or to_regclass('public.data_events') is not null then
    raise exception 'step 06 preflight: projection_snapshots or data_events already exists';
  end if;
end $$;

create table public.data_events (
  id           bigint generated always as identity primary key,
  occurred_at  timestamptz not null default now(),
  event        text not null check (event in ('ingest', 'purge', 'retire', 'restore')),
  subject      text not null,                     -- the compartment or table, e.g. 'projections:espn', 'moves'
  provider     text check (provider in ('sleeper', 'espn', 'yahoo', 'nflverse')),
  rights_basis text,                              -- under what terms it was stored, e.g. 'sleeper_public_api', 'espn_user_connection'
  job          text not null,                     -- job name and version, or the migration file for a retirement
  source_ref   text check (source_ref is null or source_ref ~ '^sha256:[0-9a-f]{64}$'),  -- hash of the raw input
  content_hash text check (content_hash is null or content_hash ~ '^sha256:[0-9a-f]{64}$'), -- hash of the rows written or removed
  row_count    integer not null check (row_count >= 0),
  reason       text,
  approved_by  text,
  details      jsonb not null default '{}' check (jsonb_typeof(details) = 'object'),
  constraint data_events_ingest_has_basis check (event <> 'ingest' or (rights_basis is not null and source_ref is not null)),
  constraint data_events_deletion_is_approved check (event = 'ingest' or (reason is not null and approved_by is not null))
);
create index data_events_subject on public.data_events (subject, occurred_at desc);
comment on table public.data_events is
  'Append-only record of every batch written into a data compartment and every purge or retirement. Never deleted.';

create table public.projection_snapshots (
  id                 bigint generated always as identity primary key,
  ingest_event_id    bigint not null references public.data_events(id) on delete restrict,
  provider           text not null check (provider in ('sleeper', 'espn', 'yahoo')),
  provider_player_id text not null check (provider_player_id <> ''),
  player_id          text references public.players(id) on delete restrict,  -- null until the crosswalk resolves it
  season             integer not null check (season between 2000 and 2100),
  week               integer not null check (week between 1 and 22),
  scope              text not null check (scope in ('public', 'league')),
  league_id          uuid references public.leagues(id) on delete restrict,
  provider_points    jsonb not null check (jsonb_typeof(provider_points) = 'object'),   -- e.g. {"ppr": 23.12, "half_ppr": 21.3, "std": 19.5} or {"league": 22.8}
  stat_line          jsonb not null check (jsonb_typeof(stat_line) = 'object'),         -- raw projected stats as the provider sent them
  opponent           text,
  fetched_at         timestamptz not null,
  source_ref         text not null check (source_ref ~ '^sha256:[0-9a-f]{64}$'),       -- hash of the raw provider payload
  created_at         timestamptz not null default now(),
  constraint projection_snapshots_scope_league check ((scope = 'league') = (league_id is not null))
);
create unique index projection_snapshots_identity on public.projection_snapshots
  (provider, provider_player_id, season, week, scope, coalesce(league_id, '00000000-0000-0000-0000-000000000000'::uuid), fetched_at);
create index projection_snapshots_player_week on public.projection_snapshots (player_id, season, week);
create index projection_snapshots_ingest on public.projection_snapshots (ingest_event_id);

create table public.projection_shadow_log (
  id                     bigint generated always as identity primary key,
  provider               text not null check (provider in ('sleeper', 'espn', 'yahoo')),
  provider_player_id     text not null,
  player_id              text references public.players(id) on delete restrict,
  season                 integer not null check (season between 2000 and 2100),
  week                   integer not null check (week between 1 and 22),
  projection_snapshot_id bigint not null references public.projection_snapshots(id) on delete restrict,
  league_id              uuid references public.leagues(id) on delete restrict,   -- copied from the snapshot; null for public projections
  provider_projection    numeric not null,
  points_basis           text not null,             -- which key of provider_points this is: ppr, half_ppr, std, league
  omen_expected          numeric,                    -- null until an engine produces a read
  omen_range_lo          numeric,
  omen_range_hi          numeric,
  engine_version         text not null,              -- 'provider-only' before any engine exists
  logged_at              timestamptz not null default now(),
  constraint projection_shadow_log_range check (omen_range_lo is null or omen_range_hi is null or omen_range_lo <= omen_range_hi)
);
-- One row per player-week per league per engine: the same ESPN or Yahoo player in two leagues the same
-- week has two league-scoped projections, and both are logged (Codex review, #505).
create unique index projection_shadow_log_one_per_engine on public.projection_shadow_log
  (provider, provider_player_id, season, week, coalesce(league_id, '00000000-0000-0000-0000-000000000000'::uuid),
   points_basis, engine_version);
create index projection_shadow_log_snapshot on public.projection_shadow_log (projection_snapshot_id);

-- A snapshot must cite the batch that wrote it: an 'ingest' event for the projections compartment of
-- the same provider (Codex review, #508; plan A4). The foreign key alone would accept another
-- provider's ingest, a purge record, or another compartment's batch (such as scoring rules), and then
-- the record would no longer say where the row came from. A missing event is left to the foreign key.
--
-- It also takes a SHARED per-provider lock that projections_purge takes exclusively, so a purge waits for
-- every insert in flight and its delete then sees them (Codex review, #528). Without it, a purge's DELETE
-- cannot see an uncommitted insert, both commit, and the purge records success with rows left behind.
create function public.projection_snapshots_check_ingest() returns trigger
language plpgsql set search_path = pg_catalog, public as $$
declare ev public.data_events%rowtype;
begin
  perform pg_advisory_xact_lock_shared(hashtextextended('omen.compartment:projections:' || new.provider, 0));
  select * into ev from public.data_events where id = new.ingest_event_id;
  if not found then
    return new;
  end if;
  if ev.event <> 'ingest' or ev.provider is distinct from new.provider or ev.subject <> 'projections:' || new.provider then
    raise exception 'projection_snapshots: event % is not a projections ingest for %', new.ingest_event_id, new.provider
      using errcode = '23514';
  end if;
  return new;
end $$;
create trigger projection_snapshots_check_ingest before insert on public.projection_snapshots
  for each row execute function public.projection_snapshots_check_ingest();

-- The snapshot is the single source for a shadow row's identity and provider number (Codex review, #505).
-- Provider, player, player id, season, week, league and the provider's projection are copied from the cited
-- snapshot; a writer may omit them, and a value that disagrees with the snapshot is refused. The provider's
-- projection must exist in the snapshot under points_basis. One wrong insert can no longer corrupt the
-- measurement, because the measurement's inputs are not taken on the writer's word.
create function public.projection_shadow_log_check() returns trigger
language plpgsql set search_path = pg_catalog, public as $$
declare snap public.projection_snapshots%rowtype; points numeric;
begin
  select * into snap from public.projection_snapshots where id = new.projection_snapshot_id;
  if not found then
    raise exception 'projection_shadow_log: snapshot % does not exist', new.projection_snapshot_id using errcode = '23503';
  end if;
  if (new.provider is not null and new.provider <> snap.provider)
     or (new.provider_player_id is not null and new.provider_player_id <> snap.provider_player_id)
     or (new.player_id is not null and new.player_id is distinct from snap.player_id)
     or (new.season is not null and new.season <> snap.season)
     or (new.week is not null and new.week <> snap.week)
     or (new.league_id is not null and new.league_id is distinct from snap.league_id) then
    raise exception 'projection_shadow_log: row disagrees with its snapshot (provider, player, week or league)' using errcode = '23514';
  end if;
  if not (snap.provider_points ? new.points_basis) then
    raise exception 'projection_shadow_log: snapshot has no % projection', new.points_basis using errcode = '23514';
  end if;
  points := (snap.provider_points ->> new.points_basis)::numeric;
  if new.provider_projection is not null and new.provider_projection <> points then
    raise exception 'projection_shadow_log: provider_projection % does not match the snapshot''s %', new.provider_projection, points
      using errcode = '23514';
  end if;
  new.provider := snap.provider;
  new.provider_player_id := snap.provider_player_id;
  new.player_id := snap.player_id;
  new.season := snap.season;
  new.week := snap.week;
  new.league_id := snap.league_id;
  new.provider_projection := points;
  return new;
end $$;
create trigger projection_shadow_log_check before insert on public.projection_shadow_log
  for each row execute function public.projection_shadow_log_check();

-- Append-only, except inside projections_purge (transaction-local flag).
create function public.compartment_append_only() returns trigger
language plpgsql set search_path = pg_catalog as $$
begin
  if tg_op = 'DELETE' and coalesce(current_setting('omen.compartment_purge', true), '') = 'on' then
    return old;
  end if;
  raise exception '% is append-only: % refused (purges go through projections_purge)', tg_table_name, tg_op
    using errcode = '42501';
end $$;
create trigger data_events_append_only before update or delete on public.data_events
  for each row execute function public.compartment_append_only();
create trigger projection_snapshots_append_only before update or delete on public.projection_snapshots
  for each row execute function public.compartment_append_only();
create trigger projection_shadow_log_append_only before update or delete on public.projection_shadow_log
  for each row execute function public.compartment_append_only();

-- Remove one provider's projection compartment, recorded. Returns what was removed.
-- data_events rows are never removed: the purge record itself is kept.
create function public.projections_purge(p_provider text, p_reason text, p_approved_by text)
returns jsonb
language plpgsql set search_path = pg_catalog, public as $$
declare
  shadow_n integer;
  snap_n integer;
  removed_hash text;
begin
  if coalesce(p_reason, '') = '' or coalesce(p_approved_by, '') = '' then
    raise exception 'projections_purge: a reason and an approver are required' using errcode = '22023';
  end if;

  -- Waits for every snapshot insert in flight for this provider (they hold the lock shared), so the
  -- delete below sees them; inserts that start after the purge commits are new data.
  perform pg_advisory_xact_lock(hashtextextended('omen.compartment:projections:' || p_provider, 0));

  select 'sha256:' || encode(sha256(convert_to(coalesce(string_agg(s.id::text || ':' || s.source_ref, ',' order by s.id), ''), 'UTF8')), 'hex')
    into removed_hash from public.projection_snapshots s where s.provider = p_provider;

  perform set_config('omen.compartment_purge', 'on', true);
  delete from public.projection_shadow_log where provider = p_provider;
  get diagnostics shadow_n = row_count;
  delete from public.projection_snapshots where provider = p_provider;
  get diagnostics snap_n = row_count;
  perform set_config('omen.compartment_purge', '', true);

  insert into public.data_events (event, subject, provider, job, content_hash, row_count, reason, approved_by, details)
  values ('purge', 'projections:' || p_provider, p_provider, 'projections_purge v1', removed_hash, snap_n + shadow_n,
          p_reason, p_approved_by, jsonb_build_object('projection_snapshots', snap_n, 'projection_shadow_log', shadow_n));

  return jsonb_build_object('provider', p_provider, 'projection_snapshots', snap_n, 'projection_shadow_log', shadow_n,
                            'content_hash', removed_hash);
end $$;

alter table public.data_events enable row level security;
alter table public.projection_snapshots enable row level security;
alter table public.projection_shadow_log enable row level security;
revoke all on table public.data_events, public.projection_snapshots, public.projection_shadow_log from anon, authenticated;
grant all on table public.data_events, public.projection_snapshots, public.projection_shadow_log to service_role;
revoke all on sequence public.data_events_id_seq, public.projection_snapshots_id_seq, public.projection_shadow_log_id_seq
  from anon, authenticated;

do $$
declare f text;
begin
  foreach f in array array['public.projection_shadow_log_check()', 'public.projection_snapshots_check_ingest()',
                           'public.compartment_append_only()',
                           'public.projections_purge(text, text, text)']
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;

commit;
