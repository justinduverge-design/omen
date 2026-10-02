-- SCRATCH / RESTORED-CLONE ONLY. NEVER RUN AGAINST PRODUCTION (production already has exactly these).
--
-- Production's table and function privileges as read 2026-10-01. Applied after 00b on scratch, and after
-- a backup restore on the KVM1 clone (pg_restore --no-privileges drops them), so rehearsals run with
-- production's real access rules.

-- ACLs exactly as production (2026-10-01) ----------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['users','consent_records','deletion_audit_log','league_office_accolades',
    'league_office_awards','league_office_executives','league_office_lines','league_office_matchups',
    'league_office_rivalries','league_office_sync_jobs','moves','oauth_state','platform_connections',
    'profiles','waitlist_signups']
  loop
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant all on table public.%I to service_role', t);
  end loop;
end $$;
grant select, insert, update on public.users, public.moves, public.consent_records to authenticated;

revoke all on function public.vault_create_secret(text, text, text) from public, anon, authenticated;
revoke all on function public.vault_decrypt_secret(uuid) from public, anon, authenticated;
revoke all on function public.vault_update_secret(uuid, text) from public, anon, authenticated;
revoke all on function public.vault_delete_secret(uuid) from public, anon, authenticated;
grant execute on function public.vault_create_secret(text, text, text) to service_role;
grant execute on function public.vault_decrypt_secret(uuid) to service_role;
grant execute on function public.vault_update_secret(uuid, text) to service_role;
grant execute on function public.vault_delete_secret(uuid) to service_role;
