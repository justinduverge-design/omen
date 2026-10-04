-- READ-ONLY. Post-checks for step 03, run right after its up on production (and in the dry run).
-- Raises on the first failed check; prints 'VERIFIED 03' when every check holds.
do $$
begin
  if (select count(*) from public.league_memberships where source = 'backfill')
     <> (select count(*) from public.platform_connections where league_id <> platform and league_id <> '' and user_id is not null) then
    raise exception 'step 03: memberships do not match connections with a league';
  end if;
  if (select count(*) from public.leagues)
     <> (select count(distinct (platform, league_id)) from public.platform_connections where league_id <> platform and league_id <> '') then
    raise exception 'step 03: leagues do not match the distinct connected leagues';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.leagues'::regclass) then raise exception 'post-check: RLS off on leagues'; end if;
  if has_table_privilege('anon', 'public.leagues', 'select') or has_table_privilege('anon', 'public.leagues', 'insert') or has_table_privilege('authenticated', 'public.leagues', 'insert') or has_table_privilege('authenticated', 'public.leagues', 'update') or has_table_privilege('authenticated', 'public.leagues', 'delete') then raise exception 'post-check: a client role can write or anon can read leagues'; end if;
  if not (select relrowsecurity from pg_class where oid = 'public.league_memberships'::regclass) then raise exception 'post-check: RLS off on league_memberships'; end if;
  if has_table_privilege('anon', 'public.league_memberships', 'select') or has_table_privilege('anon', 'public.league_memberships', 'insert') or has_table_privilege('authenticated', 'public.league_memberships', 'insert') or has_table_privilege('authenticated', 'public.league_memberships', 'update') or has_table_privilege('authenticated', 'public.league_memberships', 'delete') then raise exception 'post-check: a client role can write or anon can read league_memberships'; end if;
  if to_regprocedure('public.league_follows_replace(uuid, text, integer, jsonb)') is null then raise exception 'post-check: public.league_follows_replace(uuid, text, integer, jsonb) missing'; end if;
  if has_function_privilege('anon', 'public.league_follows_replace(uuid, text, integer, jsonb)', 'execute') or has_function_privilege('authenticated', 'public.league_follows_replace(uuid, text, integer, jsonb)', 'execute') then raise exception 'post-check: a client role can execute public.league_follows_replace(uuid, text, integer, jsonb)'; end if;
  if not has_function_privilege('service_role', 'public.league_follows_replace(uuid, text, integer, jsonb)', 'execute') then raise exception 'post-check: service_role cannot execute public.league_follows_replace(uuid, text, integer, jsonb)'; end if;
  if to_regprocedure('public.league_select_active(uuid, text, text, integer)') is null then raise exception 'post-check: public.league_select_active(uuid, text, text, integer) missing'; end if;
  if has_function_privilege('anon', 'public.league_select_active(uuid, text, text, integer)', 'execute') or has_function_privilege('authenticated', 'public.league_select_active(uuid, text, text, integer)', 'execute') then raise exception 'post-check: a client role can execute public.league_select_active(uuid, text, text, integer)'; end if;
  if not has_function_privilege('service_role', 'public.league_select_active(uuid, text, text, integer)', 'execute') then raise exception 'post-check: service_role cannot execute public.league_select_active(uuid, text, text, integer)'; end if;
  raise notice 'VERIFIED 03';
end $$;
