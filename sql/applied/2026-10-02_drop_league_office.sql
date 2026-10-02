-- APPLIED to production 2026-10-02 23:12 UTC as migration 20261002231212 `drop_league_office`.
-- History, not instructions: never re-run (its preflight refuses once the tables are gone).
--
-- Drop the seven League Office tables. League Office is retired (Direction/decision_log.md,
-- 2026-10-02); its code was removed in PR #515 (merge 405f5988) and deployed at 23:08 UTC. The
-- worker's 23:10 tick did not run (last activity 23:05:02) before this was applied.
--
-- Rehearsed on scratch Postgres 17 (00a+00b+00d+00c): drops all seven; a second run refuses; a
-- dependent view makes it abort with all seven intact. After applying: 0 league_office relations,
-- 8 public tables remain, /api/health ok, and a fresh read-only catalog read equals the updated
-- production-catalog fixture; scripts/db/rehearse-redo.sh passes steps 01-10 on it.
--
-- Founder approval: 2026-10-02, in session ("drop it, its approved just drop it"), after choosing
-- an outright drop over archive-first. No down migration: the data (29 rows on 2026-10-02, the
-- Slops Saloon league only) is deliberately discarded.
--
-- Blast radius, read from production 2026-10-02: only outbound FKs (user_id -> users); no inbound
-- FKs, views, rules, triggers, functions, policies or publications reference these tables.
--
-- One statement, so it is one transaction: the preflight aborts and nothing is dropped if the set
-- of tables differs, anything outside it depends on them, or the row count is not what we expect.
-- The drops use RESTRICT, so an unforeseen dependency also aborts instead of cascading.
do $$
declare
  expected text[] := array[
    'league_office_accolades', 'league_office_awards', 'league_office_executives',
    'league_office_lines', 'league_office_matchups', 'league_office_rivalries',
    'league_office_sync_jobs'];
  found text[];
  dependents int;
  total bigint := 0;
  n bigint;
  t text;
begin
  select coalesce(array_agg(c.relname::text order by c.relname), '{}') into found
  from pg_class c join pg_namespace s on s.oid = c.relnamespace
  where s.nspname = 'public' and c.relname like 'league\_office\_%' and c.relkind in ('r', 'p', 'v', 'm', 'f');
  if found is distinct from expected then
    raise exception 'preflight: league_office tables are %, expected %', found, expected;
  end if;

  select count(*) into dependents from (
    select 1 from pg_constraint
    where contype = 'f'
      and confrelid = any (select ('public.' || x)::regclass from unnest(expected) x)
      and conrelid <> all (select ('public.' || x)::regclass from unnest(expected) x)
    union all
    select 1 from pg_depend d join pg_rewrite r on r.oid = d.objid
    where d.refobjid = any (select ('public.' || x)::regclass from unnest(expected) x)
      and r.ev_class <> all (select ('public.' || x)::regclass from unnest(expected) x)
    union all
    select 1 from pg_proc p join pg_namespace s on s.oid = p.pronamespace
    where s.nspname not in ('pg_catalog', 'information_schema') and p.prosrc ilike '%league_office%'
  ) deps;
  if dependents > 0 then
    raise exception 'preflight: % object(s) outside League Office depend on its tables', dependents;
  end if;

  foreach t in array expected loop
    execute format('select count(*) from public.%I', t) into n;
    total := total + n;
  end loop;
  -- 29 on 2026-10-02. The worker may add a few rows before the deploy that removes it lands.
  if total > 200 then
    raise exception 'preflight: % rows across League Office tables, expected about 29', total;
  end if;
  raise notice 'dropping % League Office tables holding % rows', array_length(expected, 1), total;

  foreach t in array expected loop
    execute format('drop table public.%I restrict', t);
  end loop;

  if exists (select 1 from pg_class c join pg_namespace s on s.oid = c.relnamespace
             where s.nspname = 'public' and c.relname like 'league\_office\_%') then
    raise exception 'postcheck: a league_office relation still exists';
  end if;
end
$$;
