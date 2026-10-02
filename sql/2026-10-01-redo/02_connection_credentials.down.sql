-- REVIEW ONLY. Rollback for step 02. Drops the five functions and the four health columns.
-- Lossless before the server starts calling the functions. After that, the health history in the four
-- columns is lost on rollback (credentials themselves stay: secrets and pointers are untouched).
-- Secrets created by these functions have name = NULL; the server's existing code reads them by id,
-- so it keeps working after rollback.
begin;
drop function if exists public.connection_revoke(uuid, text);
drop function if exists public.connection_record_health(uuid, text, boolean, text);
drop function if exists public.connection_rotate_yahoo(uuid, timestamptz, text, text, timestamptz);
drop function if exists public.connection_store_yahoo(uuid, text, text, timestamptz, text, text);
drop function if exists public.connection_store_espn(uuid, text, text, text, text);
alter table public.platform_connections
  drop column if exists last_failure_at,
  drop column if exists last_failure_code,
  drop column if exists last_verified_at,
  drop column if exists credential_state;
commit;
