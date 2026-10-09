#!/usr/bin/env bash
set -euo pipefail
umask 077

EXPECTED_HOST="model-host"
REMOTE="omen-warehouse-recovery@omen-prod"
KEY="/root/.ssh/omen-warehouse-recovery_ed25519"
KNOWN_HOSTS="/root/.ssh/omen-warehouse-recovery_known_hosts"
RECEIVER="/opt/omen/warehouse-restore/receive-restore-source.sh"
RESTORER="/opt/omen/warehouse-restore/restore-isolated.sh"
SOURCE_ROOT="/var/lib/omen/warehouse-restore-sources"
PROOF_ROOT="/var/lib/omen/warehouse-restore-proofs"

[[ "$(hostname)" == "$EXPECTED_HOST" ]] || { echo "warehouse scheduled restore refused: wrong host" >&2; exit 69; }
[[ "$(id -u)" -eq 0 ]] || { echo "warehouse scheduled restore requires root orchestration" >&2; exit 77; }
for file in "$KEY" "$KNOWN_HOSTS"; do
  [[ -f "$file" && ! -L "$file" && "$(stat -c '%a:%U:%G' "$file")" == "600:root:root" ]] || {
    echo "warehouse scheduled restore refused: SSH identity metadata is unsafe" >&2; exit 77;
  }
done
for tool in "$RECEIVER" "$RESTORER"; do
  [[ -x "$tool" && ! -L "$tool" ]] || { echo "warehouse scheduled restore refused: recovery tool is unavailable" >&2; exit 69; }
done

latest="$(ssh -F /dev/null -i "$KEY" -o BatchMode=yes -o ConnectTimeout=20 -o IdentitiesOnly=yes \
  -o StrictHostKeyChecking=yes -o UserKnownHostsFile="$KNOWN_HOSTS" "$REMOTE" latest)"
[[ "$latest" =~ ^([0-9a-f]{64})\ (warehouse-[0-9]{8}T[0-9]{6}Z)$ ]] || {
  echo "warehouse scheduled restore refused: latest snapshot response is invalid" >&2; exit 65;
}
snapshot_id="${BASH_REMATCH[1]}"
run_id="${BASH_REMATCH[2]}"
source="$SOURCE_ROOT/$run_id"
install -d -m 0700 -o root -g root "$PROOF_ROOT"
proof="$PROOF_ROOT/restore-proof-${run_id#warehouse-}.json"
[[ ! -e "$source" && ! -e "$proof" ]] || { echo "warehouse scheduled restore refused: run was already admitted or proven" >&2; exit 65; }

"$RECEIVER" "$snapshot_id" "$run_id"
"$RESTORER" "$source/manifest.json" "$proof"
node /opt/omen/warehouse-restore/manifest.js verify-restore "$source/manifest.json" "$proof" >/dev/null
rm -rf -- "$source"
printf 'warehouse scheduled restore proof completed: run=%s proof=%s\n' "$run_id" "$proof"
