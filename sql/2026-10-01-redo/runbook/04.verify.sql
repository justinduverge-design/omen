-- READ-ONLY. Post-checks for step 04, run right after its up on production (and in the dry run).
-- Raises on the first failed check; prints 'VERIFIED 04' when every check holds.
do $$
begin
  if exists (select 1 from public.players) or exists (select 1 from public.player_provider_ids) then
    raise exception 'step 04: player tables should start empty (the D3 job fills them)';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.players'::regclass) then raise exception 'post-check: RLS off on players'; end if;
  if has_table_privilege('anon', 'public.players', 'select') or has_table_privilege('anon', 'public.players', 'insert') or has_table_privilege('authenticated', 'public.players', 'insert') or has_table_privilege('authenticated', 'public.players', 'update') or has_table_privilege('authenticated', 'public.players', 'delete') then raise exception 'post-check: a client role can write or anon can read players'; end if;
  if not (select relrowsecurity from pg_class where oid = 'public.player_provider_ids'::regclass) then raise exception 'post-check: RLS off on player_provider_ids'; end if;
  if has_table_privilege('anon', 'public.player_provider_ids', 'select') or has_table_privilege('anon', 'public.player_provider_ids', 'insert') or has_table_privilege('authenticated', 'public.player_provider_ids', 'insert') or has_table_privilege('authenticated', 'public.player_provider_ids', 'update') or has_table_privilege('authenticated', 'public.player_provider_ids', 'delete') then raise exception 'post-check: a client role can write or anon can read player_provider_ids'; end if;
  if not (select relrowsecurity from pg_class where oid = 'public.player_identity_unresolved'::regclass) then raise exception 'post-check: RLS off on player_identity_unresolved'; end if;
  if has_table_privilege('anon', 'public.player_identity_unresolved', 'select') or has_table_privilege('anon', 'public.player_identity_unresolved', 'insert') or has_table_privilege('authenticated', 'public.player_identity_unresolved', 'insert') or has_table_privilege('authenticated', 'public.player_identity_unresolved', 'update') or has_table_privilege('authenticated', 'public.player_identity_unresolved', 'delete') then raise exception 'post-check: a client role can write or anon can read player_identity_unresolved'; end if;
  raise notice 'VERIFIED 04';
end $$;
