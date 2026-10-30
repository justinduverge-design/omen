#!/usr/bin/env bash
# Rehearse every sql/pending/*.sql on a SCRATCH Postgres 17 that matches production today. Never point this at production.
# Why: STANDARDS card K. Pending SQL waits for the founder's approval, and nothing ran it before the founder was asked.
#
#   PGHOST=127.0.0.1 PGPORT=5432 PGUSER=postgres scripts/db/rehearse-pending.sh
#
# Builds the production snapshot plus every redo step (today's production), then applies each pending file
# twice: both must succeed, and the second must leave schema and data unchanged (safe to re-run).
# A file that changes nothing at all is flagged: production already has it.
# Compared: public tables, columns, constraints, indexes, policies, ACLs, and the data in production's
# snapshot tables (catalog.js). Not compared: sequences, types, extensions, comments, other schemas, and
# rows in tables the redo steps or the file itself created (players, ledger, ...). Read the file for those.
# Exits 0 when every file passes or there is nothing to rehearse, 1 on a failure, 2 on a refused host.
set -euo pipefail

case "${1:-}" in
  -h|--help) sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
esac

here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/../.." && pwd)"
sqldir="$root/sql/2026-10-01-redo"
pending="${PENDING_DIR:-$root/sql/pending}"
out="${REHEARSAL_OUT:-$(mktemp -d)}"
db="${REHEARSAL_DB:-omen_pending_rehearsal}"
# shellcheck source=scripts/db/redo-steps.sh
. "$here/redo-steps.sh"

# shellcheck source=scripts/db/scratch-guard.sh
. "$here/scratch-guard.sh"

shopt -s nullglob
files=("$pending"/*.sql)
if [ ${#files[@]} -eq 0 ]; then
  echo "nothing to rehearse: $pending has no .sql files"
  exit 0
fi

psql_db() { psql -X -q -v ON_ERROR_STOP=1 -d "$db" "$@"; }
fingerprint() { fingerprint_db "$db" "$1"; }
fingerprint_db() {
  PGDATABASE="$1" node "$here/catalog.js" dump > "$out/$2.catalog.json"
  PGDATABASE="$1" node "$here/catalog.js" data > "$out/$2.data.json"
}
same() {
  node "$here/catalog.js" diff "$out/$1.catalog.json" "$out/$2.catalog.json" >/dev/null 2>"$out/diff.txt" \
    && node "$here/catalog.js" diff "$out/$1.data.json" "$out/$2.data.json" >/dev/null 2>>"$out/diff.txt"
}

mkdir -p "$out"
dropdb --if-exists "$db"
createdb "$db"
psql_db -f "$sqldir/00a_scratch_supabase_shim.sql" 2>/dev/null
psql_db -f "$sqldir/00b_production_schema_snapshot.sql"
psql_db -f "$sqldir/00d_production_acls.sql"
PGDATABASE="$db" node "$here/catalog.js" compare-production
psql_db -f "$sqldir/00c_scratch_seed.sql"
applied=0
for step in "${steps[@]}"; do
  [[ " ${retired_for_production[*]} " == *" $step "* ]] && continue   # Codex review: step 15 never reached production
  psql_db -f "$sqldir/$step.up.sql"; applied=$((applied + 1))
done
fingerprint production_today
echo "scratch database matches production today (snapshot + $applied redo steps; skipped as retired: ${retired_for_production[*]})"

failed=0
for f in "${files[@]}"; do
  name="$(basename "$f" .sql)"
  # Each file runs on a fresh copy, so one file never sees another's changes.
  dropdb --if-exists "${db}_one"
  createdb -T "$db" "${db}_one"
  if ! psql -X -q -v ON_ERROR_STOP=1 -d "${db}_one" -f "$f" >"$out/$name.log" 2>&1; then
    echo "FAIL $name: does not apply on production as it is today" >&2; sed 's/^/  /' "$out/$name.log" >&2; failed=1; continue
  fi
  fingerprint_db "${db}_one" "${name}_once"
  if ! psql -X -q -v ON_ERROR_STOP=1 -d "${db}_one" -f "$f" >>"$out/$name.log" 2>&1; then
    echo "FAIL $name: a second run errors, so it is not safe to re-run" >&2; sed 's/^/  /' "$out/$name.log" >&2; failed=1; continue
  fi
  fingerprint_db "${db}_one" "${name}_twice"
  if ! same "${name}_once" "${name}_twice"; then
    echo "FAIL $name: a second run changes the database" >&2; cat "$out/diff.txt" >&2; failed=1; continue
  fi
  if same production_today "${name}_once"; then
    echo "PASS $name: applies, but changes nothing compared: production likely has it already; check, then retire it from pending/"
  else
    echo "PASS $name: applies on production as it is today, and a second run changes nothing compared"
  fi
done
dropdb --if-exists "${db}_one"
echo "fingerprints: $out"
exit "$failed"
