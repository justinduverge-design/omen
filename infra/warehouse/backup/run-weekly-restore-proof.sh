#!/usr/bin/env bash
set -euo pipefail
umask 077

EXPECTED_HOST="model-host"
REMOTE="omen-backup-client@omen-prod"
KEY="/root/.ssh/omen-warehouse-recovery_ed25519"
KNOWN_HOSTS="/root/.ssh/omen-warehouse-recovery_known_hosts"
RECEIVER="/opt/omen/warehouse-restore/receive-restore-source.sh"
RESTORER="/opt/omen/warehouse-restore/restore-isolated.sh"
SOURCE_ROOT="/var/lib/omen/warehouse-restore-sources"
PROOF_ROOT="/var/lib/omen/warehouse-restore-proofs"

KUMA_URL_FILE="/etc/omen-warehouse/kuma-restore-push-url"

# Heartbeat to the dedicated Kuma push monitor on the Pi (same pattern as the nightly backup). The copied Kuma URL
# already carries a query, so rebuild it from the bare endpoint. A missing file or unreachable Kuma never fails a
# good proof; the monitor's own silence window catches a job that never ran.
push_status() {
  local status="$1" message="$2" url config
  [[ -f "$KUMA_URL_FILE" && ! -L "$KUMA_URL_FILE" && "$(stat -c '%a:%U:%G' "$KUMA_URL_FILE")" == "600:root:root" ]] || return 0
  url="$(<"$KUMA_URL_FILE")"
  [[ "$url" != *$'\n'* && "$url" != *'"'* ]] || return 0
  case "$url" in
    http://100.98.81.0:3001/api/push/*|https://*/api/push/*) ;;
    *) return 0 ;;
  esac
  url="${url%%\?*}"
  config="url = \"${url}?status=${status}&msg=${message}&ping=\""
  printf '%s\n' "$config" | curl --config - --fail --silent --show-error --max-time 20 >/dev/null 2>&1 || true
}
already_proven=0
source=""
on_exit() {
  local result=$?
  # A failed run must not strand its received copy: the admission guard below would then refuse every retry.
  if [[ $result -ne 0 && -n "$source" && -d "$source" ]]; then rm -rf -- "$source"; fi
  # A duplicate run for an already proven snapshot is not a failure and must not turn the heartbeat Down.
  if [[ $result -ne 0 && $already_proven -eq 0 ]]; then push_status down restore_proof_failed; fi
  exit "$result"
}
trap on_exit EXIT

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
if [[ -e "$proof" ]]; then
  already_proven=1
  echo "warehouse scheduled restore refused: run was already proven" >&2; exit 65
fi
# No proof but a received copy: an earlier attempt failed. Start clean instead of refusing forever.
[[ ! -e "$source" ]] || { echo "removing stale restore source from an earlier failed attempt" >&2; rm -rf -- "$source"; }

"$RECEIVER" "$snapshot_id" "$run_id"
"$RESTORER" "$source/manifest.json" "$proof"
node /opt/omen/warehouse-restore/manifest.js verify-restore "$source/manifest.json" "$proof" >/dev/null
rm -rf -- "$source"
printf 'warehouse scheduled restore proof completed: run=%s proof=%s\n' "$run_id" "$proof"
push_status up restore_proof_completed
trap - EXIT
