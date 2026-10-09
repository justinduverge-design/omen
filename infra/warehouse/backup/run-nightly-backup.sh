#!/usr/bin/env bash
set -euo pipefail
umask 077

EXPECTED_HOST="omen-prod"
SNAPSHOT_TOOL="/opt/omen/warehouse/current/infra/warehouse/backup/create-snapshot.sh"
RETENTION_TOOL="/opt/omen/warehouse/current/infra/warehouse/backup/apply-retention.sh"
KUMA_URL_FILE="/etc/omen-warehouse/kuma-backup-push-url"

[[ "$(hostname)" == "$EXPECTED_HOST" ]] || { echo "warehouse scheduled backup refused: wrong host" >&2; exit 69; }
[[ "$(id -u)" -eq 0 ]] || { echo "warehouse scheduled backup requires root orchestration" >&2; exit 77; }
for tool in "$SNAPSHOT_TOOL" "$RETENTION_TOOL"; do
  [[ -x "$tool" && ! -L "$tool" ]] || { echo "warehouse scheduled backup refused: selected backup tool is unavailable" >&2; exit 69; }
done

push_status() {
  local status="$1" message="$2" url config
  [[ -f "$KUMA_URL_FILE" && ! -L "$KUMA_URL_FILE" && "$(stat -c '%a:%U:%G' "$KUMA_URL_FILE")" == "600:root:root" ]] || return 0
  url="$(<"$KUMA_URL_FILE")"
  [[ "$url" == https://* && "$url" != *$'\n'* && "$url" != *'"'* ]] || return 0
  config="url = \"${url}&status=${status}&msg=${message}&ping=\""
  printf '%s\n' "$config" | curl --config - --fail --silent --show-error --max-time 20 >/dev/null 2>&1 || true
}

on_exit() {
  local result=$?
  if [[ $result -ne 0 ]]; then push_status down backup_failed; fi
  exit "$result"
}
trap on_exit EXIT
"$RETENTION_TOOL" --check
"$SNAPSHOT_TOOL"
"$RETENTION_TOOL"
push_status up backup_completed
trap - EXIT
