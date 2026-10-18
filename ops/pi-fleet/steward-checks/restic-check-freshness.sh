#!/usr/bin/env bash
# Freshness AND outcome of the weekly Restic repository integrity check on KVM1 (repository lives on KVM2).
# A FAILED check is CRITICAL immediately; a missing/old one degrades WARNING -> CRITICAL -> DOWN.
set -Eeuo pipefail
umask 027
KVM1_HOST="${KVM1_HOST:-100.115.155.19}"; KVM1_USER="steward-status"
KEY="/var/lib/steward/ssh/omen-backup-status-ed25519"; KNOWN_HOSTS="/var/lib/steward/ssh/known_hosts"
STATE_DIR="/var/lib/steward/state"; STATE_FILE="$STATE_DIR/restic-check-freshness.status"
WARN_SECONDS="${WARN_SECONDS:-777600}"      # 9 days  (weekly check)
CRIT_SECONDS="${CRIT_SECONDS:-1209600}"     # 14 days
DOWN_SECONDS="${DOWN_SECONDS:-1814400}"     # 21 days
CHECKED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"; NOW_EPOCH="${NOW_EPOCH:-$(date -u +%s)}"
TMP="$(mktemp)"; trap 'rm -f "$TMP"' EXIT
RESULT=""; REASON=""; COMPLETED=""; AGE_SECONDS="-1"; AGE_DAYS="-1"; SNAPSHOTS=""; CHECK=""
write_state() {
  local t; t="$(mktemp "$STATE_DIR/.restic-check-freshness.XXXXXX")"
  printf 'checked_at=%s\nresult=%s\nreason=%s\nrestic_check_completed_utc=%s\ncheck_result=%s\nage_days=%s\nsnapshot_count=%s\n' \
    "$CHECKED_AT" "$RESULT" "$REASON" "$COMPLETED" "$CHECK" "$AGE_DAYS" "$SNAPSHOTS" > "$t"
  chmod 0640 "$t"; mv -f "$t" "$STATE_FILE"
}
finish() { write_state; echo "RESULT=$RESULT"; echo "REASON=$REASON"; exit "$1"; }
down() { trap - ERR; REASON="$1"; RESULT="DOWN"; finish 3; }
trap 'down check_crashed' ERR   # a crashing check must say so: silence would read as health
get() { awk -F= -v w="$1" '$1==w{sub(/^[^=]*=/,""); print; exit}' "$TMP"; }
retry_status() { local i; for i in 1 2 3 4; do "$@" && return 0; [ "$i" -lt 4 ] && sleep 20; done; return 1; }
[[ "$(cat /etc/machine-id)" == "a459056448eb4cafadb2e4480abea91a" ]] || down "wrong_local_host"
[[ -r "$KEY" ]] || down "ssh_key_unreadable"
[[ -r "$KNOWN_HOSTS" ]] || down "known_hosts_unreadable"
retry_status timeout 15s ssh -i "$KEY" -o IdentitiesOnly=yes -o UserKnownHostsFile="$KNOWN_HOSTS" -o StrictHostKeyChecking=yes \
  -o BatchMode=yes -o ConnectTimeout=5 "$KVM1_USER@$KVM1_HOST" restic-status > "$TMP" 2>/dev/null || down "status_channel_unavailable"
[[ "$(get PROTOCOL)" == "omen-restic-check-status.v1" ]] || down "protocol_mismatch"
[[ "$(get STATUS_CHANNEL)" == "OK" ]] || down "remote_status_channel_error"
CHECK="$(get CHECK_RESULT)"; COMPLETED="$(get COMPLETED_UTC)"; SNAPSHOTS="$(get SNAPSHOT_COUNT)"
[[ "$CHECK" == "OK" || "$CHECK" == "FAILED" ]] || down "invalid_check_result"
[[ "$COMPLETED" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$ ]] || down "invalid_timestamp"
EPOCH="$(date -u -d "$COMPLETED" +%s 2>/dev/null)" || down "timestamp_parse_failed"
AGE_SECONDS=$(( NOW_EPOCH - EPOCH )); (( AGE_SECONDS >= -300 )) || down "timestamp_in_future"
(( AGE_SECONDS < 0 )) && AGE_SECONDS=0
AGE_DAYS=$(( AGE_SECONDS / 86400 ))
if   [[ "$CHECK" == "FAILED" ]];            then RESULT="CRITICAL"; REASON="restic_integrity_check_failed"; finish 2
elif (( AGE_SECONDS > DOWN_SECONDS ));      then RESULT="DOWN";     REASON="restic_check_older_than_21d";   finish 3
elif (( AGE_SECONDS > CRIT_SECONDS ));      then RESULT="CRITICAL"; REASON="restic_check_older_than_14d";   finish 2
elif (( AGE_SECONDS > WARN_SECONDS ));      then RESULT="WARNING";  REASON="restic_check_older_than_9d";    finish 1
else RESULT="HEALTHY"; REASON="none"; finish 0; fi
