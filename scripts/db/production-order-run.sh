#!/usr/bin/env bash
# Apply the database redo in PRODUCTION ORDER, the way the production runbook does it, against a scratch
# Postgres or a restored copy of production. NEVER production itself: production steps are applied one at
# a time through the Supabase connector, each with its own founder approval
# (Blueprints/handoffs/2026-10-03-production-runbook.md).
#
# For each step: snapshot + catalog before -> up (timed) -> the step's read-only post-checks
# (sql/2026-10-01-redo/runbook/NN.verify.sql) -> snapshot + catalog after -> the catalog CHANGE must equal
# the change recorded on scratch (sql/2026-10-01-redo/runbook/expected/).
#
#   Scratch, record the expected catalogs (mark the scratch database first, once):
#     psql -d omen_runbook -c "create schema rehearsal_target; create table rehearsal_target.marker (kind text not null);
#                              insert into rehearsal_target.marker values ('scratch')"
#     TARGET=scratch RECORD=1 PSQL="psql -X -q -v ON_ERROR_STOP=1 -d omen_runbook" scripts/db/production-order-run.sh
#   Restored copy on KVM1 (after `sudo bash kvm1-restored-clone.sh up`, which marks it 'clone'):
#     TARGET=clone CLONE=1 PSQL="ssh kvm1 sudo docker exec -i omen-redo-clone psql -X -q -v ON_ERROR_STOP=1 -U postgres -d omen" \
#       scripts/db/production-order-run.sh
#
# Before anything is applied, the script asks the database it actually reached who it is (Codex, #530): psql
# also takes its target from PGHOST, PGDATABASE, PGSERVICE and the like, so the command text proves nothing.
# It refuses unless the target carries rehearsal_target.marker with kind = $TARGET (production never does,
# and the marker is outside `public`, so no catalog comparison sees it), and refuses any server that has
# Supabase's own roles (supabase_admin, supabase_auth_admin, authenticator), which scratch and the clone
# never create.
#
# Output (snapshots, catalogs, timings) goes to $OUT (default: a temp dir). Snapshots hold counts only.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
sqldir="$here/../../sql/2026-10-01-redo"
rb="$sqldir/runbook"
out="${OUT:-$(mktemp -d)}"
mkdir -p "$out" "$rb/expected"
: "${PSQL:?set PSQL to a psql command that reads SQL from stdin}"
order=(${STEPS:-07 01 02 03 04 06 11 12 05 10 08 09})

case "$PSQL" in *supabase.co*|*supabase.com*|*pooler*) echo "refusing: this script never runs against Supabase" >&2; exit 2 ;; esac
case "${TARGET:-}" in scratch|clone) ;; *) echo "refusing: set TARGET=scratch or TARGET=clone" >&2; exit 2 ;; esac

run() { eval "$PSQL" "$@"; }

identity=$(run -At <<'SQL' | tail -1
select (select count(*) from pg_roles where rolname in ('supabase_admin', 'supabase_auth_admin', 'authenticator'))
       || '|' || coalesce((xpath('/row/kind/text()', query_to_xml(
            case when to_regclass('rehearsal_target.marker') is null then 'select null::text as kind'
                 else 'select min(kind) as kind from rehearsal_target.marker' end, false, true, '')))[1]::text, 'none')
SQL
)
supabase_roles="${identity%%|*}"; marker="${identity##*|}"
[ "$supabase_roles" = 0 ] || { echo "refusing: the target has Supabase's own roles; this is not a rehearsal database" >&2; exit 2; }
[ "$marker" = "$TARGET" ] || { echo "refusing: the target is marked '$marker', not '$TARGET' (rehearsal_target.marker)" >&2; exit 2; }
echo "target: $TARGET (marker verified on the server reached)"
json() { run -At < "$1" | tail -1; }
file_for() { ls "$sqldir"/"$1"_*."$2".sql; }

if [ "${CLONE:-0}" = 1 ]; then
  # A plain restore lacks Supabase's vault and privileges: add the stand-ins, as rehearse-redo.sh does.
  run < "$sqldir/00a_scratch_supabase_shim.sql" >/dev/null 2>&1 || true
  run < "$sqldir/00d_production_acls.sql" >/dev/null
fi
json "$rb/catalog.sql" > "$out/00.catalog.json"
node "$here/catalog.js" diff "$rb/expected/00.catalog.json" "$out/00.catalog.json" >/dev/null 2>&1 \
  || [ "${RECORD:-0}" = 1 ] || echo "note: baseline differs from the recorded scratch baseline (compared by change, not whole)"
[ "${RECORD:-0}" = 1 ] && cp "$out/00.catalog.json" "$rb/expected/00.catalog.json"
json "$rb/snapshot.sql" > "$out/00.snapshot.json"
echo "baseline: $(cat "$out/00.snapshot.json")"

prev=00
printf 'step\tseconds\n' > "$out/timings.tsv"
for s in "${order[@]}"; do
  start=$(python3 -c 'import time; print(time.time())')
  run < "$(file_for "$s" up)" >/dev/null
  end=$(python3 -c 'import time; print(time.time())')
  secs=$(python3 -c "print(round($end - $start, 2))")
  printf '%s\t%s\n' "$s" "$secs" >> "$out/timings.tsv"
  run < "$rb/$s.verify.sql" 2>&1 | grep -q "VERIFIED $s" || { run < "$rb/$s.verify.sql"; echo "FAIL $s: post-checks"; exit 1; }
  json "$rb/catalog.sql" > "$out/$s.catalog.json"
  json "$rb/snapshot.sql" > "$out/$s.snapshot.json"
  if [ "${RECORD:-0}" = 1 ]; then
    cp "$out/$s.catalog.json" "$rb/expected/$s.catalog.json"
  else
    node "$here/catalog.js" delta-check "$rb/expected/$prev.catalog.json" "$rb/expected/$s.catalog.json" \
      "$out/$prev.catalog.json" "$out/$s.catalog.json" >/dev/null 2>"$out/$s.delta.txt" \
      || { cat "$out/$s.delta.txt"; echo "FAIL $s: catalog change differs from scratch"; exit 1; }
  fi
  echo "PASS $s: up ${secs}s, post-checks verified, catalog change as expected; $(cat "$out/$s.snapshot.json" | python3 -c 'import json,sys; d=json.load(sys.stdin); print("counts", d["counts"], "vault_orphans", d["vault_orphans"])')"
  prev=$s
done
echo "output: $out"
