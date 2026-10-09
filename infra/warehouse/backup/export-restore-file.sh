#!/usr/bin/env bash
set -euo pipefail
umask 077

# Forced-command endpoint on omen-prod. The caller may retrieve only one of the
# two fixed files belonging to one exact warehouse-tagged Restic snapshot. The
# repository password never leaves this host and no caller-controlled path is
# passed to Restic.

EXPECTED_HOST="omen-prod"
EXPECTED_USER="omen-backup-client"
BACKUP_HOME="/var/lib/omen-backup-client"
RESTIC_PASSWORD_FILE="$BACKUP_HOME/restic-password"
COMMISSIONED_BACKUP="/opt/omen-backup/bin/backup-supabase.sh"
SNAPSHOT_ROOT="/var/lib/omen/warehouse-backups"

[[ "$(hostname)" == "$EXPECTED_HOST" ]] || { echo "warehouse restore export refused: wrong host" >&2; exit 69; }
[[ "$(id -un)" == "$EXPECTED_USER" ]] || { echo "warehouse restore export refused: wrong identity" >&2; exit 77; }
for command in restic python3; do
  command -v "$command" >/dev/null || { echo "warehouse restore export requires $command" >&2; exit 69; }
done
[[ -f "$RESTIC_PASSWORD_FILE" && ! -L "$RESTIC_PASSWORD_FILE" && -r "$RESTIC_PASSWORD_FILE" ]] || {
  echo "warehouse restore export refused: commissioned Restic credential is unavailable" >&2
  exit 78
}
[[ -r "$COMMISSIONED_BACKUP" ]] || { echo "warehouse restore export refused: repository configuration is unavailable" >&2; exit 78; }

repository="$(sed -n 's/^RESTIC_REPOSITORY="\([^"]*\)"$/\1/p' "$COMMISSIONED_BACKUP")"
[[ "$(printf '%s\n' "$repository" | wc -l)" -eq 1 && "$repository" == sftp:* ]] || {
  echo "warehouse restore export refused: commissioned repository assignment is invalid" >&2
  exit 78
}

request="${SSH_ORIGINAL_COMMAND:-}"
if [[ "$request" == "latest" ]]; then
  snapshots="$(mktemp)"
  trap 'rm -f -- "$snapshots"' EXIT
  HOME="$BACKUP_HOME" RESTIC_REPOSITORY="$repository" RESTIC_PASSWORD_FILE="$RESTIC_PASSWORD_FILE" \
    restic snapshots --json --no-cache --latest 1 --tag omen-football-warehouse > "$snapshots"
  snapshot_id="$(python3 - "$snapshots" <<'PY'
import json, re, sys
items = json.load(open(sys.argv[1], encoding="utf-8"))
if len(items) != 1:
    raise SystemExit("warehouse restore export refused: exactly one latest snapshot is required")
snapshot = items[0]
identity = snapshot.get("id", "")
paths = snapshot.get("paths", [])
if not isinstance(identity, str) or len(identity) != 64 or any(c not in "0123456789abcdef" for c in identity):
    raise SystemExit("warehouse restore export refused: latest snapshot identity is invalid")
if not isinstance(paths, list) or len(paths) != 1:
    raise SystemExit("warehouse restore export refused: latest snapshot path is invalid")
path = paths[0].rstrip("/").split("/")[-1]
if re.fullmatch(r"warehouse-[0-9]{8}T[0-9]{6}Z", path) is None:
    raise SystemExit("warehouse restore export refused: latest run identity is invalid")
print(identity, path)
PY
)"
  printf '%s\n' "$snapshot_id"
  exit 0
fi
[[ "$request" =~ ^(manifest|dump)\ ([0-9a-f]{64})\ (warehouse-[0-9]{8}T[0-9]{6}Z)$ ]] || {
  echo "warehouse restore export refused: invalid request" >&2
  exit 64
}
operation="${BASH_REMATCH[1]}"
snapshot_id="${BASH_REMATCH[2]}"
run_id="${BASH_REMATCH[3]}"

snapshot_json="$(mktemp)"
trap 'rm -f -- "$snapshot_json"' EXIT
HOME="$BACKUP_HOME" RESTIC_REPOSITORY="$repository" RESTIC_PASSWORD_FILE="$RESTIC_PASSWORD_FILE" \
  restic snapshots --json --no-cache --tag omen-football-warehouse "$snapshot_id" > "$snapshot_json"
python3 - "$snapshot_json" "$snapshot_id" <<'PY'
import json, sys
items = json.load(open(sys.argv[1], encoding="utf-8"))
if len(items) != 1 or items[0].get("id") != sys.argv[2] or "omen-football-warehouse" not in items[0].get("tags", []):
    raise SystemExit("warehouse restore export refused: snapshot identity or tag mismatch")
PY

case "$operation" in
  manifest) filename="manifest.json" ;;
  dump) filename="warehouse.dump" ;;
esac
exec env HOME="$BACKUP_HOME" RESTIC_REPOSITORY="$repository" RESTIC_PASSWORD_FILE="$RESTIC_PASSWORD_FILE" \
  restic dump --no-cache "$snapshot_id" "$SNAPSHOT_ROOT/$run_id/$filename"
