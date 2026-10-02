-- REVIEW ONLY. NOT APPLIED. Facts-of-record #8.
--
-- Step 05 — the Ledger: what Omen said, why, what the person did, and what happened. Four tables:
--
--   decisions          one row per issued call, never changed after insert. Keyed to a league and a
--                      team, so two leagues in one week are two calls (review finding 1). Asking again
--                      in the same week adds a row that SUPERSEDES the earlier one; the earlier one
--                      stays, so the Ledger can show what was said and when.
--   decision_factors   the evidence rows as they stood at issue time, insert-only. Each row carries its
--                      label (Projected / Observed context / Could change this), whether it was used,
--                      its contribution if it moved the number, its sample size, source and as-of.
--   decision_actions   what the person says they did. The only mutable table; provenance is explicit.
--   decision_outcomes  what happened, written by Tuesday scoring. No row = still pending. Fixes review
--                      finding 2: the scored result and scored_at live here, not on moves.
--
-- Confidence: the band is stored AS ISSUED with its drivers (`confident | leaning | coin_flip`, the
-- shipped names in omen-decision-brief.v3). A week with no call is not a band: there is no decisions
-- row for it, and a call issued without a band records band_unavailable_reason instead (the contract's
-- `unavailable_reason`). The engine's internal number is kept in internal_score for audit and backtests
-- and is never served. This stores both things the two earlier decisions asked for: the Gate 1 lock
-- (2026-09-29: "the raw number is stored") and the slice plan (2026-09-30: "the band is written at
-- issue time"). It does NOT derive the band at read time — see design doc §6 for why.
--
-- Immutability is enforced by triggers, because service_role bypasses RLS. The one exception is
-- erasure: account deletion calls public.ledger_erase_user(), which sets a transaction-local flag the
-- triggers honour. Any other path that would delete Ledger rows (including a cascade from users)
-- fails loudly instead of silently erasing history.
--
-- Backfill: moves rows that carry platform + league_id (3 of 9 on 2026-10-01) are copied, with their
-- feedback and outcome. The 6 rows without a league stay in `moves` only; moves is not modified.
--
-- Server-only: RLS on, no policies, client privileges revoked.

begin;

do $$
begin
  if to_regclass('public.decisions') is not null then
    raise exception 'step 05 preflight: decisions already exists';
  end if;
  if to_regclass('public.leagues') is null or to_regclass('public.players') is null then
    raise exception 'step 05 preflight: steps 03 and 04 must be applied first';
  end if;
end $$;

create table public.decisions (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid not null references public.users(id) on delete cascade,
  league_id                   uuid not null references public.leagues(id) on delete restrict,
  provider_team_id            text,
  season                      integer not null check (season between 2000 and 2100),
  week                        integer not null check (week between 1 and 22),
  call_type                   text not null check (call_type in ('start_sit', 'waiver_pickup', 'trade_suggestion', 'hold', 'legacy')),
  contract_version            text not null,
  engine_version              text not null,
  band                        text check (band in ('confident', 'leaning', 'coin_flip')),
  band_drivers                jsonb not null default '[]' check (jsonb_typeof(band_drivers) = 'array'),
  band_unavailable_reason     text,
  internal_score              numeric,
  risk_level                  text check (risk_level in ('low', 'medium', 'high')),
  risk_reasons                jsonb not null default '[]' check (jsonb_typeof(risk_reasons) = 'array'),
  headline                    text not null check (headline <> ''),
  summary                     text,
  primary_player_id           text references public.players(id) on delete restrict,
  comparison_player_id        text references public.players(id) on delete restrict,
  expected_value_delta        numeric,
  recommendation              jsonb not null check (jsonb_typeof(recommendation) = 'object'),
  scoring_format              text,
  scoring_contract_version    text,
  scoring_contract_hash       text,
  provider_rule_snapshot_hash text,
  scoring_coverage_state      text check (scoring_coverage_state in
                                ('supported', 'provider_adjusted', 'provider_restricted', 'unsupported', 'ambiguous', 'mismatch', 'pending')),
  issued_at                   timestamptz not null default now(),
  issued_at_timezone          text not null default 'UTC',
  request_id                  text,
  -- NO ACTION (checked at end of statement), not RESTRICT: erasure deletes a person's whole chain at once.
  supersedes_id               uuid references public.decisions(id) on delete no action,
  legacy_move_id              uuid unique,
  created_at                  timestamptz not null default now(),
  -- A band never travels without its drivers; a call without a band says why.
  constraint decisions_band_or_reason check (
    (band is not null and jsonb_array_length(band_drivers) > 0 and band_unavailable_reason is null)
    or (band is null and band_unavailable_reason is not null)),
  constraint decisions_team_known check (provider_team_id is not null or call_type = 'legacy'),
  constraint decisions_no_self_supersede check (supersedes_id is distinct from id)
);
create unique index decisions_superseded_once on public.decisions (supersedes_id) where supersedes_id is not null;
create index decisions_team_week on public.decisions (user_id, league_id, provider_team_id, season, week, issued_at desc);
create index decisions_user_issued on public.decisions (user_id, issued_at desc);
create index decisions_league on public.decisions (league_id);
comment on column public.decisions.internal_score is 'Engine-internal number, kept for audit and backtests. Never sent to any client.';
comment on column public.decisions.recommendation is 'The recommendation object exactly as served (contract-shaped). No credentials, ever.';

create table public.decision_factors (
  id                  uuid primary key default gen_random_uuid(),
  decision_id         uuid not null references public.decisions(id) on delete cascade,
  user_id             uuid not null,
  position            smallint not null check (position >= 0),
  factor_key          text not null,
  family              text,
  line_label          text check (line_label in ('projected', 'observed_context', 'could_change_this', 'adjusts_projection')),
  evidence_kind       text not null check (evidence_kind in ('verified', 'projection', 'model', 'inference', 'limitation')),
  used                boolean not null,
  statement           text not null,
  contribution_points numeric,
  range_lo            numeric,
  range_hi            numeric,
  direction           text check (direction in ('for', 'against', 'neutral')),
  sample_size         integer check (sample_size >= 0),
  source              text not null,
  source_as_of        timestamptz,
  reason_code         text,
  details             jsonb not null default '{}' check (jsonb_typeof(details) = 'object'),
  created_at          timestamptz not null default now(),
  constraint decision_factors_order unique (decision_id, position),
  -- Only a factor that was used may claim to have moved the number.
  constraint decision_factors_contribution_only_if_used check (used or contribution_points is null),
  -- Something Omen could not read says why.
  constraint decision_factors_unread_has_reason check (evidence_kind <> 'limitation' or reason_code is not null),
  constraint decision_factors_range check (range_lo is null or range_hi is null or range_lo <= range_hi)
);
create index decision_factors_decision on public.decision_factors (decision_id);

create table public.decision_actions (
  decision_id uuid primary key references public.decisions(id) on delete cascade,
  user_id     uuid not null,
  followed    boolean,
  stars       smallint check (stars between 1 and 5),
  note        text check (char_length(note) <= 2000),
  provenance  text not null default 'self_reported' check (provenance in ('self_reported', 'provider_verified')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.decision_outcomes (
  decision_id            uuid primary key references public.decisions(id) on delete cascade,
  user_id                uuid not null,
  state                  text not null check (state in ('resolved', 'data_incomplete', 'not_executed')),
  result                 text check (result in ('win', 'loss')),
  provenance             text not null check (provenance in ('verified', 'self_reported', 'legacy_estimate')),
  reconciliation_state   text check (reconciliation_state in
                           ('exact', 'provider_adjusted', 'provider_restricted', 'unsupported', 'ambiguous', 'mismatch', 'pending')),
  scoring_coverage_state text check (scoring_coverage_state in
                           ('supported', 'provider_adjusted', 'provider_restricted', 'unsupported', 'ambiguous', 'mismatch', 'pending')),
  scoring_format         text,
  effectiveness          smallint check (effectiveness between 0 and 100),
  summary                text,
  provider_final_outcome jsonb,
  scored_at              timestamptz not null default now(),
  created_at             timestamptz not null default now(),
  constraint decision_outcomes_result_iff_resolved check ((state = 'resolved') = (result is not null)),
  -- "Verified" means reconciled exactly against the league's own scoring, nothing weaker.
  constraint decision_outcomes_verified_is_exact check (provenance <> 'verified' or reconciliation_state = 'exact')
);

-- Integrity and immutability ------------------------------------------------------------------------

create function public.ledger_erasure_in_progress() returns boolean
language sql stable set search_path = pg_catalog as $$
  select coalesce(current_setting('omen.ledger_erasure', true), '') = 'on'
$$;

create function public.ledger_refuse_change() returns trigger
language plpgsql set search_path = pg_catalog, public as $$
begin
  if tg_op = 'DELETE' and public.ledger_erasure_in_progress() then
    return old;
  end if;
  raise exception '% is append-only: % refused (account erasure goes through ledger_erase_user)', tg_table_name, tg_op
    using errcode = '42501';
end $$;

create function public.decisions_check_insert() returns trigger
language plpgsql set search_path = pg_catalog, public as $$
declare prior public.decisions%rowtype;
begin
  if new.supersedes_id is not null then
    select * into prior from public.decisions where id = new.supersedes_id;
    if not found
       or prior.user_id <> new.user_id or prior.league_id <> new.league_id
       or prior.provider_team_id is distinct from new.provider_team_id
       or prior.season <> new.season or prior.week <> new.week then
      raise exception 'decisions: a call may only supersede an earlier call for the same team and week' using errcode = '23514';
    end if;
  end if;
  if not exists (select 1 from public.league_memberships m where m.user_id = new.user_id and m.league_id = new.league_id)
     and new.call_type <> 'legacy' then
    raise exception 'decisions: user does not follow this league' using errcode = '23514';
  end if;
  return new;
end $$;

-- Child rows must belong to the same person as their decision (they carry user_id so erasure and
-- export never need a join, and so a future client read policy needs none either).
create function public.ledger_check_owner() returns trigger
language plpgsql set search_path = pg_catalog, public as $$
begin
  if not exists (select 1 from public.decisions d where d.id = new.decision_id and d.user_id = new.user_id) then
    raise exception '%: user_id must match the decision''s owner', tg_table_name using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' and (new.decision_id <> old.decision_id or new.user_id <> old.user_id) then
    raise exception '%: decision and owner cannot change', tg_table_name using errcode = '23514';
  end if;
  return new;
end $$;

-- An outcome is final once resolved or not_executed. data_incomplete may be completed later (A6:
-- a deferred row is recorded, not closed).
create function public.decision_outcomes_check_update() returns trigger
language plpgsql set search_path = pg_catalog, public as $$
begin
  if old.state <> 'data_incomplete' then
    raise exception 'decision_outcomes: outcome is final (%)', old.state using errcode = '42501';
  end if;
  return new;
end $$;

create trigger decisions_check_insert before insert on public.decisions
  for each row execute function public.decisions_check_insert();
create trigger decisions_append_only before update or delete on public.decisions
  for each row execute function public.ledger_refuse_change();
create trigger decision_factors_check_owner before insert on public.decision_factors
  for each row execute function public.ledger_check_owner();
create trigger decision_factors_append_only before update or delete on public.decision_factors
  for each row execute function public.ledger_refuse_change();
create trigger decision_actions_check_owner before insert or update on public.decision_actions
  for each row execute function public.ledger_check_owner();
create trigger decision_outcomes_check_owner before insert or update on public.decision_outcomes
  for each row execute function public.ledger_check_owner();
create trigger decision_outcomes_check_update before update on public.decision_outcomes
  for each row execute function public.decision_outcomes_check_update();
create trigger decision_outcomes_no_delete before delete on public.decision_outcomes
  for each row execute function public.ledger_refuse_change();

-- The only way Ledger rows are deleted: account erasure. Returns the number of calls erased.
create function public.ledger_erase_user(p_user_id uuid) returns integer
language plpgsql set search_path = pg_catalog, public as $$
declare n integer;
begin
  perform set_config('omen.ledger_erasure', 'on', true);
  delete from public.decisions where user_id = p_user_id;
  get diagnostics n = row_count;
  perform set_config('omen.ledger_erasure', '', true);
  return n;
end $$;

-- The current call per team per week is the one nothing supersedes.
create view public.ledger_current_calls with (security_invoker = true) as
  select d.* from public.decisions d
   where not exists (select 1 from public.decisions s where s.supersedes_id = d.id);

-- Backfill from moves (copy; moves is untouched) --------------------------------------------------

drop table if exists pg_temp.step05_backfill;
create temporary table step05_backfill on commit drop as
select m.*, l.id as new_league_id,
       coalesce(ms.provider_team_id, case when m.platform = 'sleeper' then pc.platform_user_id end) as new_team_id
  from public.moves m
  join public.leagues l on l.provider = m.platform and l.provider_league_id = m.league_id and l.season = m.season
  left join public.league_memberships ms on ms.user_id = m.user_id and ms.league_id = l.id
  left join public.platform_connections pc on pc.id = ms.connection_id
 where m.platform is not null and m.league_id is not null and m.user_id is not null
   and m.week_num between 1 and 22;

insert into public.decisions (id, user_id, league_id, provider_team_id, season, week, call_type, contract_version, engine_version,
                              band, band_drivers, band_unavailable_reason, internal_score, headline, summary, recommendation,
                              scoring_format, scoring_contract_version, scoring_contract_hash, provider_rule_snapshot_hash,
                              scoring_coverage_state, issued_at, legacy_move_id)
select gen_random_uuid(), b.user_id, b.new_league_id, b.new_team_id, b.season, b.week_num, 'legacy', 'moves-legacy', 'legacy-optimizer',
       null, '[]', 'recorded_before_bands', b.confidence,
       coalesce(nullif(b.headline, ''), 'Call recorded without a headline'), b.reasoning,
       jsonb_strip_nulls(jsonb_build_object('move_type', b.move_type, 'headline', b.headline, 'reasoning', b.reasoning,
         'target_player', b.target_player, 'vorp_score', b.vorp_score, 'legacy_confidence', b.confidence)),
       b.scoring, b.scoring_contract_version, b.scoring_contract_hash, b.provider_rule_snapshot_hash,
       case when b.scoring_coverage_state in ('supported', 'provider_adjusted', 'provider_restricted', 'unsupported', 'ambiguous', 'mismatch', 'pending')
            then b.scoring_coverage_state end,
       coalesce(b.created_at, now()), b.id
  from step05_backfill b;

insert into public.decision_actions (decision_id, user_id, followed, stars, note, provenance, created_at)
select d.id, d.user_id, b.followed, b.user_stars, b.user_note, 'self_reported', d.issued_at
  from step05_backfill b join public.decisions d on d.legacy_move_id = b.id
 where b.followed is not null or b.user_stars is not null or b.user_note is not null;

insert into public.decision_outcomes (decision_id, user_id, state, result, provenance, reconciliation_state, scoring_format,
                                      effectiveness, provider_final_outcome)
select d.id, d.user_id,
       case when b.outcome = 'not_executed' then 'not_executed' else 'resolved' end,
       case when b.outcome in ('win', 'loss') then b.outcome end,
       case when b.reconciliation_state = 'exact' and b.outcome in ('win', 'loss') then 'verified' else 'legacy_estimate' end,
       case when b.reconciliation_state in ('exact', 'provider_adjusted', 'provider_restricted', 'unsupported', 'ambiguous', 'mismatch', 'pending')
            then b.reconciliation_state end,
       b.scoring, case when b.eff between 0 and 100 then b.eff end, b.provider_final_outcome
  from step05_backfill b join public.decisions d on d.legacy_move_id = b.id
 where b.outcome in ('win', 'loss', 'not_executed');

do $$
declare scoped int; copied int;
begin
  select count(*) into scoped from public.moves where platform is not null and league_id is not null;
  select count(*) into copied from public.decisions where legacy_move_id is not null;
  raise notice 'step 05 backfill: % of % league-scoped moves copied; % moves without a league stay in moves only',
    copied, scoped, (select count(*) from public.moves) - scoped;
  if copied <> scoped then
    raise exception 'step 05 backfill: % league-scoped moves could not be attributed to a followed league; stop and review', scoped - copied;
  end if;
end $$;

drop table pg_temp.step05_backfill;

-- Privileges --------------------------------------------------------------------------------------

alter table public.decisions enable row level security;
alter table public.decision_factors enable row level security;
alter table public.decision_actions enable row level security;
alter table public.decision_outcomes enable row level security;
revoke all on table public.decisions, public.decision_factors, public.decision_actions, public.decision_outcomes,
  public.ledger_current_calls from anon, authenticated;
grant all on table public.decisions, public.decision_factors, public.decision_actions, public.decision_outcomes,
  public.ledger_current_calls to service_role;

do $$
declare f text;
begin
  foreach f in array array[
    'public.ledger_erasure_in_progress()', 'public.ledger_refuse_change()', 'public.decisions_check_insert()',
    'public.ledger_check_owner()', 'public.decision_outcomes_check_update()', 'public.ledger_erase_user(uuid)']
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;

commit;
