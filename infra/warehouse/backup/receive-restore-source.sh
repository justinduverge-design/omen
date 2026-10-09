#!/usr/bin/env bash
set -euo pipefail
umask 077

# KVM2-side receiver for the omen-prod forced-command endpoint. It never
# receives a repository credential and admits only a fresh, checksum-verified
# manifest/dump pair into the isolated-restore source root.

EXPECTED_HOST="model-host"
REMOTE="omen-warehouse-recovery@omen-prod"
KEY="/root/.ssh/omen-warehouse-recovery_ed25519"
KNOWN_HOSTS="/root/.ssh/omen-warehouse-recovery_known_hosts"
SOURCE_ROOT="/var/lib/omen/warehouse-restore-sources"
MANIFEST_TOOL="/opt/omen/warehouse-restore/manifest.js"

[[ $# -eq 2 ]] || { echo "usage: receive-restore-source.sh <snapshot-id> <warehouse-run-id>" >&2; exit 64; }
snapshot_id="$1"
run_id="$2"
[[ "$(hostname)" == "$EXPECTED_HOST" ]] || { echo "warehouse restore receive refused: wrong host" >&2; exit 69; }
[[ "$(id -u)" -eq 0 ]] || { echo "warehouse restore receive requires root orchestration" >&2; exit 77; }
[[ "$snapshot_id" =~ ^[0-9a-f]{64}$ && "$run_id" =~ ^warehouse-[0-9]{8}T[0-9]{6}Z$ ]] || {
  echo "warehouse restore receive refused: invalid snapshot or run identity" >&2
  exit 64
}
for command in ssh node python3 sha256sum; do
  command -v "$command" >/dev/null || { echo "warehouse restore receive requires $command" >&2; exit 69; }
done
[[ -f "$KEY" && ! -L "$KEY" && "$(stat -c '%a:%U:%G' "$KEY")" == "600:root:root" ]] || {
  echo "warehouse restore receive refused: SSH key metadata is unsafe" >&2
  exit 77
}
[[ -f "$KNOWN_HOSTS" && ! -L "$KNOWN_HOSTS" && "$(stat -c '%a:%U:%G' "$KNOWN_HOSTS")" == "600:root:root" ]] || {
  echo "warehouse restore receive refused: known-hosts metadata is unsafe" >&2
  exit 77
}
[[ -f "$MANIFEST_TOOL" && ! -L "$MANIFEST_TOOL" ]] || { echo "warehouse restore receive refused: manifest verifier is unavailable" >&2; exit 69; }
install -d -m 0700 -o root -g root "$SOURCE_ROOT"
final="$SOURCE_ROOT/$run_id"
[[ ! -e "$final" ]] || { echo "warehouse restore receive refused: target already exists" >&2; exit 65; }
stage="$(mktemp -d "$SOURCE_ROOT/.${run_id}.XXXXXX")"
cleanup() { rm -rf -- "$stage"; }
trap cleanup EXIT

ssh_fixed() {
  ssh -F /dev/null -i "$KEY" -o BatchMode=yes -o ConnectTimeout=20 -o IdentitiesOnly=yes \
    -o StrictHostKeyChecking=yes -o UserKnownHostsFile="$KNOWN_HOSTS" "$REMOTE" "$@"
}

ssh_fixed manifest "$snapshot_id" "$run_id" > "$stage/manifest.json"
[[ -s "$stage/manifest.json" && "$(stat -c '%s' "$stage/manifest.json")" -le 65536 ]] || {
  echo "warehouse restore receive refused: manifest size is invalid" >&2
  exit 65
}
node -e 'const fs=require("fs"); const tool=require(process.argv[1]); tool.validateManifest(JSON.parse(fs.readFileSync(process.argv[2],"utf8")));' \
  "$MANIFEST_TOOL" "$stage/manifest.json"
read -r manifest_run dump_bytes <<< "$(python3 - "$stage/manifest.json" <<'PY'
import json, sys
try:
    value = json.load(open(sys.argv[1], encoding="utf-8"))
    size = value["dump"]["bytes"]
    if not isinstance(size, int) or isinstance(size, bool) or not 0 < size <= 1099511627776:
        raise ValueError("dump size is outside the recovery bound")
    print(value["backup_run_id"], size)
except (OSError, ValueError, KeyError, TypeError):
    raise SystemExit("warehouse restore receive refused: manifest structure is invalid")
PY
)"
[[ "$manifest_run" == "$run_id" && "$dump_bytes" =~ ^[1-9][0-9]*$ ]] || {
  echo "warehouse restore receive refused: manifest identity or dump size is invalid" >&2
  exit 65
}

free_bytes="$(python3 - "$SOURCE_ROOT" <<'PY'
import os, sys
value = os.statvfs(sys.argv[1])
print(value.f_bavail * value.f_frsize)
PY
)"
[[ "$free_bytes" -gt $((dump_bytes + 1073741824)) ]] || {
  echo "warehouse restore receive refused: insufficient restore-source headroom" >&2
  exit 75
}
ssh_fixed dump "$snapshot_id" "$run_id" > "$stage/warehouse.dump"
[[ "$(stat -c '%s' "$stage/warehouse.dump")" -eq "$dump_bytes" ]] || {
  echo "warehouse restore receive refused: dump byte count mismatch" >&2
  exit 65
}
node "$MANIFEST_TOOL" verify "$stage/manifest.json" >/dev/null
chmod 0400 "$stage/manifest.json" "$stage/warehouse.dump"
mv -- "$stage" "$final"
trap - EXIT
printf 'warehouse restore source received and verified: run=%s snapshot=%s\n' "$run_id" "$snapshot_id"
