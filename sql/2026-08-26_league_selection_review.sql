-- Review-only. DO NOT APPLY.
--
-- Applying SQL to staging or production is the gated founder sequence, in order:
-- approval -> staging application -> verification -> production application
-- (facts-of-record #8). This file is source, not an executed migration.
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
