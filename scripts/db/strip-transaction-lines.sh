#!/usr/bin/env bash
# Print a redo step file with its own transaction-control lines removed, ready to send as one
# `apply_migration` body. apply_migration runs a migration as one transaction; a file's own
# `begin; ... commit;` inside it would commit early, and a later failure would leave the step half
# applied with no migration history row (tested on the throwaway project, 2026-10-03).
#
#   scripts/db/strip-transaction-lines.sh 02          # 02_connection_credentials.up.sql
#   scripts/db/strip-transaction-lines.sh 02 down     # its rollback
#
# Prints the body on stdout and its md5 on stderr. The md5 must match the one the real-Supabase
# rehearsal loaded (Blueprints/handoffs/2026-10-03-prep-for-production.md).
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
step="${1:?step number, e.g. 02}"
kind="${2:-up}"
file=$(ls "$here/../../sql/2026-10-01-redo/${step}"_*."$kind".sql)
python3 - "$file" <<'PY'
import hashlib, sys
body = open(sys.argv[1]).read()
stripped = "\n".join(l for l in body.split("\n") if l.strip().lower() not in ("begin;", "commit;", "rollback;"))
sys.stdout.write(stripped)
print(f"md5 {hashlib.md5(stripped.encode()).hexdigest()}  {sys.argv[1].split('/')[-1]}", file=sys.stderr)
PY
