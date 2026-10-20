-- Step 18: trade calls graded over three horizons, not one week.
--
-- A trade is judged by what it did: the week it was made, the four weeks starting then, and the season so far.
-- decision_outcomes is written once and frozen, so the longer horizons live here and are updated each Tuesday
-- until each one closes (complete = true). Points are public stat lines in the call's scoring format, so
-- provenance is an estimate, never "verified". One row per (decision, horizon); deleting the decision (or the
-- account, step 10) removes them.

begin;

do $$
begin
  if to_regclass('public.decisions') is null then
    raise exception 'step 18 preflight: step 05 must be applied first';
  end if;
  if to_regclass('public.decision_horizon_grades') is not null then
    raise exception 'step 18 preflight: decision_horizon_grades already exists';
  end if;
end $$;

create table public.decision_horizon_grades (
  decision_id      uuid not null references public.decisions(id) on delete cascade,
  user_id          uuid not null,
  horizon          text not null check (horizon in ('week', 'next_4', 'season')),
  from_week        smallint not null check (from_week between 1 and 18),
  through_week     smallint not null check (through_week between 1 and 18),
  weeks_counted    smallint not null check (weeks_counted between 1 and 18),
  received_points  numeric(7, 2) not null,
  given_points     numeric(7, 2) not null,
  margin           numeric(7, 2) not null,
  result           text not null check (result in ('win', 'loss')),
  complete         boolean not null,
  provenance       text not null check (provenance = 'legacy_estimate'),
  scoring_format   text,
  updated_at       timestamptz not null default now(),
  primary key (decision_id, horizon),
  check (through_week >= from_week)
);

comment on table public.decision_horizon_grades is
  'Trade calls graded over the week, the next four weeks and the season so far (public stat lines in the call''s format). Updated by Tuesday scoring until complete.';

alter table public.decision_horizon_grades enable row level security;
create policy decision_horizon_grades_owner_read on public.decision_horizon_grades
  for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.decision_horizon_grades from public, anon, authenticated;
grant select on public.decision_horizon_grades to authenticated;
grant select, insert, update, delete on public.decision_horizon_grades to service_role;

create index decision_horizon_grades_user on public.decision_horizon_grades (user_id);

commit;
