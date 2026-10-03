-- REVIEW ONLY. NOT APPLIED. Facts-of-record #8.
--
-- Step 11 — each league's scoring rules, kept in their own deletable compartment.
--
-- Founder decision, 2026-10-02 (night; decision log; closes plan B8):
--   * Keep storing each league's scoring rules, for all three providers.
--   * Record WHY they are used, not a rights argument. Omen uses them to:
--       - grade every call against the league's own scoring, not a PPR default (A6 exact reconciliation);
--       - advise in the format the league actually plays.
--   * Store them the way ESPN projections are stored (step 06): their own table, a recorded ingest, and one
--     recorded purge that deletes them. Deleting the compartment must leave everything else working. Calls
--     keep only the rules' version and hash (decisions.scoring_contract_version / scoring_contract_hash,
--     step 05), never a foreign key to the rule body.
--
--   league_scoring_rules   one row per distinct rule set a league used in a season: the contract body as
--                          stored today (moves.scoring_contract), its contract version and hash, the uses it
--                          is kept for, and the data_events ingest that wrote it. A changed rule set is a new
--                          row (new hash); rows are never rewritten.
--   scoring_rules_purge(provider, reason, approved_by)
--                          deletes one provider's rule sets in one transaction and records a 'purge' event with
--                          the count and a hash of what was removed, exactly as projections_purge does.
--
-- Backfill: the distinct rule sets on today's league-scoped moves, one ingest event per provider. Moves with
-- no league (the 6 that step 08 retires) cannot be keyed to a league and are not copied; their rule bodies
-- stay on the moves rows and leave with them. moves is not changed.
--
-- Rules are scoped to a LEAGUE, not a person: they are not erased with an account (step 10), and a league
-- shared by two Omen users has one copy.
--
-- Requires steps 03 (leagues) and 06 (data_events, compartment_append_only). Server-only: RLS on, no
-- policies, client privileges revoked.

begin;

do $$
begin
  if to_regclass('public.leagues') is null or to_regclass('public.data_events') is null
     or not exists (select 1 from pg_proc where proname = 'compartment_append_only' and pronamespace = 'public'::regnamespace) then
    raise exception 'step 11 preflight: steps 03 and 06 must be applied first';
  end if;
  if to_regclass('public.league_scoring_rules') is not null then
    raise exception 'step 11 preflight: league_scoring_rules already exists';
  end if;
end $$;

create table public.league_scoring_rules (
  id               bigint generated always as identity primary key,
  ingest_event_id  bigint not null references public.data_events(id) on delete restrict,
  provider         text not null check (provider in ('sleeper', 'espn', 'yahoo')),
  league_id        uuid not null references public.leagues(id) on delete restrict,
  season           integer not null check (season between 2000 and 2100),
  contract_version text not null check (contract_version <> ''),
  contract_hash    text not null check (contract_hash <> ''),
  rules            jsonb not null check (jsonb_typeof(rules) = 'object'),
  uses             text[] not null default array['grading', 'advice']
                     check (cardinality(uses) > 0 and uses <@ array['grading', 'advice']),
  fetched_at       timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  constraint league_scoring_rules_one_per_hash unique (league_id, season, contract_hash)
);
create index league_scoring_rules_ingest on public.league_scoring_rules (ingest_event_id);
comment on table public.league_scoring_rules is
  'Each league''s scoring rules, kept to grade calls against the league''s own scoring (grading) and to advise in its real format (advice). A deletable compartment: scoring_rules_purge(provider, reason, approved_by). Calls keep only version and hash.';
comment on column public.league_scoring_rules.uses is
  'Why the rules are kept: grading = grade each call against the league''s own scoring (A6); advice = advise in the format the league plays.';

-- A row must cite an ingest of the scoring-rules compartment for its own provider, and its provider must be
-- its league's provider. The foreign key alone would accept any data_events row (the step 06 lesson, plan A4).
create function public.league_scoring_rules_check_insert() returns trigger
language plpgsql set search_path = pg_catalog, public as $$
declare ev public.data_events%rowtype; league_provider text;
begin
  select * into ev from public.data_events where id = new.ingest_event_id;
  if found and (ev.event <> 'ingest' or ev.provider is distinct from new.provider
                or ev.subject <> 'scoring_rules:' || new.provider) then
    raise exception 'league_scoring_rules: event % is not a scoring-rules ingest for %', new.ingest_event_id, new.provider
      using errcode = '23514';
  end if;
  select provider into league_provider from public.leagues where id = new.league_id;
  if found and league_provider <> new.provider then
    raise exception 'league_scoring_rules: league % belongs to %, not %', new.league_id, league_provider, new.provider
      using errcode = '23514';
  end if;
  return new;
