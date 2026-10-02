#!/usr/bin/env bash
# Rehearse the 2026-10-01 database redo on a SCRATCH Postgres 17. Never point this at production.
#
#   PGHOST=127.0.0.1 PGPORT=54317 PGUSER=postgres scripts/db/rehearse-redo.sh
#
# For a fresh database it:
#   1. loads the Supabase shim and the production schema snapshot, and proves the snapshot equals the
#      production catalog fixture (columns, constraints, indexes, policies, ACLs);
#   2. loads synthetic seed data shaped like production;
#   3. for each step: up -> catalog + data fingerprint -> tests -> down -> fingerprint must equal the
#      pre-step one (schema AND the original tables' data) -> up again -> fingerprint must equal the
#      first up (repeatable);
#   4. tears every step down in reverse and proves the database is back to the production snapshot.
#
# Exits non-zero on the first failure. Writes fingerprints to $REHEARSAL_OUT (default: a temp dir).
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/../.." && pwd)"
sqldir="$root/sql/2026-10-01-redo"
out="${REHEARSAL_OUT:-$(mktemp -d)}"
mkdir -p "$out"
db="${REHEARSAL_DB:-omen_redo_rehearsal}"
steps=(01_identity_link 02_connection_credentials 03_leagues_memberships 04_players_crosswalk 05_ledger 06_projections_shadow 07_close_client_writes 08_retire_unscoped_moves)

case "${PGHOST:-}" in
  *supabase.co*|*supabase.com*|*pooler*) echo "refusing: PGHOST looks like a Supabase host" >&2; exit 2 ;;
esac

psql_db() { psql -X -q -v ON_ERROR_STOP=1 -d "$db" "$@"; }
fingerprint() {
  PGDATABASE="$db" node "$here/catalog.js" dump > "$out/$1.catalog.json"
  PGDATABASE="$db" node "$here/catalog.js" data > "$out/$1.data.json"
}
same() {
  node "$here/catalog.js" diff "$out/$1.catalog.json" "$out/$2.catalog.json" >/dev/null 2>"$out/diff.txt" \
    && node "$here/catalog.js" diff "$out/$1.data.json" "$out/$2.data.json" >/dev/null 2>>"$out/diff.txt" \
    || { echo "FAIL: $1 differs from $2" >&2; cat "$out/diff.txt" >&2; exit 1; }
}

echo "postgres: $(psql -X -At -d postgres -c 'show server_version')"
dropdb --if-exists "$db"
createdb "$db"
psql_db -f "$sqldir/00a_scratch_supabase_shim.sql" 2>/dev/null
psql_db -f "$sqldir/00b_production_schema_snapshot.sql"
PGDATABASE="$db" node "$here/catalog.js" compare-production
psql_db -f "$sqldir/00c_scratch_seed.sql"
fingerprint 00_production
prev=00_production

for step in "${steps[@]}"; do
  psql_db -f "$sqldir/$step.up.sql"
  fingerprint "${step}_up"
  psql_db -f "$sqldir/$step.test.sql"
  fingerprint "${step}_after_test"
  same "${step}_up" "${step}_after_test"   # the tests rolled back and left nothing behind
  psql_db -f "$sqldir/$step.down.sql"
  fingerprint "${step}_down"
  same "$prev" "${step}_down"
  psql_db -f "$sqldir/$step.up.sql"
  fingerprint "${step}_reup"
  same "${step}_up" "${step}_reup"
  echo "PASS $step: up, tests, down restores schema and data, up again identical"
  prev="${step}_up"
done

for (( i=${#steps[@]}-1; i>=0; i-- )); do
  psql_db -f "$sqldir/${steps[$i]}.down.sql"
done
fingerprint 99_all_down
same 00_production 99_all_down
echo "PASS full teardown: database equals the production snapshot again (schema and data)"
echo "fingerprints: $out"
