#!/usr/bin/env bash
# SCRATCH ONLY. Races that must never leave a Vault secret behind with nothing pointing at it.
# Builds a scratch database with steps 01-10 applied, then runs three races, each with session A holding
# its transaction open for 3 seconds while session B acts on the same person:
#   1. two first-time ESPN connects at once (Codex review, #505): both must succeed, B's cookie wins,
#      exactly one pair of secrets exists;
#   2. account erase while a reconnect repairs a half-populated connection (Codex review, #511): the
#      erase must succeed and leave nothing behind;
#   3. a connect while an account erase is in flight: the connect must fail (the person is gone) and
#      leave nothing behind;
#   4. a projections purge while a snapshot insert is in flight (Codex review, #528): the purge must wait
#      for the insert and remove it, leaving no row of that provider behind;
#   5. the same for a scoring-rules purge and a rule-set insert (step 11);
#   6. an account erase while a beta report insert is in flight: the erase waits and removes it;
#   7. a beta report while an account erase is in flight: the report waits and is refused (Codex, #530).
#
#   PGHOST=127.0.0.1 PGPORT=54317 PGUSER=postgres scripts/db/concurrency-check.sh
#
# STEP02=path / STEP06=path / STEP09=path / STEP10=path / STEP11=path substitute an older version of a step, to prove the check catches it.
# Exits 1 on the first failed expectation.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
sqldir="$here/../../sql/2026-10-01-redo"
step02="${STEP02:-$sqldir/02_connection_credentials.up.sql}"
step06="${STEP06:-$sqldir/06_projections_shadow.up.sql}"
step09="${STEP09:-$sqldir/09_beta_reports.up.sql}"
step10="${STEP10:-$sqldir/10_account_erasure.up.sql}"
step11="${STEP11:-$sqldir/11_league_scoring_rules.up.sql}"
db=omen_concurrency_check
u=00000000-0000-4000-8000-000000000009

case "${PGHOST:-}" in *supabase.co*|*supabase.com*|*pooler*) echo "refusing: Supabase host" >&2; exit 2 ;; esac

q() { psql -X -At -d "$db" -c "$1"; }
fail() { echo "FAIL: $*"; dropdb --if-exists "$db" >/dev/null 2>&1; exit 1; }
orphans() {
  q "select count(*) from vault.secrets s
      where not exists (select 1 from public.platform_connections pc
                         where s.id in (pc.espn_secret_id, pc.swid_secret_id, pc.token_secret_id, pc.refresh_secret_id))"
}
# Runs SQL in session A (held open 3 s) in the background and SQL in session B after 1 s.
# Sets a_rc and b_rc to each session's exit status.
race() {
  psql -X -q -v ON_ERROR_STOP=1 -d "$db" >/dev/null 2>"$tmp/a.err" <<SQL &
begin;
$1
select pg_sleep(3);
commit;
SQL
  local apid=$!
  sleep 1
  set +e
  psql -X -q -v ON_ERROR_STOP=1 -d "$db" -c "$2" >/dev/null 2>"$tmp/b.err"; b_rc=$?
  wait "$apid"; a_rc=$?
  set -e
}

tmp="$(mktemp -d)"
dropdb --if-exists "$db" >/dev/null 2>&1
createdb "$db"
for f in 00a_scratch_supabase_shim 00b_production_schema_snapshot 00d_production_acls 00c_scratch_seed; do
  psql -X -q -v ON_ERROR_STOP=1 -d "$db" -f "$sqldir/$f.sql" >/dev/null 2>&1
