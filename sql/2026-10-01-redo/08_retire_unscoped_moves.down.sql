-- REVIEW ONLY. Rollback for step 08: puts the retired moves rows back exactly (same ids, every column)
-- from the held copies, records the restore, and removes the holding table. Works only while the copies
-- exist (30 days). After retired_rows_purge_due() has removed them, this step cannot be undone, by design.
-- data_events keeps both the 'retire' and the 'restore' record; it is append-only.
begin;

do $$
begin
  if (select count(*) from public.retired_rows where source_table = 'moves') = 0 then
    raise exception 'step 08 rollback: no held copies remain; the retirement can no longer be undone';
  end if;
end $$;

insert into public.moves
select (jsonb_populate_record(null::public.moves, r.row_data)).*
  from public.retired_rows r where r.source_table = 'moves';

insert into public.data_events (event, subject, job, row_count, reason, approved_by)
select 'restore', 'moves', 'sql/2026-10-01-redo/08_retire_unscoped_moves.down.sql', count(*), 'step 08 rolled back', 'founder-approved rollback'
  from public.retired_rows where source_table = 'moves';

drop function if exists public.retired_rows_purge_due();
drop table if exists public.retired_rows;
commit;
