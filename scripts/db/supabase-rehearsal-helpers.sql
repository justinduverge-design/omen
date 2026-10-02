-- THROWAWAY SUPABASE PROJECT ONLY (omen-rls-proof-throwaway). NEVER RUN AGAINST PRODUCTION.
--
-- The same fingerprints as scripts/db/catalog.js, computed inside the database, so the redo can be
-- rehearsed on a real Supabase project through the Supabase connector without anyone handling the
-- project's database password. Lives in its own `rehearsal` schema; the catalog fingerprint reads
-- `public` only, so these helpers never appear in what they measure.

create schema if not exists rehearsal;
revoke all on schema rehearsal from public, anon, authenticated;

create table if not exists rehearsal.fixture (doc jsonb not null);   -- production-catalog-2026-10-01.json
create table if not exists rehearsal.fp (label text primary key, doc jsonb not null, taken_at timestamptz not null default now());

create or replace function rehearsal.catalog() returns jsonb language sql as $$
  select jsonb_build_object(
    'columns', (select jsonb_object_agg(k, v) from (
        select table_name k, string_agg(column_name || ':' || data_type || ':' || is_nullable
               || coalesce(':' || column_default, ''), ', ' order by ordinal_position) v
          from information_schema.columns where table_schema = 'public' group by table_name) c),
    'constraints', (select coalesce(jsonb_agg(v order by v), '[]') from (
        select conrelid::regclass::text || '|' || conname || '|' || pg_get_constraintdef(oid) v
          from pg_constraint where connamespace = 'public'::regnamespace and contype <> 't') x),
    'indexes', (select coalesce(jsonb_agg(v order by v), '[]') from (
        select tablename || '|' || indexdef v from pg_indexes where schemaname = 'public') x),
    'policies', (select coalesce(jsonb_agg(v order by v), '[]') from (
        select tablename || '|' || policyname || '|' || cmd || '|' || roles::text || '|'
               || coalesce(qual, '') || '|' || coalesce(with_check, '') v
          from pg_policies where schemaname = 'public') x),
    'acls', (select coalesce(jsonb_agg(v order by v), '[]') from (
        select 'table|' || relname || '|' || coalesce(relacl::text, '') v from pg_class
         where relnamespace = 'public'::regnamespace and relkind in ('r', 'v')
        union all
        select 'func|' || proname || '(' || pg_get_function_identity_arguments(oid) || ')|' || coalesce(proacl::text, '')
          from pg_proc where pronamespace = 'public'::regnamespace) x),
    'rls', (select coalesce(jsonb_agg(v order by v), '[]') from (
        select relname || '|' || relrowsecurity::text v from pg_class
         where relnamespace = 'public'::regnamespace and relkind = 'r') x),
    'triggers', (select coalesce(jsonb_agg(v order by v), '[]') from (
        select c.relname || '|' || t.tgname || '|' || pg_get_triggerdef(t.oid) v
          from pg_trigger t join pg_class c on c.oid = t.tgrelid
         where not t.tgisinternal and c.relnamespace = 'public'::regnamespace) x),
    'functions', (select coalesce(jsonb_agg(v order by v), '[]') from (
        select proname || '(' || pg_get_function_identity_arguments(oid) || ')|' || md5(pg_get_functiondef(oid)) v
          from pg_proc where pronamespace = 'public'::regnamespace) x),
    'views', (select coalesce(jsonb_agg(v order by v), '[]') from (
        select viewname || '|' || md5(definition) v from pg_views where schemaname = 'public') x))
$$;

-- Content hash of production's original tables over production's original columns, plus Vault.
create or replace function rehearsal.data() returns jsonb language plpgsql as $$
declare
  t text; spec text; cols text; n bigint; h text; out jsonb := '[]';