done
for f in 01_identity_link.up "$step02" 03_leagues_memberships.up 04_players_crosswalk.up 05_ledger.up \
         "$step06" 07_close_client_writes.up 08_retire_unscoped_moves.up "$step09" "$step10" "$step11"; do
  case "$f" in /*) path="$f" ;; *) path="$sqldir/$f.sql" ;; esac
  psql -X -q -v ON_ERROR_STOP=1 -d "$db" -f "$path" >/dev/null 2>&1 || fail "could not apply $path"
done
reset_user() {
  q "delete from vault.secrets s where not exists (select 1 from public.platform_connections pc
       where s.id in (pc.espn_secret_id, pc.swid_secret_id, pc.token_secret_id, pc.refresh_secret_id))" >/dev/null
  q "insert into public.users (id, email) values ('$u', 'scratch9@example.test') on conflict do nothing" >/dev/null
}

# 1. Two first-time connects.
reset_user
before=$(q "select count(*) from vault.secrets")
race "select public.connection_store_espn('$u', '500001', '1', 'a-s2', '{A-SWID}');" \
     "select public.connection_store_espn('$u', '500001', '1', 'b-s2', '{B-SWID}')"
[ "$a_rc" = 0 ] || fail "race 1: first connect failed: $(cat "$tmp/a.err")"
[ "$b_rc" = 0 ] || fail "race 1: second connect failed instead of waiting: $(cat "$tmp/b.err")"
created=$(( $(q "select count(*) from vault.secrets") - before ))
cookie=$(q "select decrypted_secret from vault.decrypted_secrets where id =
  (select espn_secret_id from public.platform_connections where user_id = '$u')")
o=$(orphans)
echo "race 1: secrets created $created, orphaned $o, stored cookie $cookie"
[ "$o" = 0 ] || fail "race 1: $o orphaned secret(s)"
[ "$created" = 2 ] || fail "race 1: expected exactly 2 secrets, got $created"
[ "$cookie" = b-s2 ] || fail "race 1: expected the later connect's cookie, got $cookie"

# 2. Erase while a reconnect repairs a half-populated connection (the SWID pointer is missing).
q "update public.platform_connections set swid_secret_id = null where user_id = '$u' and platform = 'espn'" >/dev/null
reset_user
race "select public.connection_store_espn('$u', '500001', '1', 'c-s2', '{C-SWID}');" \
     "select public.account_erase('$u')"
[ "$a_rc" = 0 ] || fail "race 2: reconnect failed: $(cat "$tmp/a.err")"
[ "$b_rc" = 0 ] || fail "race 2: erase failed: $(cat "$tmp/b.err")"
o=$(orphans); left=$(q "select count(*) from public.users where id = '$u'")
echo "race 2: user rows left $left, orphaned $o"
[ "$left" = 0 ] || fail "race 2: the user survived the erase"
[ "$o" = 0 ] || fail "race 2: $o secret(s) outlived the account"

# 3. Connect while an erase is in flight.
reset_user
q "select public.connection_store_espn('$u', '500001', '1', 'd-s2', '{D-SWID}')" >/dev/null
race "select public.account_erase('$u');" \
     "select public.connection_store_espn('$u', '500001', '1', 'e-s2', '{E-SWID}')"
[ "$a_rc" = 0 ] || fail "race 3: erase failed: $(cat "$tmp/a.err")"
[ "$b_rc" != 0 ] || fail "race 3: a connect succeeded for an erased person"
o=$(orphans); conns=$(q "select count(*) from public.platform_connections where user_id = '$u'")
echo "race 3: connections left $conns, orphaned $o"
[ "$conns" = 0 ] || fail "race 3: a connection survived the erase"
[ "$o" = 0 ] || fail "race 3: $o orphaned secret(s)"

# 4. A projections purge while a snapshot insert is in flight.
ev=$(q "insert into public.data_events (event, subject, provider, rights_basis, job, source_ref, row_count)
        values ('ingest', 'projections:espn', 'espn', 'espn_user_connection', 'race', 'sha256:' || repeat('a', 64), 1)
        returning id" | head -1)
race "insert into public.projection_snapshots (ingest_event_id, provider, provider_player_id, season, week, scope, provider_points, stat_line, fetched_at, source_ref)
      values ($ev, 'espn', 'race-1', 2026, 4, 'public', '{\"ppr\":1}', '{}', now(), 'sha256:' || repeat('b', 64));" \
     "select public.projections_purge('espn', 'race check', 'founder')"
[ "$a_rc" = 0 ] || fail "race 4: insert failed: $(cat "$tmp/a.err")"
[ "$b_rc" = 0 ] || fail "race 4: purge failed: $(cat "$tmp/b.err")"
left=$(q "select count(*) from public.projection_snapshots where provider = 'espn'")
echo "race 4: ESPN projection rows left after the purge $left"
[ "$left" = 0 ] || fail "race 4: $left ESPN projection row(s) survived a purge that recorded success"

# 5. A scoring-rules purge while a rule-set insert is in flight.
ev=$(q "insert into public.data_events (event, subject, provider, rights_basis, job, source_ref, row_count)
        values ('ingest', 'scoring_rules:espn', 'espn', 'espn_user_connection', 'race', 'sha256:' || repeat('c', 64), 1)
        returning id" | head -1)
lg=$(q "select id from public.leagues where provider = 'espn' order by id limit 1")
season=$(q "select season from public.leagues where id = '$lg'")
race "insert into public.league_scoring_rules (ingest_event_id, provider, league_id, season, contract_version, contract_hash, rules)
      values ($ev, 'espn', '$lg', $season, 'omen-scoring-contract-v1', 'sha256:' || repeat('d', 64), '{}');" \
     "select public.scoring_rules_purge('espn', 'race check', 'founder')"
[ "$a_rc" = 0 ] || fail "race 5: insert failed: $(cat "$tmp/a.err")"
[ "$b_rc" = 0 ] || fail "race 5: purge failed: $(cat "$tmp/b.err")"
left=$(q "select count(*) from public.league_scoring_rules where provider = 'espn'")
echo "race 5: ESPN rule sets left after the purge $left"
[ "$left" = 0 ] || fail "race 5: $left ESPN rule set(s) survived a purge that recorded success"

# 6. An account erase while a beta report insert is in flight.
u6=00000000-0000-4000-8000-000000000003
race "insert into public.beta_reports (user_id, screen, app_version, build, os_version, device_model, connection_state, message, disclosure_accepted)
      values ('$u6', 'account', '1', '1', 'x', 'y', 'none', 'race 6', true);" \
     "select public.account_erase('$u6')"
[ "$a_rc" = 0 ] || fail "race 6: report insert failed: $(cat "$tmp/a.err")"
[ "$b_rc" = 0 ] || fail "race 6: erase failed: $(cat "$tmp/b.err")"
left=$(q "select count(*) from public.beta_reports where user_id = '$u6'")
echo "race 6: reports left after the erase $left"
[ "$left" = 0 ] || fail "race 6: a report filed during the erase survived it"

# 7. A beta report while an account erase is in flight.
u7=00000000-0000-4000-8000-000000000002
race "select public.account_erase('$u7');" \
     "insert into public.beta_reports (user_id, screen, app_version, build, os_version, device_model, connection_state, message, disclosure_accepted)
      values ('$u7', 'account', '1', '1', 'x', 'y', 'none', 'race 7', true)"
[ "$a_rc" = 0 ] || fail "race 7: erase failed: $(cat "$tmp/a.err")"
[ "$b_rc" != 0 ] || fail "race 7: a report was accepted for an account being erased"
left=$(q "select count(*) from public.beta_reports where user_id = '$u7'")
echo "race 7: reports left $left"
[ "$left" = 0 ] || fail "race 7: a report outlived the erase"

dropdb "$db"
rm -rf "$tmp"
echo "PASS: no race leaves an orphaned secret or a purged row behind"
