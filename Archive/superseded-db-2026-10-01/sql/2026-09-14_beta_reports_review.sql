-- REVIEW ONLY. NOT APPLIED.
--
-- Purpose: storage for W1-B beta report pill metadata.
--
-- This SQL is intentionally separate from production application. Applying Supabase
-- schema/RLS changes remains founder-gated: approval -> staging application ->
-- verification -> production application.
--
-- Data boundary:
--   - stores the reporting user, current screen, app/build/OS/device metadata,
--     provider connection state, scrubbed recent error codes, and the user's note;
--   - rejects league data, roster data, screenshots, credentials and Vault ids at the
--     API layer before insert;
--   - expires rows after 30 days by timestamp. A scheduled cleanup still has to run
--     the delete query below; expires_at alone is not deletion.

begin;

create table if not exists public.beta_reports (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.users(id) on delete cascade,
  screen              text not null,
  app_version         text not null,
  build               text not null,
  os_version          text not null,
  device_model        text not null,
  connection_state    text not null,
  recent_error_codes  text[] not null default '{}',
  message             text not null,
  disclosure_accepted boolean not null default false,
  created_at          timestamptz not null default now(),
  expires_at          timestamptz not null default (now() + interval '30 days'),

  constraint beta_reports_screen_check check (
    screen in (
      'command_center',
      'omen',
      'omen_evidence',
      'start_sit',
      'league',
      'waiver',
      'trade',
      'ledger',
      'ledger_detail',
      'account',
      'sign_in',
      'email_code',
      'connect_league',
      'espn_connect',
      'connect_failed',
      'switcher'
    )
  ),
  constraint beta_reports_connection_state_check check (
    connection_state = 'none'
    or connection_state ~ '^(espn|yahoo|sleeper):(connected|disconnected|reconnect_required|unavailable|pending)$'
  ),
  constraint beta_reports_disclosure_check check (disclosure_accepted),
  constraint beta_reports_message_length_check check (
    length(btrim(message)) between 1 and 4000
  ),
  constraint beta_reports_error_code_count_check check (
    cardinality(recent_error_codes) <= 5
  )
);

create index if not exists beta_reports_user_created_at
  on public.beta_reports (user_id, created_at desc);

create index if not exists beta_reports_expires_at
  on public.beta_reports (expires_at);

comment on table public.beta_reports is
  'W1-B beta report metadata and user note. No screenshots, league data, rosters, credentials or Vault ids. Rows are retained for 30 days pending cleanup.';

alter table public.beta_reports enable row level security;

-- Users may read their own export rows. Inserts happen through the API server with
-- service_role after field allowlisting and credential scrubbing.
drop policy if exists beta_reports_self_select on public.beta_reports;
create policy beta_reports_self_select on public.beta_reports
  for select using (auth.uid() = user_id);

revoke all on table public.beta_reports from anon, authenticated;
grant select (
  id,
  user_id,
  screen,
  app_version,
  build,
  os_version,
  device_model,
  connection_state,
  recent_error_codes,
  message,
  disclosure_accepted,
  created_at,
  expires_at
) on table public.beta_reports to authenticated;

commit;

-- Founder digest read path:
--   service_role only. Do not grant anon/authenticated aggregate access.
--
-- Retention cleanup, to be scheduled after the table is applied and verified:
--   delete from public.beta_reports where expires_at < now();
--
-- Rollback:
--   drop table if exists public.beta_reports;
