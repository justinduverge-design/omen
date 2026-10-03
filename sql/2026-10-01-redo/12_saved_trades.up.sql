-- REVIEW ONLY. NOT APPLIED. Facts-of-record #8.
--
-- Step 12 — saved trades (T4), one row per saved trade.
--
-- Today PR #519 keeps each user's saved trades as ONE Redis blob (`omen:trade_saved_queue:{userId}`, no TTL).
-- Codex found two problems on #519 that a table fixes:
--   * Lost saves. Every change reads the whole list and writes it back, so two quick saves can drop one.
--     Here each save is one row, written by an atomic insert.
--   * Not erased, not exported. account_erase() and the data export did not know about the blob. Here the
--     rows cascade from users (account_erase() and today's deletion both delete the users row), and the
--     export route reads this table.
--
-- The key (Codex, #521): today's candidate id (`find_{opponent}_{give}_{receive}`, `buildCandidateRecord` in
-- src/services/tradeFind.js) repeats across leagues and weeks. The decided fix (founder, 2026-10-02) makes
-- the id globally unique: /api/trade/find issues a batch token per response and folds it into each id.
-- The unique key is still the full scope (user, provider, league, season, week, candidate), so an id that
-- somehow repeats across leagues can never overwrite another league's row.
--
-- The trade itself (founder, 2026-10-02: "the server remembers every trade it shows"): each find
-- response's candidates are kept server side for 15 minutes, per user (Redis, the find cache's lifetime;
-- not in this database). On save, the server looks the id up in the caller's own kept batches and writes
-- the full trade here. An expired or unknown id returns an error the app turns into "refresh the search";
-- a row is never written without its trade (`trade` must name a player on each side and the opponent).
--
-- Lifecycle, as #519 implements it: saved -> sent (once, never back), then an optional SELF-REPORTED
-- outcome (accepted / rejected / countered) that may be corrected. The reasoning is kept verbatim from the
-- first save and, with the trade and its scope, never changes.
--
-- RLS: the owner may read their own rows; only the server writes.
-- Requires nothing from steps 01-11 (users exists today). Backfill: none (no app calls the endpoint yet).

begin;

do $$
begin
  if to_regclass('public.saved_trades') is not null then
    raise exception 'step 12 preflight: saved_trades already exists';
  end if;
end $$;

-- A trade side as `buildCandidateRecord` (src/services/tradeFind.js) produces it: one player object that
-- names its player (`player_key` or `player_id`), or a non-empty array of them (three-team trades). Keys
-- alone are not enough: `{"give": null}` or `{"give": []}` would be a saved trade nobody can read or
-- stale-check, and the update guard below would make it permanent (Codex review, #529).
create function public.saved_trades_side_ok(side jsonb) returns boolean
language sql immutable set search_path = pg_catalog as $$
  select case jsonb_typeof(side)
    when 'object' then coalesce(side ->> 'player_key', side ->> 'player_id', '') <> ''
    when 'array' then jsonb_array_length(side) > 0
                      and not exists (select 1 from jsonb_array_elements(side) e
                                       where jsonb_typeof(e) <> 'object'
                                          or coalesce(e ->> 'player_key', e ->> 'player_id', '') = '')
    else false
  end
$$;

create table public.saved_trades (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.users(id) on delete cascade,
  provider           text not null check (provider in ('sleeper', 'espn', 'yahoo')),
  provider_league_id text not null check (provider_league_id <> '' and provider_league_id <> provider),
  season             integer not null check (season between 2000 and 2100),
  week               integer not null check (week between 1 and 22),
  provider_team_id   text not null check (provider_team_id <> ''),   -- the saver's team: staleness compares both rosters (Codex, #529)
  candidate_id       text not null check (candidate_id <> '' and length(candidate_id) <= 200),
  trade              jsonb not null check (jsonb_typeof(trade) = 'object'
                                           and public.saved_trades_side_ok(trade -> 'give')
                                           and public.saved_trades_side_ok(trade -> 'receive')
                                           and coalesce(trade ->> 'opponent_team_id', '') <> ''),
  reasoning          jsonb not null check (jsonb_typeof(reasoning) = 'object'),
  state              text not null default 'saved' check (state in ('saved', 'sent')),
  outcome            text check (outcome in ('accepted', 'rejected', 'countered')),
  outcome_provenance text check (outcome_provenance = 'self_reported'),
  saved_at           timestamptz not null default now(),
  sent_at            timestamptz,
  outcome_at         timestamptz,
  constraint saved_trades_one_per_candidate unique (user_id, provider, provider_league_id, season, week, candidate_id),
  constraint saved_trades_sent_at check ((state = 'sent') = (sent_at is not null)),
  constraint saved_trades_outcome_after_sent check (outcome is null or state = 'sent'),
  constraint saved_trades_outcome_fields check ((outcome is null) = (outcome_at is null)
                                                and (outcome is null) = (outcome_provenance is null))
);
create index saved_trades_user_saved on public.saved_trades (user_id, saved_at desc);
comment on table public.saved_trades is
  'T4 saved trades, one row per saved candidate. Reasoning verbatim from the first save; state saved -> sent; outcome self-reported only. Erased with the account (cascade from users) and included in the data export.';

-- What was saved never changes: scope, candidate, trade and reasoning are fixed at the first save, and a
-- sent trade cannot go back to saved.
create function public.saved_trades_check_update() returns trigger
language plpgsql set search_path = pg_catalog, public as $$
begin
  if (new.user_id, new.provider, new.provider_league_id, new.season, new.week, new.provider_team_id, new.candidate_id,
      new.trade, new.reasoning, new.saved_at)
     is distinct from
     (old.user_id, old.provider, old.provider_league_id, old.season, old.week, old.provider_team_id, old.candidate_id,
      old.trade, old.reasoning, old.saved_at) then
    raise exception 'saved_trades: a saved trade''s scope, trade and reasoning never change' using errcode = '42501';
  end if;
  if old.state = 'sent' and (new.state <> 'sent' or new.sent_at is distinct from old.sent_at) then
    raise exception 'saved_trades: a sent trade stays sent' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger saved_trades_check_update before update on public.saved_trades
  for each row execute function public.saved_trades_check_update();

alter table public.saved_trades enable row level security;
create policy saved_trades_owner_select on public.saved_trades for select to authenticated
  using ((select auth.uid()) = user_id);
revoke all on table public.saved_trades from anon, authenticated;
grant select on table public.saved_trades to authenticated;
grant all on table public.saved_trades to service_role;

revoke all on function public.saved_trades_check_update() from public, anon, authenticated;
grant execute on function public.saved_trades_check_update() to service_role;
revoke all on function public.saved_trades_side_ok(jsonb) from public, anon, authenticated;
grant execute on function public.saved_trades_side_ok(jsonb) to service_role;

commit;
