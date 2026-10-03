-- SCRATCH ONLY. Assertions for step 13. Rolls back.

begin;

do $$
declare
  art text := 'sha256:' || repeat('a', 64);
  art2 text := 'sha256:' || repeat('b', 64);
  rec text := 'receipt:' || repeat('c', 64);
  out text := 'sha256:' || repeat('d', 64);
  p jsonb;
  first_id uuid;
  seen integer;
begin
  p := jsonb_build_object(
    'contract_version', 'football-intelligence-signal.v1', 'signal_type', 'team_system_identity', 'status', 'available',
    'subject', jsonb_build_object('team_id', 'omen:team:chi', 'coach_id', 'omen:coach:ben-johnson', 'season', 2026),
    'summary', 'Chicago''s offense in 2025: play-action on 18.7% of plays (2nd of 32).',
    'publication', jsonb_build_object('artifact_id', art, 'artifact_version', 'league-2026-w4', 'published_at_utc', '2026-10-03T00:00:00Z'));

  insert into public.football_intelligence_signals
    (scope_key, contract_version, signal_type, team_id, coach_id, season, status, payload, artifact_id, artifact_version,
     receipt_id, output_hash, source_artifact_ids, publication_state, published_at)
  values ('team_system_identity:omen:team:chi:2026', 'football-intelligence-signal.v1', 'team_system_identity',
          'omen:team:chi', 'omen:coach:ben-johnson', 2026, 'available', p, art, 'league-2026-w4',
          rec, out, array[art], 'published', '2026-10-03T00:00:00Z')
  returning id into first_id;

  -- The original coach-transfer type is still accepted.
  insert into public.football_intelligence_signals
    (scope_key, contract_version, signal_type, team_id, coach_id, season, status, payload, artifact_id, artifact_version,
     receipt_id, output_hash, source_artifact_ids, publication_state, published_at)
  values ('coach_transfer:omen:team:chi:2026', 'football-intelligence-signal.v1', 'coach_transfer_system_signal',
          'omen:team:chi', 'omen:coach:ben-johnson', 2026, 'available',
          jsonb_set(p, '{signal_type}', '"coach_transfer_system_signal"'), art, 'league-2026-w4',
          rec, out, array[art], 'published', '2026-10-03T00:00:00Z');

  -- An unknown signal type is refused.
  begin
    insert into public.football_intelligence_signals
      (scope_key, contract_version, signal_type, team_id, coach_id, season, status, payload, artifact_id, artifact_version,
       receipt_id, output_hash, source_artifact_ids, publication_state, published_at)
    values ('x', 'football-intelligence-signal.v1', 'player_hot_take', 'omen:team:chi', 'omen:coach:ben-johnson', 2026,
            'available', jsonb_set(p, '{signal_type}', '"player_hot_take"'), art, 'v', rec, out, array[art], 'published', now());
    raise exception 'FAIL 13: an unknown signal type was accepted';
  exception when check_violation then null;
  end;

  -- A payload that disagrees with its row is refused.
  begin
    insert into public.football_intelligence_signals
      (scope_key, contract_version, signal_type, team_id, coach_id, season, status, payload, artifact_id, artifact_version,
       receipt_id, output_hash, source_artifact_ids, publication_state, published_at)
    values ('y', 'football-intelligence-signal.v1', 'team_system_identity', 'omen:team:det', 'omen:coach:ben-johnson', 2026,
            'available', p, art, 'league-2026-w4', rec, out, array[art], 'published', now());
    raise exception 'FAIL 13: a payload naming another team was accepted';
  exception when check_violation then null;
  end;

  -- One published row per scope: the next publication must supersede the last.
  begin
    insert into public.football_intelligence_signals
      (scope_key, contract_version, signal_type, team_id, coach_id, season, status, payload, artifact_id, artifact_version,
       receipt_id, output_hash, source_artifact_ids, publication_state, published_at)
    values ('team_system_identity:omen:team:chi:2026', 'football-intelligence-signal.v1', 'team_system_identity',
            'omen:team:chi', 'omen:coach:ben-johnson', 2026, 'available',
            jsonb_set(p, '{publication,artifact_id}', to_jsonb(art2)), art2, 'league-2026-w4',
            rec, out, array[art2], 'published', now());
    raise exception 'FAIL 13: two published rows for one scope were accepted';
  exception when unique_violation then null;
  end;
  update public.football_intelligence_signals set publication_state = 'superseded' where id = first_id;
  insert into public.football_intelligence_signals
    (scope_key, contract_version, signal_type, team_id, coach_id, season, status, payload, artifact_id, artifact_version,
     receipt_id, output_hash, source_artifact_ids, publication_state, published_at, supersedes_id)
  values ('team_system_identity:omen:team:chi:2026', 'football-intelligence-signal.v1', 'team_system_identity',
          'omen:team:chi', 'omen:coach:ben-johnson', 2026, 'available',
          jsonb_set(p, '{publication,artifact_id}', to_jsonb(art2)), art2, 'league-2026-w4',
          rec, out, array[art2], 'published', now(), first_id);

  -- Signed-in users read published rows only; they cannot write. Anon reaches nothing.
  perform set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
  set local role authenticated;
  select count(*) into seen from public.football_intelligence_signals;
  if seen <> 2 then raise exception 'FAIL 13: a signed-in user sees % rows, expected the 2 published', seen; end if;
  begin
    insert into public.football_intelligence_signals (scope_key) values ('z');
    raise exception 'FAIL 13: a client wrote a signal';
  exception when insufficient_privilege then null;
  end;
  reset role;
  if has_table_privilege('anon', 'public.football_intelligence_signals', 'select')
     or has_table_privilege('authenticated', 'public.football_intelligence_signals', 'update')
     or has_table_privilege('authenticated', 'public.football_intelligence_signals', 'delete') then
    raise exception 'FAIL 13: a client role has more than published read';
  end if;
end $$;

rollback;