end $$;
create trigger league_scoring_rules_check_insert before insert on public.league_scoring_rules
  for each row execute function public.league_scoring_rules_check_insert();

-- Append-only, except inside a purge (the same transaction-local flag as the projections compartment).
create trigger league_scoring_rules_append_only before update or delete on public.league_scoring_rules
  for each row execute function public.compartment_append_only();

-- Remove one provider's scoring-rules compartment, recorded. Returns what was removed.
create function public.scoring_rules_purge(p_provider text, p_reason text, p_approved_by text)
returns jsonb
language plpgsql set search_path = pg_catalog, public as $$
declare
  rules_n integer;
  removed_hash text;
begin
  if coalesce(p_reason, '') = '' or coalesce(p_approved_by, '') = '' then
    raise exception 'scoring_rules_purge: a reason and an approver are required' using errcode = '22023';
  end if;

  select 'sha256:' || encode(sha256(convert_to(coalesce(string_agg(r.id::text || ':' || r.contract_hash, ',' order by r.id), ''), 'UTF8')), 'hex')
    into removed_hash from public.league_scoring_rules r where r.provider = p_provider;

  perform set_config('omen.compartment_purge', 'on', true);
  delete from public.league_scoring_rules where provider = p_provider;
  get diagnostics rules_n = row_count;
  perform set_config('omen.compartment_purge', '', true);

  insert into public.data_events (event, subject, provider, job, content_hash, row_count, reason, approved_by, details)
  values ('purge', 'scoring_rules:' || p_provider, p_provider, 'scoring_rules_purge v1', removed_hash, rules_n,
          p_reason, p_approved_by, jsonb_build_object('league_scoring_rules', rules_n));

  return jsonb_build_object('provider', p_provider, 'league_scoring_rules', rules_n, 'content_hash', removed_hash);
end $$;

-- Backfill from moves (copy; moves is untouched) --------------------------------------------------

drop table if exists pg_temp.step11_backfill;
create temporary table step11_backfill on commit drop as
select distinct on (l.id, m.season, m.scoring_contract_hash)
       l.provider, l.id as league_id, m.season, m.scoring_contract_version, m.scoring_contract_hash,
       m.scoring_contract, m.created_at
  from public.moves m
  join public.leagues l on l.provider = m.platform and l.provider_league_id = m.league_id and l.season = m.season
 where m.scoring_contract is not null and jsonb_typeof(m.scoring_contract) = 'object'
   and coalesce(m.scoring_contract_version, '') <> '' and coalesce(m.scoring_contract_hash, '') <> ''
 order by l.id, m.season, m.scoring_contract_hash, m.created_at desc nulls last;

insert into public.data_events (event, subject, provider, rights_basis, job, source_ref, row_count, details)
select 'ingest', 'scoring_rules:' || b.provider, b.provider,
       case b.provider when 'sleeper' then 'sleeper_public_api' else b.provider || '_user_connection' end,
       'sql/2026-10-01-redo/11_league_scoring_rules.up.sql backfill from moves.scoring_contract',
       'sha256:' || encode(sha256(convert_to(string_agg(b.league_id::text || ':' || b.season || ':' || b.scoring_contract_hash, ','
                                              order by b.league_id, b.season, b.scoring_contract_hash), 'UTF8')), 'hex'),
       count(*), jsonb_build_object('source', 'moves.scoring_contract')
  from step11_backfill b
 group by b.provider;

insert into public.league_scoring_rules (ingest_event_id, provider, league_id, season, contract_version, contract_hash, rules, fetched_at)
select e.id, b.provider, b.league_id, b.season, b.scoring_contract_version, b.scoring_contract_hash, b.scoring_contract,
       coalesce(b.created_at, now())
  from step11_backfill b
  join lateral (select id from public.data_events
                 where event = 'ingest' and subject = 'scoring_rules:' || b.provider
                   and job like 'sql/2026-10-01-redo/11_%' order by id desc limit 1) e on true;

-- Every league-scoped move's rule set arrived.
do $$
declare expected integer; got integer;
begin
  select count(*) into expected from pg_temp.step11_backfill;
  select count(*) into got from public.league_scoring_rules;
  if got <> expected then
    raise exception 'step 11 backfill: % rule sets copied, % expected', got, expected;
  end if;
end $$;

alter table public.league_scoring_rules enable row level security;
revoke all on table public.league_scoring_rules from anon, authenticated;
grant all on table public.league_scoring_rules to service_role;
revoke all on sequence public.league_scoring_rules_id_seq from anon, authenticated;

do $$
declare f text;
begin
  foreach f in array array['public.league_scoring_rules_check_insert()', 'public.scoring_rules_purge(text, text, text)']
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;

commit;
