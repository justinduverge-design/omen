-- REVIEW ONLY. NOT APPLIED. Facts-of-record #8: authoring SQL and applying it are distinct
-- acts, and the required order is explicit founder approval -> staging application ->
-- verification -> production application. Nothing in an agent session may run this.
--
-- Purpose: give `public.moves` the league attribution the native Ledger needs.
--
-- Found 2026-09-28 (GlitchTip #13, 150 events since 2026-09-16): production `moves` has no
-- `platform` and no `league_id`, so `GET /api/moves?contract_version=moves-history.v2` cannot
-- scope rows to the requested league. The route now refuses (503 `league_scope_unavailable`)
-- instead of serving one league's calls as another's. Applying this migration is what lets the
-- Ledger render again; until then the native Ledger shows its error state.
--
-- What this does NOT do:
--   * It does not add `result` or `scored_at`. The Ledger no longer reads them. The Tuesday
--     cron (`src/omen_tuesday_cron.js`) still writes both, but cron scoring is held off
--     (`OMEN_CRON_SCORING_ENABLED=false`); whoever re-enables it must decide whether the
--     scored result belongs in `provider_final_outcome` or in these columns. Separate item.
--   * It does not backfill. Existing rows keep NULL `platform`/`league_id`, and the Ledger's
--     equality filter will not match them, so pre-migration history stays hidden rather than
--     being attributed to a league it may not belong to. Backfilling from
--     `platform_connections` is only sound for a user with exactly one league, and needs its
--     own review.
--   * It does not change RLS, grants, or policies.
--
-- Write path: `upsertMoveTolerantly` in `src/routes/omen.js` already writes both columns and
-- drops them when absent, so no code change ships with this migration.
--
-- Additive, nullable, reversible.

-- ---------------------------------------------------------------------------
-- 1. PREFLIGHT — rolls back; safe to run against staging to prove the migration.
--    It applies the change inside a transaction, asserts the result, then discards it.
-- ---------------------------------------------------------------------------
begin;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'moves'
      and column_name in ('platform', 'league_id')
  ) then
    raise exception 'preflight: moves.platform/league_id already exist; migration is not needed as written';
  end if;
end $$;

alter table public.moves
  add column if not exists platform text,
  add column if not exists league_id text;

do $$
begin
  if (select count(*) from information_schema.columns
      where table_schema = 'public' and table_name = 'moves'
        and column_name in ('platform', 'league_id') and is_nullable = 'YES') <> 2 then
    raise exception 'preflight: expected two nullable columns after ALTER';
  end if;
  if exists (select 1 from public.moves where platform is not null or league_id is not null) then
    raise exception 'preflight: existing rows must remain NULL (no backfill)';
  end if;
end $$;

rollback;

-- ---------------------------------------------------------------------------
-- 2. MIGRATION — the only part that persists. Run only after approval and staging proof.
-- ---------------------------------------------------------------------------
begin;

alter table public.moves
  add column if not exists platform text,
  add column if not exists league_id text;

comment on column public.moves.platform is
  'Provider (espn | yahoo | sleeper) of the league this recommendation was issued for; null for rows predating this column.';
comment on column public.moves.league_id is
  'Provider league id this recommendation was issued for; null for rows predating this column. Ledger scoping key.';

-- The Ledger read path: one user, one season, one league, newest first.
create index if not exists moves_user_season_league_created
  on public.moves (user_id, season, platform, league_id, created_at desc);

commit;

-- Rollback (manual, only if the migration must be undone):
--   drop index if exists public.moves_user_season_league_created;
--   alter table public.moves drop column if exists league_id, drop column if exists platform;
