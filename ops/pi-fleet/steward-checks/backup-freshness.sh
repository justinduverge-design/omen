#!/usr/bin/env bash
set -Eeuo pipefail
umask 027

KVM1_HOST="${KVM1_HOST:-100.115.155.19}"
KVM1_USER="steward-status"

EXPECTED_PROTOCOL="omen-backup-status.v1"
EXPECTED_REMOTE_HOST="kvm1"   # stable logical role (backup-supabase.sh HOST_ROLE), not a hostname
EXPECTED_RECOVERY_FORMAT="2"

KEY="/var/lib/steward/ssh/omen-backup-status-ed25519"
KNOWN_HOSTS="/var/lib/steward/ssh/known_hosts"

STATE_DIR="/var/lib/steward/state"
STATE_FILE="$STATE_DIR/backup-freshness.status"

# Backup runs every 6 hours.
# These thresholds deliberately allow for the timer's randomized delay
# and short temporary outages.
HEALTHY_MAX_SECONDS="${HEALTHY_MAX_SECONDS:-28800}"      # 8 hours
WARNING_MAX_SECONDS="${WARNING_MAX_SECONDS:-43200}"      # 12 hours
CRITICAL_MAX_SECONDS="${CRITICAL_MAX_SECONDS:-86400}"    # 24 hours

CHECKED_AT="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
NOW_EPOCH="${NOW_EPOCH:-$(date -u +%s)}"


RESULT=""
REASON=""
BACKUP_COMPLETED_UTC=""
AGE_SECONDS="-1"
AGE_HOURS="-1"
SNAPSHOT_ID=""
ATTEMPT_RESULT=""
ATTEMPT_UTC=""
ATTEMPT_PHASE=""
ATTEMPT_EXIT_CODE=""
AUTH_USERS=""
AUTH_IDENTITIES=""
AUTH_MFA_FACTORS=""
PUBLIC_BASE_TABLES=""
STORAGE_OBJECTS=""

write_state() {
    local tmp_state

    tmp_state="$(mktemp "$STATE_DIR/.backup-freshness.XXXXXX")"

    {
        printf 'checked_at=%s\n' "$CHECKED_AT"
        printf 'result=%s\n' "$RESULT"
        printf 'reason=%s\n' "$REASON"
        printf 'backup_completed_utc=%s\n' "$BACKUP_COMPLETED_UTC"
        printf 'age_seconds=%s\n' "$AGE_SECONDS"
        printf 'age_hours=%s\n' "$AGE_HOURS"
        printf 'snapshot_id=%s\n' "$SNAPSHOT_ID"
        printf 'attempt_result=%s\n' "$ATTEMPT_RESULT"
        printf 'attempt_utc=%s\n' "$ATTEMPT_UTC"
        printf 'attempt_phase=%s\n' "$ATTEMPT_PHASE"
        printf 'attempt_exit_code=%s\n' "$ATTEMPT_EXIT_CODE"
        printf 'auth_users=%s\n' "$AUTH_USERS"
        printf 'auth_identities=%s\n' "$AUTH_IDENTITIES"
        printf 'auth_mfa_factors=%s\n' "$AUTH_MFA_FACTORS"
        printf 'public_base_tables=%s\n' "$PUBLIC_BASE_TABLES"
        printf 'storage_objects=%s\n' "$STORAGE_OBJECTS"
    } > "$tmp_state"

    chmod 0640 "$tmp_state"
    mv -f "$tmp_state" "$STATE_FILE"
}

finish() {
    local rc="$1"

    write_state

    echo "RESULT=$RESULT"
    echo "REASON=$REASON"
    echo "BACKUP_COMPLETED_UTC=$BACKUP_COMPLETED_UTC"
    echo "AGE_SECONDS=$AGE_SECONDS"
    echo "AGE_HOURS=$AGE_HOURS"
    echo "SNAPSHOT_ID=$SNAPSHOT_ID"
    echo "ATTEMPT_RESULT=$ATTEMPT_RESULT"
    echo "AUTH_USERS=$AUTH_USERS"
    echo "AUTH_IDENTITIES=$AUTH_IDENTITIES"
    echo "PUBLIC_BASE_TABLES=$PUBLIC_BASE_TABLES"
    echo "STORAGE_OBJECTS=$STORAGE_OBJECTS"

    exit "$rc"
}

down() {
    trap - ERR
    REASON="$1"
    RESULT="DOWN"
    finish 3
}

# A crashing check must say so: silence would read as health (STANDARDS card C, as restic-check-freshness.sh).
trap 'down check_crashed' ERR
# The temp file comes after the ERR trap and its functions, so even mktemp failing writes DOWN (card C).
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

get_field() {
    local key="$1"

    awk -F= -v wanted="$key" '
        $1 == wanted {
            sub(/^[^=]*=/, "")
            print
            exit
        }
    ' "$TMP"
}

#
# Local safety checks.
#

# machine-id, not hostname: hostnames get renamed (2026-09 incident).
[[ "$(cat /etc/machine-id)" == "a459056448eb4cafadb2e4480abea91a" ]] || down "wrong_local_host"
[[ -r "$KEY" ]] || down "ssh_key_unreadable"
[[ -r "$KNOWN_HOSTS" ]] || down "known_hosts_unreadable"

[[ "$NOW_EPOCH" =~ ^[0-9]+$ ]] || down "invalid_local_clock"

