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
#   Scratch, record the expected catalogs:
#     RECORD=1 PSQL="psql -X -q -v ON_ERROR_STOP=1 -d omen_runbook" scripts/db/production-order-run.sh
#   Restored copy on KVM1 (after `sudo bash kvm1-restored-clone.sh up`), from a machine with node:
#     CLONE=1 PSQL="ssh kvm1 sudo docker exec -i omen-redo-clone psql -X -q -v ON_ERROR_STOP=1 -U postgres -d omen" \
#       scripts/db/production-order-run.sh
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

run() { eval "$PSQL" "$@"; }
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
