-- REVIEW ONLY. NOT APPLIED. Facts-of-record #8.
--
-- Step 08 — remove the Ledger rows that belong to no league. Founder decision 2026-10-01: "if it's
-- league unknown, let's just delete it. I don't think that's good data. We can't solve who it owns."
--
-- Measured 2026-10-01: 6 of production's 9 `moves` rows have no platform/league_id. The other 3 were
-- copied into the new Ledger by step 05. This step:
--   1. aborts unless EXACTLY 6 such rows exist (the number the founder approved), and unless step 05
--      has already copied every league-scoped row — so it can never delete more than was decided;
--   2. copies the 6 rows, every column, into retired_rows, with a 30-day purge date;
--   3. writes a 'retire' record to data_events with the count, a hash of the rows, the reason and the
--      approver;
--   4. deletes them from moves.
-- After 30 days, `retired_rows_purge_due()` removes the held copy and records that too. Until then the
-- down file restores the rows exactly. The held copy follows the person: deleting an account deletes it.

begin;

do $$
declare unscoped int; scoped int; copied int;
begin
  if to_regclass('public.retired_rows') is not null then
    raise exception 'step 08 preflight: retired_rows already exists';
  end if;
  if to_regclass('public.decisions') is null or to_regclass('public.data_events') is null then
    raise exception 'step 08 preflight: steps 05 and 06 must be applied first';
  end if;
  select count(*) into unscoped from public.moves where platform is null or league_id is null;
  if unscoped <> 6 then
    raise exception 'step 08 preflight: % unscoped moves found; the founder approved deleting exactly 6. Stop and ask again', unscoped;
  end if;
  select count(*) into scoped from public.moves where platform is not null and league_id is not null;
  select count(*) into copied from public.decisions where legacy_move_id is not null;
  if copied <> scoped then
    raise exception 'step 08 preflight: % scoped moves but % copied into decisions; run step 05 first', scoped, copied;
  end if;
end $$;

create table public.retired_rows (
  id            bigint generated always as identity primary key,
  data_event_id bigint not null references public.data_events(id) on delete restrict,
  source_table  text not null,
  row_id        uuid not null,
  user_id       uuid references public.users(id) on delete cascade,
  row_data      jsonb not null check (jsonb_typeof(row_data) = 'object'),
  retired_at    timestamptz not null default now(),
  purge_after   timestamptz not null,
  constraint retired_rows_unique unique (source_table, row_id)
);
comment on table public.retired_rows is
  'Exact copies of deleted rows, held until purge_after so a retirement can be undone. Purged by retired_rows_purge_due().';

with doomed as (
  select m.* from public.moves m where m.platform is null or m.league_id is null
), ev as (
  insert into public.data_events (event, subject, job, content_hash, row_count, reason, approved_by, details)
  select 'retire', 'moves', 'sql/2026-10-01-redo/08_retire_unscoped_moves.up.sql',
         'sha256:' || encode(sha256(convert_to(string_agg(to_jsonb(d)::text, ',' order by d.id), 'UTF8')), 'hex'),
         count(*), 'Ledger rows with no league: owner league cannot be determined', 'founder (2026-10-01, in session)',
         jsonb_build_object('purge_after_days', 30)
    from doomed d
  returning id
)
insert into public.retired_rows (data_event_id, source_table, row_id, user_id, row_data, purge_after)
select ev.id, 'moves', d.id, d.user_id, to_jsonb(d), now() + interval '30 days'
  from doomed d cross join ev;

delete from public.moves where platform is null or league_id is null;

do $$
begin
  if (select count(*) from public.retired_rows where source_table = 'moves') <> 6 then
    raise exception 'step 08: expected 6 held copies';
  end if;
  if exists (select 1 from public.moves where platform is null or league_id is null) then
    raise exception 'step 08: unscoped moves remain';
  end if;
end $$;

-- Remove held copies whose 30 days have passed, and record it. Safe to run any time (e.g. weekly).
create function public.retired_rows_purge_due() returns integer
language plpgsql set search_path = pg_catalog, public as $$
declare n integer; h text;
begin
  select 'sha256:' || encode(sha256(convert_to(coalesce(string_agg(source_table || ':' || row_id::text, ',' order by id), ''), 'UTF8')), 'hex')
    into h from public.retired_rows where purge_after <= now();
  delete from public.retired_rows where purge_after <= now();
  get diagnostics n = row_count;
  if n > 0 then
    insert into public.data_events (event, subject, job, content_hash, row_count, reason, approved_by)
    values ('purge', 'retired_rows', 'retired_rows_purge_due v1', h, n, 'holding period ended', 'standing rule: 30-day hold (founder, 2026-10-01)');
  end if;
  return n;
end $$;

alter table public.retired_rows enable row level security;
revoke all on table public.retired_rows from anon, authenticated;
grant all on table public.retired_rows to service_role;
revoke all on sequence public.retired_rows_id_seq from anon, authenticated;
revoke all on function public.retired_rows_purge_due() from public, anon, authenticated;
grant execute on function public.retired_rows_purge_due() to service_role;

commit;