for n in \
    "$HEALTHY_MAX_SECONDS" \
    "$WARNING_MAX_SECONDS" \
    "$CRITICAL_MAX_SECONDS"
do
    [[ "$n" =~ ^[0-9]+$ ]] || down "invalid_threshold"
done

if ! (
    (( HEALTHY_MAX_SECONDS < WARNING_MAX_SECONDS )) &&
    (( WARNING_MAX_SECONDS < CRITICAL_MAX_SECONDS ))
); then
    down "invalid_threshold_order"
fi

#
# Fetch only the forced-command status export.
#

# Right after a boot the network/tailnet may not be up yet: retry before calling the channel down,
# or every automatic reboot pages a false DOWN.
retry_status() { local i; for i in 1 2 3 4; do "$@" && return 0; [ "$i" -lt 4 ] && sleep 20; done; return 1; }
if ! retry_status timeout 15s \
    ssh \
      -i "$KEY" \
      -o IdentitiesOnly=yes \
      -o UserKnownHostsFile="$KNOWN_HOSTS" \
      -o StrictHostKeyChecking=yes \
      -o BatchMode=yes \
      -o ConnectTimeout=5 \
      "$KVM1_USER@$KVM1_HOST" \
      status \
      > "$TMP"
then
    down "status_channel_unavailable"
fi

PROTOCOL="$(get_field PROTOCOL)"
STATUS_CHANNEL="$(get_field STATUS_CHANNEL)"
SUCCESS_RESULT="$(get_field SUCCESS_RESULT)"
BACKUP_COMPLETED_UTC="$(get_field COMPLETED_UTC)"
REMOTE_HOST="$(get_field HOST)"
RECOVERY_FORMAT="$(get_field RECOVERY_FORMAT)"
SNAPSHOT_ID="$(get_field SNAPSHOT_ID)"

AUTH_USERS="$(get_field AUTH_USERS)"
AUTH_IDENTITIES="$(get_field AUTH_IDENTITIES)"
AUTH_MFA_FACTORS="$(get_field AUTH_MFA_FACTORS)"
PUBLIC_BASE_TABLES="$(get_field PUBLIC_BASE_TABLES)"
STORAGE_OBJECTS="$(get_field STORAGE_OBJECTS)"

ATTEMPT_RESULT="$(get_field ATTEMPT_RESULT)"
ATTEMPT_UTC="$(get_field ATTEMPT_UTC)"
ATTEMPT_PHASE="$(get_field ATTEMPT_PHASE)"
ATTEMPT_EXIT_CODE="$(get_field ATTEMPT_EXIT_CODE)"

#
# Validate the protocol rather than sourcing/evaluating remote data.
#

[[ "$PROTOCOL" == "$EXPECTED_PROTOCOL" ]] \
    || down "protocol_mismatch"

[[ "$STATUS_CHANNEL" == "OK" ]] \
    || down "remote_status_channel_error"

[[ "$SUCCESS_RESULT" == "HEALTHY" ]] \
    || down "remote_success_state_invalid"

[[ "$REMOTE_HOST" == "$EXPECTED_REMOTE_HOST" ]] \
    || down "remote_host_mismatch"

[[ "$RECOVERY_FORMAT" == "$EXPECTED_RECOVERY_FORMAT" ]] \
    || down "recovery_format_mismatch"

[[ "$SNAPSHOT_ID" =~ ^[0-9A-Fa-f]{64}$ ]] \
    || down "invalid_snapshot_id"

for value in \
    "$AUTH_USERS" \
    "$AUTH_IDENTITIES" \
    "$AUTH_MFA_FACTORS" \
    "$PUBLIC_BASE_TABLES" \
    "$STORAGE_OBJECTS"
do
    [[ "$value" =~ ^[0-9]+$ ]] \
        || down "invalid_backup_metadata"
done

case "$ATTEMPT_RESULT" in
    SUCCESS|FAILED)
        ;;
    *)
        down "invalid_attempt_result"
        ;;
esac

[[ "$BACKUP_COMPLETED_UTC" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$ ]] \
    || down "invalid_backup_timestamp"

BACKUP_EPOCH="$(
    date -u \
      -d "$BACKUP_COMPLETED_UTC" \
      '+%s' \
      2>/dev/null
)" || down "backup_timestamp_parse_failed"

AGE_SECONDS=$(( NOW_EPOCH - BACKUP_EPOCH ))

# Permit tiny clock differences, but not a materially future-dated backup.
if (( AGE_SECONDS < -300 )); then
    down "backup_timestamp_in_future"
fi

if (( AGE_SECONDS < 0 )); then
    AGE_SECONDS=0
fi

AGE_HOURS=$(( AGE_SECONDS / 3600 ))

#
# Freshness classification.
#

if (( AGE_SECONDS > CRITICAL_MAX_SECONDS )); then
    RESULT="DOWN"
    REASON="backup_older_than_24h"
    finish 3
elif (( AGE_SECONDS > WARNING_MAX_SECONDS )); then
    RESULT="CRITICAL"
    REASON="backup_older_than_12h"
    finish 2
elif [[ "$ATTEMPT_RESULT" == "FAILED" ]]; then
    RESULT="WARNING"
    REASON="latest_backup_attempt_failed"
    finish 1
elif (( AGE_SECONDS > HEALTHY_MAX_SECONDS )); then
    RESULT="WARNING"
    REASON="backup_older_than_8h"
    finish 1
else
    RESULT="HEALTHY"
    REASON="none"
    finish 0
fi
