#!/usr/bin/env bash
# SCRATCH ONLY. Two first-time ESPN connects for the same person at the same moment must leave no orphaned
# Vault secret (Codex review on #505). Builds a scratch database up to step 02, then runs two sessions:
# session A stores and holds its transaction open for 3 seconds; session B stores the same user meanwhile.
#
#   PGHOST=127.0.0.1 PGPORT=54317 PGUSER=postgres scripts/db/concurrency-check.sh [path/to/02_up.sql]
#
# Exits 1 if any secret is left that no connection points at.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
sqldir="$here/../../sql/2026-10-01-redo"
step02="${1:-$sqldir/02_connection_credentials.up.sql}"
db=omen_concurrency_check

case "${PGHOST:-}" in *supabase.co*|*supabase.com*|*pooler*) echo "refusing: Supabase host" >&2; exit 2 ;; esac

dropdb --if-exists "$db" >/dev/null 2>&1
createdb "$db"
for f in 00a_scratch_supabase_shim 00b_production_schema_snapshot 00d_production_acls 00c_scratch_seed 01_identity_link.up; do
  psql -X -q -v ON_ERROR_STOP=1 -d "$db" -f "$sqldir/$f.sql" >/dev/null 2>&1
done
psql -X -q -v ON_ERROR_STOP=1 -d "$db" -f "$step02" >/dev/null
psql -X -q -d "$db" -c "insert into public.users (id, email) values ('00000000-0000-4000-8000-000000000009', 'scratch9@example.test')"
before=$(psql -X -At -d "$db" -c "select count(*) from vault.secrets")

psql -X -q -d "$db" >/dev/null 2>&1 <<'SQL' &
begin;
select public.connection_store_espn('00000000-0000-4000-8000-000000000009', '500001', '1', 'a-s2', '{A-SWID}');
select pg_sleep(3);
commit;
SQL
sleep 1
psql -X -q -d "$db" -c "select public.connection_store_espn('00000000-0000-4000-8000-000000000009', '500001', '1', 'b-s2', '{B-SWID}')" >/dev/null 2>&1 || true
wait

created=$(( $(psql -X -At -d "$db" -c "select count(*) from vault.secrets") - before ))
orphans=$(psql -X -At -d "$db" -c "
  select count(*) from vault.secrets s
   where not exists (select 1 from public.platform_connections pc
                      where s.id in (pc.espn_secret_id, pc.swid_secret_id, pc.token_secret_id, pc.refresh_secret_id))")
cookie=$(psql -X -At -d "$db" -c "select decrypted_secret from vault.decrypted_secrets where id =
  (select espn_secret_id from public.platform_connections where user_id = '00000000-0000-4000-8000-000000000009')")
dropdb "$db"
echo "secrets created: $created, orphaned: $orphans, stored cookie: $cookie"
[ "$orphans" = 0 ] || { echo "FAIL: concurrent connects orphaned $orphans secret(s)"; exit 1; }
echo "PASS: concurrent first-time connects leave no orphaned secret"
