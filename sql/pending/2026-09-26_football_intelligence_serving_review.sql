-- =================================================================
-- Omen football-intelligence compact serving projection
-- -----------------------------------------------------------------
-- REVIEW ONLY. Do not apply to Supabase until Justin approves the
-- exact database action. This file creates no raw/canonical fact store
-- and grants authenticated clients read access only to published rows.
-- =================================================================

begin;

create table if not exists public.football_intelligence_signals (
  id                    uuid primary key default gen_random_uuid(),
  scope_key             text not null,
  contract_version      text not null,
  signal_type           text not null,
  team_id               text not null,
  coach_id              text not null,
  season                integer not null,
  status                text not null,
  payload               jsonb not null,
  artifact_id           text not null,
  artifact_version      text not null,
  receipt_id            text not null,
  output_hash           text not null,
  source_artifact_ids   text[] not null,
  publication_state     text not null,
  published_at          timestamptz not null,
  stale_after           timestamptz,
  supersedes_id         uuid references public.football_intelligence_signals(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint football_intelligence_signals_scope_key_check
    check (length(scope_key) between 1 and 256),
  constraint football_intelligence_signals_contract_check
    check (contract_version = 'football-intelligence-signal.v1'),
  constraint football_intelligence_signals_type_check
    check (signal_type = 'coach_transfer_system_signal'),
  constraint football_intelligence_signals_team_check
    check (team_id ~ '^omen:team:[a-z0-9][a-z0-9._-]*$'),
  constraint football_intelligence_signals_coach_check
    check (coach_id ~ '^omen:coach:[a-z0-9][a-z0-9._-]*$'),
  constraint football_intelligence_signals_season_check
    check (season between 1999 and 2100),
  constraint football_intelligence_signals_status_check
    check (status in ('available', 'insufficient_coverage', 'stale', 'disputed')),
  constraint football_intelligence_signals_payload_check
    check (
      jsonb_typeof(payload) = 'object'
      and payload ->> 'contract_version' = contract_version
      and payload ->> 'signal_type' = signal_type
      and payload ->> 'status' = status
      and payload #>> '{subject,team_id}' = team_id
      and payload #>> '{subject,coach_id}' = coach_id
      and (payload #>> '{subject,season}')::integer = season
      and payload #>> '{publication,artifact_id}' = artifact_id
      and payload #>> '{publication,artifact_version}' = artifact_version
    ),
  constraint football_intelligence_signals_artifact_id_check
    check (artifact_id ~ '^sha256:[0-9a-f]{64}$'),
  constraint football_intelligence_signals_receipt_id_check
    check (receipt_id ~ '^receipt:[0-9a-f]{64}$'),
  constraint football_intelligence_signals_output_hash_check
    check (output_hash ~ '^sha256:[0-9a-f]{64}$'),
  constraint football_intelligence_signals_source_ids_check
    check (cardinality(source_artifact_ids) > 0),
  constraint football_intelligence_signals_publication_state_check
    check (publication_state in ('published', 'superseded', 'retracted')),
  constraint football_intelligence_signals_supersession_check
    check (supersedes_id is null or supersedes_id <> id),
  constraint football_intelligence_signals_freshness_check
    check (stale_after is null or stale_after >= published_at)
);

create unique index if not exists idx_football_intelligence_signals_scope_artifact
  on public.football_intelligence_signals (scope_key, artifact_id);

create unique index if not exists idx_football_intelligence_signals_one_published_scope
  on public.football_intelligence_signals (scope_key)
  where publication_state = 'published';

create index if not exists idx_football_intelligence_signals_lookup
  on public.football_intelligence_signals
    (team_id, coach_id, season, publication_state, published_at desc);

alter table public.football_intelligence_signals enable row level security;

revoke all on table public.football_intelligence_signals from anon, authenticated;
grant select on table public.football_intelligence_signals to authenticated;
grant select, insert, update, delete on table public.football_intelligence_signals to service_role;

drop policy if exists football_intelligence_signals_published_select
  on public.football_intelligence_signals;
create policy football_intelligence_signals_published_select
  on public.football_intelligence_signals
  for select
  to authenticated
  using (publication_state = 'published');

commit;
