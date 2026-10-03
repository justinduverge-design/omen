-- SCRATCH ONLY. Synthetic data, no real user, league, email or credential.
--
-- Shaped like production's counts on 2026-10-01 (read as counts only): 9 auth users, 7 app users,
-- 10 connections (ESPN 5, Sleeper 3, Yahoo 2) all active with 5 selected, 14 Vault secrets all
-- referenced, 9 moves of which 3 carry platform/league_id, 3 consent records, 0 profiles. The
-- distribution of moves across users and providers is invented; production rows were not read.

insert into auth.users (id, email) select
  ('00000000-0000-4000-8000-00000000000' || n)::uuid, 'scratch' || n || '@example.test'
from generate_series(1, 9) n;

insert into public.users (id, email) select
  ('00000000-0000-4000-8000-00000000000' || n)::uuid, 'scratch' || n || '@example.test'
from generate_series(1, 7) n;

-- Vault secrets for ESPN (2 each) and Yahoo (2 each) connections, named the way production names them.
do $$
declare
  u int;
  s2 uuid; sw uuid; acc uuid; ref uuid;
begin
  for u in 1..5 loop
    s2 := vault.create_secret('fake-espn-s2-' || u, 'espn_s2_00000000-0000-4000-8000-00000000000' || u, 'ESPN espn_s2 cookie');
    sw := vault.create_secret('{FAKE-SWID-' || u || '}', 'espn_swid_00000000-0000-4000-8000-00000000000' || u, 'ESPN SWID cookie');
    insert into public.platform_connections (user_id, platform, league_id, espn_secret_id, swid_secret_id, espn_team_id, is_selected)
    values (('00000000-0000-4000-8000-00000000000' || u)::uuid, 'espn', '10000' || u, s2, sw, (u + 2)::text, case when u <= 3 then true end);
  end loop;
  for u in 1..3 loop
    insert into public.platform_connections (user_id, platform, league_id, platform_user_id, platform_username, is_selected)
    values (('00000000-0000-4000-8000-00000000000' || (u + 3))::uuid, 'sleeper', '99887766550' || u, 'sleeper-user-' || u, 'scratchsleeper' || u,
            case when u = 3 then true end);
  end loop;
  for u in 6..7 loop
    acc := vault.create_secret('fake-yahoo-access-' || u, 'yahoo_access_00000000-0000-4000-8000-00000000000' || u, 'Yahoo OAuth access token');
    ref := vault.create_secret('fake-yahoo-refresh-' || u, 'yahoo_refresh_00000000-0000-4000-8000-00000000000' || u, 'Yahoo OAuth refresh token');
    insert into public.platform_connections (user_id, platform, league_id, platform_user_id, token_secret_id, refresh_secret_id, token_expires_at, is_selected)
    values (('00000000-0000-4000-8000-00000000000' || u)::uuid, 'yahoo', '470.l.' || (5000 + u), 'YAHOOGUID' || u, acc, ref, now() + interval '1 hour',
            case when u = 7 then true end);
  end loop;
end $$;

-- 9 moves: 6 legacy rows without league scope, 3 scoped (one per provider).
insert into public.moves (user_id, week_num, season, move_type, headline, reasoning, confidence, target_player, followed, outcome, created_at,
                          user_stars, scoring, reconciliation_state, platform, league_id)
values
  ('00000000-0000-4000-8000-000000000001', 1, 2026, 'start_sit', 'Start A over B', 'legacy', 70, 'Player A', true,  'win',          '2026-09-10', 4, 'PPR', null,    null, null),
  ('00000000-0000-4000-8000-000000000001', 2, 2026, 'start_sit', 'Start C over D', 'legacy', 55, 'Player C', false, 'not_executed', '2026-09-17', null, null, null,  null, null),
  ('00000000-0000-4000-8000-000000000002', 1, 2026, 'waiver',    'Pick up E',      'legacy', 60, 'Player E', null,  'pending',      '2026-09-10', null, null, null,  null, null),
  ('00000000-0000-4000-8000-000000000002', 2, 2026, null,        null,             null,     null, null,     true,  'loss',         '2026-09-17', null, null, null,  null, null),
  ('00000000-0000-4000-8000-000000000003', 1, 2026, 'start_sit', 'Start F over G', 'legacy', 80, 'Player F', null,  'pending',      '2026-09-11', null, null, null,  null, null),
  ('00000000-0000-4000-8000-000000000006', 1, 2026, 'start_sit', 'Start H over I', 'legacy', 65, 'Player H', true,  'pending',      '2026-09-12', null, null, null,  null, null),
  ('00000000-0000-4000-8000-000000000001', 4, 2026, 'start_sit', 'Start J over K', 'scoped', 72, 'Player J', true,  'win',          '2026-09-30', 5, 'PPR', 'exact', 'espn',    '100001'),
  ('00000000-0000-4000-8000-000000000004', 4, 2026, 'start_sit', 'Start L over M', 'scoped', 51, 'Player L', null,  'pending',      '2026-09-30', null, null, null,  'sleeper', '998877665501'),
  ('00000000-0000-4000-8000-000000000007', 4, 2026, 'start_sit', 'Start N over O', 'scoped', 66, 'Player N', null,  'pending',      '2026-09-30', null, null, null,  'yahoo',   '470.l.5007');

-- Scoring rules (step 11 backfill): production's moves all carry a contract. Here two league-scoped moves
-- (ESPN, Sleeper) and one unscoped move do; the Yahoo move does not. Bodies are synthetic.
update public.moves set scoring_contract = '{"contract_version":"omen-scoring-contract-v1","provider":"espn","coverage_state":"supported","rules":[{"event_key":"receiving_receptions","operator":"per_event","points":1}]}',
       scoring_contract_version = 'omen-scoring-contract-v1', scoring_contract_hash = 'sha256:' || repeat('e', 64)
 where platform = 'espn' and league_id = '100001';
update public.moves set scoring_contract = '{"contract_version":"omen-scoring-contract-v1","provider":"sleeper","coverage_state":"supported","rules":[{"event_key":"receiving_receptions","operator":"per_event","points":0.5}]}',
       scoring_contract_version = 'omen-scoring-contract-v1', scoring_contract_hash = 'sha256:' || repeat('5', 64)
 where platform = 'sleeper' and league_id = '998877665501';
update public.moves set scoring_contract = '{"contract_version":"omen-scoring-contract-v1","coverage_state":"supported","rules":[]}',
       scoring_contract_version = 'omen-scoring-contract-v1', scoring_contract_hash = 'sha256:' || repeat('0', 64)
 where headline = 'Start A over B';

insert into public.consent_records (user_id, consent_type, granted, granted_at) values
  ('00000000-0000-4000-8000-000000000001', 'terms', true, now()),
  ('00000000-0000-4000-8000-000000000002', 'terms', true, now()),
  ('00000000-0000-4000-8000-000000000003', 'terms', true, now());
