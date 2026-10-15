-- SCRATCH ONLY. Assertions for step 16. Rolls back.
begin;

do $$
declare
  r record;
  idx text;
  n int := 0;
begin
  -- All three indexes exist and are valid.
  foreach idx in array array['projection_shadow_log_player_week', 'projection_shadow_log_league', 'projection_snapshots_league'] loop
    if not exists (select 1 from pg_index i join pg_class c on c.oid = i.indexrelid
                    where c.relnamespace = 'public'::regnamespace and c.relname = idx and i.indisvalid) then
      raise exception 'FAIL 16: index % is missing or invalid', idx;
    end if;
  end loop;

  -- Every foreign key on the two logs now has an index whose leading column is the FK column.
  for r in
    select con.conname, con.conrelid::regclass as tbl, con.conkey[1] as col
      from pg_constraint con
     where con.contype = 'f' and con.conrelid in ('public.projection_snapshots'::regclass, 'public.projection_shadow_log'::regclass)
  loop
    if not exists (select 1 from pg_index i where i.indrelid = r.tbl and i.indisvalid and i.indkey[0] = r.col) then
      raise exception 'FAIL 16: foreign key % on % has no index with it as the leading column', r.conname, r.tbl;
    end if;
    n := n + 1;
  end loop;
  if n < 5 then raise exception 'FAIL 16: expected at least 5 foreign keys on the projection logs, found %', n; end if;

  -- No client role gained anything: indexes carry no privileges.
  if has_table_privilege('anon', 'public.projection_shadow_log', 'select')
     or has_table_privilege('authenticated', 'public.projection_snapshots', 'select') then
    raise exception 'FAIL 16: a client role can read a projection log';
  end if;
end $$;

rollback;
