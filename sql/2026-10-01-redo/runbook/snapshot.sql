-- READ-ONLY. Run immediately before and after every production step (and in the dry run).
-- One row: row counts for every table that exists (production's and the redo's), the redo objects
-- present, and the number of Vault secrets nothing points at. No row contents, no secrets.
select json_build_object(
  'at', now(),
  'counts', (select json_object_agg(t, (xpath('/row/n/text()', query_to_xml(format('select count(*) n from public.%I', t), false, true, '')))[1]::text::int)
               from unnest(array['users', 'platform_connections', 'moves', 'consent_records', 'profiles', 'oauth_state',
                                 'waitlist_signups', 'deletion_audit_log', 'leagues', 'league_memberships', 'players',
                                 'player_provider_ids', 'player_identity_unresolved', 'decisions', 'decision_factors',
                                 'decision_actions', 'decision_outcomes', 'data_events', 'projection_snapshots',
                                 'projection_shadow_log', 'league_scoring_rules', 'saved_trades', 'retired_rows',
                                 'beta_reports']) t
              where to_regclass('public.' || t) is not null),
  'auth_users', (select count(*) from auth.users),
  'users_without_auth', (select count(*) from public.users u where not exists (select 1 from auth.users a where a.id = u.id)),
  'moves_unscoped', (select count(*) from public.moves where platform is null or league_id is null),
  'moves_scoped', (select count(*) from public.moves where platform is not null and league_id is not null),
  'moves_scoped_with_rules', (select count(*) from public.moves where platform is not null and league_id is not null and scoring_contract is not null),
  'connections_with_league', (select count(*) from public.platform_connections where league_id <> platform and league_id <> '' and user_id is not null),
  'distinct_leagues', (select count(distinct (platform, league_id)) from public.platform_connections where league_id <> platform and league_id <> ''),
  'vault_secrets', (select count(*) from vault.secrets),
  'vault_orphans', (select count(*) from vault.secrets s where not exists (
      select 1 from public.platform_connections pc
       where s.id in (pc.espn_secret_id, pc.swid_secret_id, pc.token_secret_id, pc.refresh_secret_id))),
  'redo_functions', (select coalesce(json_agg(proname order by proname), '[]') from pg_proc
                      where pronamespace = 'public'::regnamespace
                        and proname not in ('rls_auto_enable', 'vault_create_secret', 'vault_decrypt_secret',
                                            'vault_delete_secret', 'vault_update_secret'))
) snapshot;
