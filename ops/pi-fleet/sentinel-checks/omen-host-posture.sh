#!/usr/bin/env bash
# Host drift + login-event observation of an Omen VPS, from hashes/counts published by its root collector and served
# over a forced-command channel. Usage: omen-host-posture.sh kvm1|kvm2
set -Eeuo pipefail
umask 027
case "${1:-}" in -h|--help)
  echo "usage: omen-host-posture.sh kvm1|kvm2"
  echo "Observes an Omen VPS posture over the forced-command channel and writes the Sentinel status file."
  exit 0 ;;
esac
ROLE="${1:?role kvm1|kvm2}"
case "$ROLE" in
  kvm1) IP="${OVERRIDE_IP:-100.115.155.19}"; EXPECTED_MID="5e55043ddbfb6cdd" ;;
  kvm2) IP="${OVERRIDE_IP:-100.67.187.57}";  EXPECTED_MID="9189b50f62a06c8a" ;;
  *) echo "unknown role" >&2; exit 64 ;;
esac
KEY=/var/lib/sentinel/ssh/omen-host-status-ed25519; KNOWN=/var/lib/sentinel/ssh/known_hosts
STATE_DIR="${STATE_DIR:-/var/lib/sentinel/state}"; STATE="$STATE_DIR/omen-host-posture-$ROLE.status"
BASELINE="${BASELINE_DIR:-/etc/sentinel}/omen-host-posture-baseline-$ROLE.env"
ATTEMPTS="${ATTEMPTS:-3}"; RETRY_SLEEP="${RETRY_SLEEP:-20}"
STALE_SECONDS="${STALE_SECONDS:-1800}"; SSH_FAIL_WARN="${SSH_FAIL_WARN:-10}"; SUDO_FAIL_WARN="${SUDO_FAIL_WARN:-3}"
CHECKED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
TMP="$(mktemp)"; trap 'rm -f "$TMP"' EXIT
RESULT="HEALTHY"; REASONS=(); DRIFT=(); PENDING=()
# WARNING-class drift (listeners, units, containers) must persist across two consecutive checks before it alerts: a deploy or
# package run legitimately changes these for a few seconds. Security-class drift alerts immediately.
# A confirmed category stays in drift_pending while it keeps differing (see cmp), so it alerts on every run, not every other.
PREV_PENDING="$(awk -F= '$1=="drift_pending"{print $2; exit}' "$STATE" 2>/dev/null || true)"
rank() { case "$1" in HEALTHY) echo 0;; WARNING) echo 1;; CRITICAL) echo 2;; DOWN) echo 3;; esac; }
flag() { REASONS+=("$2"); [ "$(rank "$1")" -gt "$(rank "$RESULT")" ] && RESULT="$1"; return 0; }
get() { awk -F= -v w="$1" '$1==w{sub(/^[^=]*=/,""); print; exit}' "$TMP"; }
bget() { awk -F= -v w="$1" '$1==w{sub(/^[^=]*=/,""); print; exit}' "$BASELINE"; }
A_ACC=""; A_FAIL=""; A_SUDO=""; A_NT=""; A_BU=""
write_state() {
  local t reason="none" drift="none" pending="none"; t="$(mktemp "$STATE_DIR/.omen-host-posture.XXXXXX")"
  [ ${#REASONS[@]} -gt 0 ] && reason="$(IFS=+; echo "${REASONS[*]}")"
  [ ${#DRIFT[@]} -gt 0 ] && drift="$(IFS=,; echo "${DRIFT[*]}")"
  [ ${#PENDING[@]} -gt 0 ] && pending="$(IFS=,; echo "${PENDING[*]}")"
  printf 'checked_at=%s\nomen_posture=%s\nresult=%s\nreason=%s\ndrift_categories=%s\ndrift_pending=%s\nssh_accepted_60m=%s\nssh_accepted_non_tailnet_60m=%s\nssh_accepted_unexpected_user_60m=%s\nssh_failed_60m=%s\nsudo_auth_failures_60m=%s\n' \
    "$CHECKED_AT" "$ROLE" "$RESULT" "$reason" "$drift" "$pending" "$A_ACC" "$A_NT" "$A_BU" "$A_FAIL" "$A_SUDO" > "$t"
  chmod 0640 "$t"; mv -f "$t" "$STATE"
  echo "RESULT=$RESULT"; echo "REASON=$reason"
}
down() { trap - ERR; flag DOWN "$1"; write_state; exit 3; }
trap 'trap - ERR; flag DOWN check_crashed; write_state; exit 3' ERR   # a crashing check must say so
[[ "$(cat "${MACHINE_ID_FILE:-/etc/machine-id}")" == "465ba5b9c847430bb703e6cc57a60e51" ]] || down "wrong_local_host"
ok=0
for ((i=1; i<=ATTEMPTS; i++)); do
  if timeout 15s ssh -i "$KEY" -o IdentitiesOnly=yes -o UserKnownHostsFile="$KNOWN" -o StrictHostKeyChecking=yes \
       -o BatchMode=yes -o ConnectTimeout=5 "sentinel-status@$IP" posture > "$TMP" 2>/dev/null </dev/null; then ok=1; break; fi
  [ "$i" -lt "$ATTEMPTS" ] && sleep "$RETRY_SLEEP"
done
[ "$ok" = 1 ] || down "status_channel_unavailable"
[[ "$(get PROTOCOL)" == "omen-host-posture.v1" ]] || down "protocol_mismatch"
[[ "$(get STATUS_CHANNEL)" == "OK" ]] || down "remote_status_channel_error"
[[ "$(get MACHINE_ID_SHA)" == "$EXPECTED_MID" ]] || down "machine_identity_mismatch"
NOW="$(get NOW_EPOCH)"; COLLECTED="$(get COLLECTED_EPOCH)"
A_ACC="$(get SSH_ACCEPTED_60M)"; A_NT="$(get SSH_ACCEPTED_NON_TAILNET_60M)"; A_BU="$(get SSH_ACCEPTED_UNEXPECTED_USER_60M)"
A_FAIL="$(get SSH_FAILED_60M)"; A_SUDO="$(get SUDO_AUTH_FAILURES_60M)"
for v in NOW COLLECTED A_ACC A_NT A_BU A_FAIL A_SUDO; do [[ "${!v}" =~ ^[0-9]+$ ]] || down "invalid_metadata"; done
(( NOW - COLLECTED > STALE_SECONDS )) && flag WARNING "posture_report_stale"
# login events
[ "$A_NT" -gt 0 ] && flag CRITICAL "ssh_login_from_outside_tailnet"
[ "$A_BU" -gt 0 ] && flag CRITICAL "ssh_login_by_unexpected_user"
[ "$A_FAIL" -ge "$SSH_FAIL_WARN" ] && flag WARNING "ssh_failures_60m"
[ "$A_SUDO" -ge "$SUDO_FAIL_WARN" ] && flag WARNING "sudo_auth_failures_60m"
# drift against the deliberate baseline (hashes only; content is never transferred)
if [ ! -r "$BASELINE" ]; then flag WARNING "baseline_missing"
else
  cmp() { # key category severity
    local cur base; cur="$(get "$1")"; base="$(bget "$1")"
    if [ -z "$base" ] || [ -z "$cur" ]; then flag WARNING "baseline_incomplete_$2"
    elif [ "$cur" != "$base" ]; then
      if [ "$3" = CRITICAL ]; then DRIFT+=("$2"); flag CRITICAL "drift_$2"
      elif [[ ",$PREV_PENDING," == *",$2,"* ]]; then
        # Confirmed (pending last run too). Stay in drift_pending so it is flagged again next run, until the drift
        # clears or the baseline is refreshed. Dropping it here made persistent drift flap WARNING/HEALTHY.
        DRIFT+=("$2"); PENDING+=("$2"); flag "$3" "drift_$2"
      else PENDING+=("$2"); fi
    fi
  }
  cmp AUTHKEYS_SHA authorized_keys CRITICAL; cmp SUDOERS_SHA sudoers CRITICAL; cmp ADMIN_SHA admin_members CRITICAL
  cmp SSHD_SHA sshd_config CRITICAL;         cmp CRON_SHA cron CRITICAL
  cmp LISTENERS_SHA listeners WARNING;       cmp UNITS_SHA enabled_units WARNING; cmp CONTAINERS_SHA containers WARNING
fi
write_state
case "$RESULT" in HEALTHY) exit 0;; WARNING) exit 1;; *) exit 2;; esac
