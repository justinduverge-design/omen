-- APPLIED TO PRODUCTION 2026-08-30. Kept as the source of record.
--
-- Founder approval given 2026-08-30 in session. The approved order was
-- approval -> staging -> verification -> production (facts-of-record #8), but
-- **there is no staging environment**: the Supabase org has one project (Omen)
-- and one branch (main), which is production. That was reported to the founder
-- rather than quietly skipped, and he authorized production application directly.
--
-- In place of staging, this exact DDL was rehearsed against production inside a
-- transaction and rolled back. It executed cleanly, and column, index and all 9
-- rows were verified untouched afterwards. Only then was it applied for real.
--
-- Post-application verification: `is_selected` boolean, nullable; partial unique
-- index present; 9 rows total, 0 rewritten, 0 selected. PostgREST schema cache
-- reloaded so `activeSelection.js` stops taking its missing-column fallback.
--
-- No future SQL authority is implied by this approval.
--
-- Purpose: the approved team/league switcher (visual briefs §10.2/§10.3) requires
-- one user-chosen provider to apply atomically across Command Center, Omen,
-- League, Waiver Watch and Ledger. `platform_connections` holds one row per
-- (user_id, platform) and has no column recording which one the user picked, so
-- today each surface falls back to its own fixed platform order.
--
-- Until this is applied, `GET /api/leagues` and `POST /api/leagues/active` report
-- `selection_persistence: "provider_binding_only"` and the switcher still binds
-- the league within its provider. Nothing silently claims a choice persisted.
--
-- Additive and reversible. No existing row is rewritten: `is_selected` is
-- nullable with no default, so every pre-existing connection keeps the current
-- deterministic tie-break until the user actively chooses.

begin;

alter table public.platform_connections
  add column if not exists is_selected boolean;

comment on column public.platform_connections.is_selected is
  'True on the single connection the user chose in the team/league switcher. Null on a connection predating the switcher, which keeps the deterministic platform tie-break. Never more than one true row per user.';

-- At most one selected connection per user. Partial, so null and false rows are
-- unconstrained and the index stays small.
create unique index if not exists platform_connections_one_selected_per_user
  on public.platform_connections (user_id)
  where is_selected;

commit;

-- Rollback:
--   drop index if exists public.platform_connections_one_selected_per_user;
--   alter table public.platform_connections drop column if exists is_selected;
