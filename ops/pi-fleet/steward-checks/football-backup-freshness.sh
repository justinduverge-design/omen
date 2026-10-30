#!/usr/bin/env bash
# --help prints this and exits before anything runs (STANDARDS card E, rule 7).
case "${1:-}" in
  -h|--help) cat <<'USAGE'
football-backup-freshness.sh (Steward Pi, by its timer)
Checks the freshness of KVM1's weekly football-data backup and writes
/var/lib/steward/state/football-backup-freshness.status. No arguments.
Exit 0 HEALTHY, 1 WARNING, 2 CRITICAL, 3 DOWN (including a crash).
USAGE
    exit 0 ;;
esac
# Freshness of the weekly omen-football-data backup on KVM1, read through the same forced-command
# status channel as backup-freshness.sh. Weekly timer (Tue 07:45 ET) => thresholds are in days.
set -Eeuo pipefail
umask 027
KVM1_HOST="${KVM1_HOST:-100.115.155.19}"
KVM1_USER="steward-status"
EXPECTED_PROTOCOL="omen-football-backup-status.v1"
KEY="/var/lib/steward/ssh/omen-backup-status-ed25519"
KNOWN_HOSTS="/var/lib/steward/ssh/known_hosts"
STATE_DIR="/var/lib/steward/state"
STATE_FILE="$STATE_DIR/football-backup-freshness.status"
HEALTHY_MAX_SECONDS="${HEALTHY_MAX_SECONDS:-691200}"    # 8 days
CRITICAL_MAX_SECONDS="${CRITICAL_MAX_SECONDS:-777600}"  # 9 days
DOWN_MAX_SECONDS="${DOWN_MAX_SECONDS:-1209600}"         # 14 days
CHECKED_AT="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"; NOW_EPOCH="${NOW_EPOCH:-$(date -u +%s)}"
RESULT=""; REASON=""; COMPLETED=""; AGE_SECONDS="-1"; AGE_DAYS="-1"; SNAPSHOT_ID=""
write_state() {
  local t; t="$(mktemp "$STATE_DIR/.football-backup-freshness.XXXXXX")"
  { printf 'checked_at=%s\nresult=%s\nreason=%s\nfootball_backup_completed_utc=%s\nage_seconds=%s\nage_days=%s\nsnapshot_id=%s\n' \
      "$CHECKED_AT" "$RESULT" "$REASON" "$COMPLETED" "$AGE_SECONDS" "$AGE_DAYS" "$SNAPSHOT_ID"; } > "$t"
  chmod 0640 "$t"; mv -f "$t" "$STATE_FILE"
}
finish() { write_state; echo "RESULT=$RESULT"; echo "REASON=$REASON"; echo "AGE_DAYS=$AGE_DAYS"; exit "$1"; }
down() { trap - ERR; REASON="$1"; RESULT="DOWN"; finish 3; }
trap 'down check_crashed' ERR   # a crashing check must say so: silence would read as health
# The temp file comes after the ERR trap and its functions, so even mktemp failing writes DOWN (card C).
TMP="$(mktemp)"; trap 'rm -f "$TMP"' EXIT
get() { awk -F= -v w="$1" '$1==w{sub(/^[^=]*=/,""); print; exit}' "$TMP"; }
[[ "$(cat /etc/machine-id)" == "a459056448eb4cafadb2e4480abea91a" ]] || down "wrong_local_host"
[[ -r "$KEY" ]] || down "ssh_key_unreadable"
[[ -r "$KNOWN_HOSTS" ]] || down "known_hosts_unreadable"
# Right after a boot the network/tailnet may not be up yet: retry before calling the channel down,
# or every automatic reboot pages a false DOWN.
retry_status() { local i; for i in 1 2 3 4; do "$@" && return 0; [ "$i" -lt 4 ] && sleep 20; done; return 1; }
retry_status timeout 15s ssh -i "$KEY" -o IdentitiesOnly=yes -o UserKnownHostsFile="$KNOWN_HOSTS" -o StrictHostKeyChecking=yes \
  -o BatchMode=yes -o ConnectTimeout=5 "$KVM1_USER@$KVM1_HOST" football-status > "$TMP" || down "status_channel_unavailable"
[[ "$(get PROTOCOL)" == "$EXPECTED_PROTOCOL" ]] || down "protocol_mismatch"
[[ "$(get STATUS_CHANNEL)" == "OK" ]] || down "remote_status_channel_error"
[[ "$(get SUCCESS_RESULT)" == "SUCCESS" ]] || down "remote_success_state_invalid"
COMPLETED="$(get COMPLETED_UTC)"; SNAPSHOT_ID="$(get SNAPSHOT_ID)"
[[ "$SNAPSHOT_ID" =~ ^[0-9A-Fa-f]{64}$ ]] || down "invalid_snapshot_id"
[[ "$COMPLETED" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$ ]] || down "invalid_backup_timestamp"
EPOCH="$(date -u -d "$COMPLETED" +%s 2>/dev/null)" || down "backup_timestamp_parse_failed"
AGE_SECONDS=$(( NOW_EPOCH - EPOCH ))
(( AGE_SECONDS >= -300 )) || down "backup_timestamp_in_future"
(( AGE_SECONDS < 0 )) && AGE_SECONDS=0
AGE_DAYS=$(( AGE_SECONDS / 86400 ))
if   (( AGE_SECONDS > DOWN_MAX_SECONDS ));     then RESULT="DOWN";     REASON="football_backup_older_than_14d"; finish 3
elif (( AGE_SECONDS > CRITICAL_MAX_SECONDS )); then RESULT="CRITICAL"; REASON="football_backup_older_than_9d";  finish 2
elif (( AGE_SECONDS > HEALTHY_MAX_SECONDS ));  then RESULT="WARNING";  REASON="football_backup_older_than_8d";  finish 1
else RESULT="HEALTHY"; REASON="none"; finish 0; fi
