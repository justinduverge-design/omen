-- READ-ONLY. Post-checks for step 02, run right after its up on production (and in the dry run).
-- Raises on the first failed check; prints 'VERIFIED 02' when every check holds.
do $$
begin
  if (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'platform_connections'
       and column_name in ('credential_state', 'last_verified_at', 'last_failure_code', 'last_failure_at')) <> 4 then
    raise exception 'step 02: credential health columns missing';
  end if;
  if exists (select 1 from public.platform_connections where credential_state <> 'unknown') then
    raise exception 'step 02: existing connections should all start as unknown';
  end if;
  if to_regprocedure('public.connection_store_espn(uuid, text, text, text, text)') is null then raise exception 'post-check: public.connection_store_espn(uuid, text, text, text, text) missing'; end if;
  if has_function_privilege('anon', 'public.connection_store_espn(uuid, text, text, text, text)', 'execute') or has_function_privilege('authenticated', 'public.connection_store_espn(uuid, text, text, text, text)', 'execute') then raise exception 'post-check: a client role can execute public.connection_store_espn(uuid, text, text, text, text)'; end if;
  if not has_function_privilege('service_role', 'public.connection_store_espn(uuid, text, text, text, text)', 'execute') then raise exception 'post-check: service_role cannot execute public.connection_store_espn(uuid, text, text, text, text)'; end if;
  if to_regprocedure('public.connection_store_yahoo(uuid, text, text, timestamptz, text, text)') is null then raise exception 'post-check: public.connection_store_yahoo(uuid, text, text, timestamptz, text, text) missing'; end if;
  if has_function_privilege('anon', 'public.connection_store_yahoo(uuid, text, text, timestamptz, text, text)', 'execute') or has_function_privilege('authenticated', 'public.connection_store_yahoo(uuid, text, text, timestamptz, text, text)', 'execute') then raise exception 'post-check: a client role can execute public.connection_store_yahoo(uuid, text, text, timestamptz, text, text)'; end if;
  if not has_function_privilege('service_role', 'public.connection_store_yahoo(uuid, text, text, timestamptz, text, text)', 'execute') then raise exception 'post-check: service_role cannot execute public.connection_store_yahoo(uuid, text, text, timestamptz, text, text)'; end if;
  if to_regprocedure('public.connection_rotate_yahoo(uuid, timestamptz, text, text, timestamptz)') is null then raise exception 'post-check: public.connection_rotate_yahoo(uuid, timestamptz, text, text, timestamptz) missing'; end if;
  if has_function_privilege('anon', 'public.connection_rotate_yahoo(uuid, timestamptz, text, text, timestamptz)', 'execute') or has_function_privilege('authenticated', 'public.connection_rotate_yahoo(uuid, timestamptz, text, text, timestamptz)', 'execute') then raise exception 'post-check: a client role can execute public.connection_rotate_yahoo(uuid, timestamptz, text, text, timestamptz)'; end if;
  if not has_function_privilege('service_role', 'public.connection_rotate_yahoo(uuid, timestamptz, text, text, timestamptz)', 'execute') then raise exception 'post-check: service_role cannot execute public.connection_rotate_yahoo(uuid, timestamptz, text, text, timestamptz)'; end if;
  if to_regprocedure('public.connection_record_health(uuid, text, boolean, text)') is null then raise exception 'post-check: public.connection_record_health(uuid, text, boolean, text) missing'; end if;
  if has_function_privilege('anon', 'public.connection_record_health(uuid, text, boolean, text)', 'execute') or has_function_privilege('authenticated', 'public.connection_record_health(uuid, text, boolean, text)', 'execute') then raise exception 'post-check: a client role can execute public.connection_record_health(uuid, text, boolean, text)'; end if;
  if not has_function_privilege('service_role', 'public.connection_record_health(uuid, text, boolean, text)', 'execute') then raise exception 'post-check: service_role cannot execute public.connection_record_health(uuid, text, boolean, text)'; end if;
  if to_regprocedure('public.connection_revoke(uuid, text)') is null then raise exception 'post-check: public.connection_revoke(uuid, text) missing'; end if;
  if has_function_privilege('anon', 'public.connection_revoke(uuid, text)', 'execute') or has_function_privilege('authenticated', 'public.connection_revoke(uuid, text)', 'execute') then raise exception 'post-check: a client role can execute public.connection_revoke(uuid, text)'; end if;
  if not has_function_privilege('service_role', 'public.connection_revoke(uuid, text)', 'execute') then raise exception 'post-check: service_role cannot execute public.connection_revoke(uuid, text)'; end if;
  raise notice 'VERIFIED 02';
end $$;
