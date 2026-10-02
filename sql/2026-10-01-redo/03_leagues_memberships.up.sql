-- REVIEW ONLY. NOT APPLIED. Facts-of-record #8.
--
-- Step 03 — leagues and which of them each person follows. Makes a multi-league choice survive the
-- session (review finding 4) and separates the CREDENTIAL (platform_connections, one per person per
-- provider) from the LEAGUES that credential can see (many per provider).
--
-- Supersedes `sql/2026-09-03_multi_league_follows_review.sql` (never applied). Differences: leagues are
-- shared rows keyed by (provider, provider_league_id, season), as the Gate 1 blueprint decided; the
-- membership points at the connection it came through, so disconnecting a provider removes its
-- memberships in the same transaction; the active selection lives on the membership instead of on the
-- connection; and every write goes through one function, so a multiselect is all-or-nothing.
--
-- Contracts served: league-directory.v1 (is_followed, is_active, team_id, team_name, league_name,
-- season, scoring_format), league-active-selection.v1 (selection_persistence "explicit"),
-- league-follows (follow_persistence "explicit").
--
-- Backfill: one league + one membership per existing connection that has a real league id (the
-- Yahoo "yahoo" placeholder is skipped). Season is 2026; the preflight refuses to run outside the 2026
-- season window rather than guess a season. platform_connections is not modified.
--
-- Clients get nothing: RLS on, no policies, all privileges revoked from anon/authenticated
-- (Supabase's defaults would otherwise grant them full access). The server uses service_role.

begin;

do $$
begin
  if to_regclass('public.leagues') is not null or to_regclass('public.league_memberships') is not null then
    raise exception 'step 03 preflight: leagues or league_memberships already exists';
  end if;
  if now() < '2026-08-01' or now() >= '2027-03-01' then
    raise exception 'step 03 preflight: backfill assigns season 2026 and today is outside that window; revise the file';
  end if;
end $$;

create table public.leagues (
  id                 uuid primary key default gen_random_uuid(),
  provider           text not null check (provider in ('sleeper', 'espn', 'yahoo')),
  provider_league_id text not null check (provider_league_id <> '' and provider_league_id <> provider),
  season             integer not null check (season between 2000 and 2100),
  name               text,
  team_count         integer check (team_count between 2 and 32),
  scoring_format     text,   -- display label from the provider, null when unread; never a default
  first_seen_at      timestamptz not null default now(),
  last_synced_at     timestamptz,
  constraint leagues_provider_league_season_key unique (provider, provider_league_id, season)
);
comment on table public.leagues is
  'One row per real provider league per season, shared by every Omen user in it. Holds no scoring rules (A6 rights question open).';

create table public.league_memberships (
  user_id             uuid not null references public.users(id) on delete cascade,
  league_id           uuid not null references public.leagues(id) on delete restrict,
  connection_id       uuid not null references public.platform_connections(id) on delete cascade,
  provider_team_id    text,
  team_name           text,
  is_followed         boolean not null default true,
  is_active_selection boolean not null default false,
  sort_order          integer,
  source              text not null check (source in ('connect', 'follow', 'backfill')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  primary key (user_id, league_id),
  constraint league_memberships_active_is_followed check (not is_active_selection or is_followed)
);
create unique index league_memberships_one_active_per_user on public.league_memberships (user_id) where is_active_selection;
create index league_memberships_connection on public.league_memberships (connection_id);
create index league_memberships_league on public.league_memberships (league_id);
comment on table public.league_memberships is
  'Which leagues a person follows, through which connection, with which team. is_active_selection is the league every surface shows.';

-- A membership must come through the same person's connection to the same provider.
create function public.league_memberships_check_connection() returns trigger
language plpgsql set search_path = pg_catalog, public as $$
declare conn_user uuid; conn_platform text; league_provider text;
begin
  select user_id, platform into conn_user, conn_platform from public.platform_connections where id = new.connection_id;
  select provider into league_provider from public.leagues where id = new.league_id;
  if conn_user is distinct from new.user_id then
    raise exception 'league_memberships: connection belongs to another user' using errcode = '23514';
  end if;
  if conn_platform is distinct from league_provider then
    raise exception 'league_memberships: % connection cannot hold a % league', conn_platform, league_provider using errcode = '23514';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger league_memberships_check_connection
  before insert or update on public.league_memberships
  for each row execute function public.league_memberships_check_connection();

-- Replace the followed set for ONE provider and season, all-or-nothing. Leagues not in p_entries are
-- marked unfollowed, not deleted (their history and team identity stay). If the active selection is
-- unfollowed it is cleared. p_entries: [{league_id, team_id, league_name, team_name, scoring_format,
-- team_count, sort_order}]; the caller has already verified each league with the provider.
create function public.league_follows_replace(p_user_id uuid, p_platform text, p_season integer, p_entries jsonb)
returns integer
language plpgsql set search_path = pg_catalog, public as $$
declare
  conn_id uuid;
  entry jsonb;
  lid uuid;
  kept uuid[] := '{}';
  idx integer := 0;
begin
  if jsonb_typeof(p_entries) is distinct from 'array' then
    raise exception 'league_follows_replace: entries must be a JSON array' using errcode = '22023';
  end if;
  select id into conn_id from public.platform_connections
   where user_id = p_user_id and platform = p_platform and is_active for update;
  if conn_id is null then
    raise exception 'league_follows_replace: no active % connection for this user', p_platform using errcode = 'P0002';
  end if;

  for entry in select value from jsonb_array_elements(p_entries) loop
    insert into public.leagues as l (provider, provider_league_id, season, name, team_count, scoring_format, last_synced_at)
    values (p_platform, entry->>'league_id', p_season, entry->>'league_name',
            nullif(entry->>'team_count', '')::integer, entry->>'scoring_format', now())
    on conflict (provider, provider_league_id, season) do update set
      name = coalesce(excluded.name, l.name),
      team_count = coalesce(excluded.team_count, l.team_count),
      scoring_format = coalesce(excluded.scoring_format, l.scoring_format),
      last_synced_at = now()
    returning l.id into lid;

    insert into public.league_memberships as m
      (user_id, league_id, connection_id, provider_team_id, team_name, is_followed, sort_order, source)
    values (p_user_id, lid, conn_id, entry->>'team_id', entry->>'team_name', true,
            coalesce(nullif(entry->>'sort_order', '')::integer, idx), 'follow')
    on conflict (user_id, league_id) do update set
      connection_id = excluded.connection_id,
      provider_team_id = coalesce(excluded.provider_team_id, m.provider_team_id),
      team_name = coalesce(excluded.team_name, m.team_name),
      is_followed = true,
      sort_order = excluded.sort_order;

    kept := kept || lid;
    idx := idx + 1;
  end loop;

  update public.league_memberships m
     set is_followed = false, is_active_selection = false
    from public.leagues l
   where m.league_id = l.id and m.user_id = p_user_id and l.provider = p_platform and l.season = p_season
     and not (m.league_id = any (kept));

  return idx;
end $$;

-- Make one followed league the active one, atomically (clear, then set, in one transaction).
create function public.league_select_active(p_user_id uuid, p_platform text, p_provider_league_id text, p_season integer)
returns uuid
language plpgsql set search_path = pg_catalog, public as $$
declare lid uuid;
begin
  select m.league_id into lid
    from public.league_memberships m join public.leagues l on l.id = m.league_id
   where m.user_id = p_user_id and l.provider = p_platform and l.provider_league_id = p_provider_league_id
     and l.season = p_season and m.is_followed
   for update of m;
  if lid is null then
    raise exception 'league_select_active: not a followed league for this user' using errcode = 'P0002';
  end if;
  update public.league_memberships set is_active_selection = false where user_id = p_user_id and is_active_selection and league_id <> lid;
  update public.league_memberships set is_active_selection = true where user_id = p_user_id and league_id = lid;
  return lid;
end $$;

-- Backfill from the existing connections.
insert into public.leagues (provider, provider_league_id, season)
select distinct pc.platform, pc.league_id, 2026
  from public.platform_connections pc
 where pc.league_id <> pc.platform and pc.league_id <> ''
on conflict (provider, provider_league_id, season) do nothing;

insert into public.league_memberships (user_id, league_id, connection_id, provider_team_id, is_followed, is_active_selection, sort_order, source)
select pc.user_id, l.id, pc.id,
       case when pc.platform = 'espn' then pc.espn_team_id end,
       true, coalesce(pc.is_selected, false), 0, 'backfill'
  from public.platform_connections pc
  join public.leagues l on l.provider = pc.platform and l.provider_league_id = pc.league_id and l.season = 2026
 where pc.user_id is not null;

do $$
declare eligible int; made int;
begin
  select count(*) into eligible from public.platform_connections where league_id <> platform and league_id <> '' and user_id is not null;
  select count(*) into made from public.league_memberships where source = 'backfill';
  if eligible <> made then
    raise exception 'step 03 backfill: % eligible connections but % memberships', eligible, made;
  end if;
  raise notice 'step 03 backfill: % leagues, % memberships', (select count(*) from public.leagues), made;
end $$;

alter table public.leagues enable row level security;
alter table public.league_memberships enable row level security;
revoke all on table public.leagues, public.league_memberships from anon, authenticated;
grant all on table public.leagues, public.league_memberships to service_role;

do $$
declare f text;
begin
  foreach f in array array[
    'public.league_memberships_check_connection()',
    'public.league_follows_replace(uuid, text, integer, jsonb)',
    'public.league_select_active(uuid, text, text, integer)']
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;

commit;
