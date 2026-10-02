-- SCRATCH ONLY. Assertions for step 08. Rolls back.
begin;

do $$
declare n int;
begin
  if (select count(*) from public.moves) <> 3 then raise exception 'FAIL 08: expected the 3 scoped moves to remain'; end if;
  if (select count(*) from public.retired_rows) <> 6 then raise exception 'FAIL 08: expected 6 held copies'; end if;
  if not exists (select 1 from public.data_events where event = 'retire' and subject = 'moves' and row_count = 6
                  and approved_by is not null and content_hash is not null) then
    raise exception 'FAIL 08: retirement not recorded';
  end if;
  -- Copies are exact: every column survives the round trip.
  if exists (select 1 from public.retired_rows r
              where (jsonb_populate_record(null::public.moves, r.row_data)).id <> r.row_id) then
    raise exception 'FAIL 08: held copy does not round-trip';
  end if;
  -- Nothing is purged before its 30 days.
  if public.retired_rows_purge_due() <> 0 then raise exception 'FAIL 08: copies purged early'; end if;
  -- After 30 days, the purge removes them and records it.
  update public.retired_rows set purge_after = now() - interval '1 second';
  n := public.retired_rows_purge_due();
  if n <> 6 then raise exception 'FAIL 08: purge removed % copies', n; end if;
  if not exists (select 1 from public.data_events where event = 'purge' and subject = 'retired_rows' and row_count = 6) then
    raise exception 'FAIL 08: purge not recorded';
  end if;
  if has_table_privilege('authenticated', 'public.retired_rows', 'select') then
    raise exception 'FAIL 08: a client role can read retired rows';
  end if;
end $$;

rollback;