begin
  for t, spec in select key, value #>> '{}' from rehearsal.fixture f, jsonb_each(f.doc -> 'columns') loop
    select string_agg(quote_ident(split_part(c, ':', 1)), ', ') into cols from unnest(string_to_array(spec, ', ')) c;
    execute format('select count(*), coalesce(md5(string_agg(r::text, ''|'' order by r::text)), '''') from (select %s from public.%I) r', cols, t)
      into n, h;
    out := out || to_jsonb(format('%s|%s|%s', t, n, h));
  end loop;
  select count(*), coalesce(md5(string_agg(id::text || decrypted_secret, '|' order by id)), '') into n, h from vault.decrypted_secrets;
  out := out || to_jsonb(format('vault.secrets|%s|%s', n, h));
  return jsonb_build_object('data', (select jsonb_agg(x order by x) from jsonb_array_elements(out) x));
end $$;

create or replace function rehearsal.snap(p_label text) returns void language sql as $$
  insert into rehearsal.fp (label, doc) values (p_label, rehearsal.catalog() || rehearsal.data())
  on conflict (label) do update set doc = excluded.doc, taken_at = now();
$$;

-- Lines that differ between two fingerprints: '- ' only in a, '+ ' only in b.
create or replace function rehearsal.diff(a jsonb, b jsonb) returns setof text language sql as $$
  with keys as (select k from (select jsonb_object_keys(a) k union select jsonb_object_keys(b)) x where k not like '\_%'),
  lists as (
    select k, coalesce(case jsonb_typeof(a -> k) when 'object' then (select jsonb_agg(key || ': ' || (value #>> '{}')) from jsonb_each(a -> k)) else a -> k end, '[]') l,
              coalesce(case jsonb_typeof(b -> k) when 'object' then (select jsonb_agg(key || ': ' || (value #>> '{}')) from jsonb_each(b -> k)) else b -> k end, '[]') r
      from keys)
  select '- ' || k || ': ' || v from lists, jsonb_array_elements_text(l) v where not r ? v
  union all
  select '+ ' || k || ': ' || v from lists, jsonb_array_elements_text(r) v where not l ? v
$$;

create or replace function rehearsal.assert_same(p_a text, p_b text) returns text language plpgsql as $$
declare lines text;
begin
  select string_agg(d, E'\n') into lines from (
    select d from rehearsal.diff((select doc from rehearsal.fp where label = p_a), (select doc from rehearsal.fp where label = p_b)) d limit 20) x;
  if lines is not null then
    raise exception 'REHEARSAL FAIL: % differs from %:%', p_b, p_a, E'\n' || lines;
  end if;
  return format('same: %s = %s', p_a, p_b);
end $$;

-- The scratch snapshot's five production families vs the production catalog fixture.
create or replace function rehearsal.compare_production() returns text language plpgsql as $$
declare lines text; cat jsonb := rehearsal.catalog();
begin
  select string_agg(d, E'\n') into lines from (
    select d from rehearsal.diff(
      (select doc - '_source' from rehearsal.fixture),
      jsonb_build_object('columns', cat -> 'columns', 'constraints', cat -> 'constraints', 'indexes', cat -> 'indexes',
                         'policies', cat -> 'policies', 'acls', cat -> 'acls')) d limit 30) x;
  if lines is not null then
    raise exception 'REHEARSAL FAIL: snapshot differs from production (- production, + here):%', E'\n' || lines;
  end if;
  return 'snapshot matches production (columns, constraints, indexes, policies, ACLs)';
end $$;

-- Each SQL file stored once, transaction-control lines removed (the runner gives every phase its own
-- transaction or subtransaction), so the whole rehearsal runs server-side in one call.
create table if not exists rehearsal.files (name text primary key, body text not null);

create or replace function rehearsal.exec_file(p_name text) returns void language plpgsql as $$
declare b text;
begin
  select body into b from rehearsal.files where name = p_name;
  if b is null then raise exception 'REHEARSAL: file % not loaded', p_name; end if;
  execute b;
end $$;

-- Run a test file and roll its effects back, keeping any failure it raises.
create or replace function rehearsal.test_file(p_name text) returns void language plpgsql as $$
begin
  begin
    perform rehearsal.exec_file(p_name);
    raise exception 'REHEARSAL_ROLLBACK_MARKER';
  exception when others then
    if sqlerrm <> 'REHEARSAL_ROLLBACK_MARKER' then raise; end if;
  end;
  reset role;
end $$;

-- up -> tests -> down (must equal before) -> up (must equal first up), for every step, then a full
-- teardown that must equal the production snapshot. Returns one line per result.
create or replace function rehearsal.rehearse(p_steps text[]) returns setof text language plpgsql as $$
declare s text; prev text := 'base'; i int;
begin
  perform rehearsal.snap('base');
  foreach s in array p_steps loop
    perform rehearsal.exec_file(s || '.up');
    perform rehearsal.snap(s || '_up');
    perform rehearsal.test_file(s || '.test');
    perform rehearsal.snap(s || '_after_test');
    perform rehearsal.assert_same(s || '_up', s || '_after_test');
    perform rehearsal.exec_file(s || '.down');
    perform rehearsal.snap(s || '_down');
    perform rehearsal.assert_same(prev, s || '_down');
    perform rehearsal.exec_file(s || '.up');
    perform rehearsal.snap(s || '_reup');
    perform rehearsal.assert_same(s || '_up', s || '_reup');
    return next 'PASS ' || s || ': up, tests, down restores schema and data, up again identical';
    prev := s || '_up';
  end loop;
  for i in reverse array_length(p_steps, 1) .. 1 loop
    perform rehearsal.exec_file(p_steps[i] || '.down');
  end loop;
  perform rehearsal.snap('all_down');
  perform rehearsal.assert_same('base', 'all_down');
  return next 'PASS full teardown: equals the production snapshot again (schema and data)';
end $$;
