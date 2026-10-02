#!/usr/bin/env bash
# SCRATCH ONLY. Races that must never leave a Vault secret behind with nothing pointing at it.
# Builds a scratch database with steps 01-10 applied, then runs three races, each with session A holding
# its transaction open for 3 seconds while session B acts on the same person:
#   1. two first-time ESPN connects at once (Codex review, #505): both must succeed, B's cookie wins,
#      exactly one pair of secrets exists;
#   2. account erase while a reconnect repairs a half-populated connection (Codex review, #511): the
#      erase must succeed and leave nothing behind;
#   3. a connect while an account erase is in flight: the connect must fail (the person is gone) and
#      leave nothing behind.
#
#   PGHOST=127.0.0.1 PGPORT=54317 PGUSER=postgres scripts/db/concurrency-check.sh
#
# STEP02=path / STEP10=path substitute an older version of a step, to prove the check catches it.
# Exits 1 on the first failed expectation.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
sqldir="$here/../../sql/2026-10-01-redo"
step02="${STEP02:-$sqldir/02_connection_credentials.up.sql}"
step10="${STEP10:-$sqldir/10_account_erasure.up.sql}"
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
         06_projections_shadow.up 07_close_client_writes.up 08_retire_unscoped_moves.up 09_beta_reports.up "$step10"; do
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

dropdb "$db"
rm -rf "$tmp"
echo "PASS: no race leaves an orphaned secret"
