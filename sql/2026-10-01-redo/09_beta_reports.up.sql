-- REVIEW ONLY. NOT APPLIED. Facts-of-record #8.
--
-- Step 09 — storage for the in-app Report button (W1-B). Founder, 2026-10-01: yes, make it work.
-- Today every report returns 503 "Your report was not saved" because this table does not exist
-- (`Direction/2026-10-01-league-connections-review.md`, finding 12).
--
-- Adapted from `Archive/superseded-db-2026-10-01/sql/2026-09-14_beta_reports_review.sql`, with three changes:
--   * server-only, like every table in this redo. The draft granted signed-in clients SELECT; the
--     apps never read the database directly, and export goes through the server;
--   * `beta_reports_purge_expired()` performs the 30-day deletion and records it in data_events
--     (the draft noted that expires_at alone is not deletion and left the cleanup unwritten);
--   * the screen list is checked against `src/routes/betaReports.js` SCREENS (identical on 2026-10-01).
--
-- Data boundary (enforced by the route before insert, and by the checks below): screen, app and device
-- metadata, connection state, at most five scrubbed error codes, the user's note. No league data,
-- rosters, screenshots, credentials or Vault ids.
--
-- Keyed to the SIGN-IN (auth.users), like consent_records, not to the app row (Codex review, #523). A
-- person whose connect failed may have no app row yet, and theirs are the reports that matter most; the
-- route must not create an app row just to file a report, because that can recreate an account that
-- account_erase() has just deleted. Deleted with the account: account_erase() deletes them explicitly,
-- and the route's final step, deleting the sign-in, cascades any report filed during the erasure.

begin;

do $$
begin
  if to_regclass('public.beta_reports') is not null then
    raise exception 'step 09 preflight: beta_reports already exists';
  end if;
  if to_regclass('public.data_events') is null then
    raise exception 'step 09 preflight: step 06 must be applied first';
  end if;
end $$;

create table public.beta_reports (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,  -- the sign-in, not the app row
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
  constraint beta_reports_screen_check check (screen in (
    'command_center', 'omen', 'omen_evidence', 'start_sit', 'league', 'waiver', 'trade', 'ledger',
    'ledger_detail', 'account', 'sign_in', 'email_code', 'connect_league', 'espn_connect', 'connect_failed', 'switcher')),
  constraint beta_reports_connection_state_check check (
    connection_state = 'none'
    or connection_state ~ '^(espn|yahoo|sleeper):(connected|disconnected|reconnect_required|unavailable|pending)$'),
  constraint beta_reports_disclosure_check check (disclosure_accepted),
  constraint beta_reports_message_length_check check (length(btrim(message)) between 1 and 4000),
  constraint beta_reports_error_code_count_check check (cardinality(recent_error_codes) <= 5),
  constraint beta_reports_expiry_check check (expires_at > created_at and expires_at <= created_at + interval '30 days')
);
create index beta_reports_user_created_at on public.beta_reports (user_id, created_at desc);

-- No report after erasure (Codex review, #530). The deletion audit row account_erase() writes (sha256 of the
-- user id, the same hash the route's legacy path writes) is the tombstone: a report for an erased person is
-- refused. A SHARED per-account lock, which account_erase() takes exclusively first, closes the window both
-- ways: an erase waits for a report being filed and then deletes it; a report filed during an erase waits,
-- sees the tombstone and is refused. Without this, a report inserted between the erase and the route's
-- sign-in deletion would survive if that last call failed.
create function public.beta_reports_check_insert() returns trigger
language plpgsql set search_path = pg_catalog, public as $$
begin
  perform pg_advisory_xact_lock_shared(hashtextextended('omen.account:' || new.user_id::text, 0));
  if exists (select 1 from public.deletion_audit_log
              where user_id_hash = encode(sha256(convert_to(new.user_id::text, 'UTF8')), 'hex')) then
    raise exception 'beta_reports: this account has been erased' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger beta_reports_check_insert before insert on public.beta_reports
  for each row execute function public.beta_reports_check_insert();
create index beta_reports_expires_at on public.beta_reports (expires_at);
comment on table public.beta_reports is
  'In-app beta report: screen, app/device metadata, scrubbed error codes, the user''s note. No league data, rosters, screenshots or credentials. Deleted after 30 days by beta_reports_purge_expired().';

-- Delete reports past their 30 days and record it. Safe to run any time (e.g. daily).
create function public.beta_reports_purge_expired() returns integer
language plpgsql set search_path = pg_catalog, public as $$
declare n integer;
begin
  delete from public.beta_reports where expires_at <= now();
  get diagnostics n = row_count;
  if n > 0 then
    insert into public.data_events (event, subject, job, row_count, reason, approved_by)
    values ('purge', 'beta_reports', 'beta_reports_purge_expired v1', n, '30-day retention ended',
            'standing rule: 30-day retention (W1-B; founder, 2026-10-01)');
  end if;
  return n;
end $$;

alter table public.beta_reports enable row level security;
revoke all on table public.beta_reports from anon, authenticated;
grant all on table public.beta_reports to service_role;
revoke all on function public.beta_reports_purge_expired() from public, anon, authenticated;
grant execute on function public.beta_reports_purge_expired() to service_role;
revoke all on function public.beta_reports_check_insert() from public, anon, authenticated;
grant execute on function public.beta_reports_check_insert() to service_role;

commit;
