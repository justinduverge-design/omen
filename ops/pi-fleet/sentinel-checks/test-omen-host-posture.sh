#!/usr/bin/env bash
# Focused test for omen-host-posture.sh two-step drift logic. Stubs ssh; no network, no secrets.
set -Eeuo pipefail
case "${1:-}" in -h|--help)
  echo "usage: test-omen-host-posture.sh"
  echo "Tests the two-step drift logic of omen-host-posture.sh with a stubbed ssh; no network."
  exit 0 ;;
esac
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
W="$(mktemp -d)"; trap 'rm -rf "$W"' EXIT
mkdir -p "$W/bin" "$W/state" "$W/etc"
echo 465ba5b9c847430bb703e6cc57a60e51 > "$W/mid"
# ssh stub prints $W/report
printf '#!/bin/sh\ncat "%s/report"\n' "$W" > "$W/bin/ssh"; chmod +x "$W/bin/ssh"
base() { cat > "$W/etc/omen-host-posture-baseline-kvm1.env" <<B
AUTHKEYS_SHA=a
SUDOERS_SHA=s
ADMIN_SHA=m
SSHD_SHA=d
CRON_SHA=c
LISTENERS_SHA=l
UNITS_SHA=u
CONTAINERS_SHA=k
B
}
report() { # listeners units authkeys
  now=$(date +%s)
  cat > "$W/report" <<R
PROTOCOL=omen-host-posture.v1
STATUS_CHANNEL=OK
MACHINE_ID_SHA=5e55043ddbfb6cdd
NOW_EPOCH=$now
COLLECTED_EPOCH=$now
SSH_ACCEPTED_60M=0
SSH_ACCEPTED_NON_TAILNET_60M=0
SSH_ACCEPTED_UNEXPECTED_USER_60M=0
SSH_FAILED_60M=0
SUDO_AUTH_FAILURES_60M=0
AUTHKEYS_SHA=${3:-a}
SUDOERS_SHA=s
ADMIN_SHA=m
SSHD_SHA=d
CRON_SHA=c
LISTENERS_SHA=${1:-l}
UNITS_SHA=${2:-u}
CONTAINERS_SHA=k
R
}
run() { PATH="$W/bin:$PATH" MACHINE_ID_FILE="$W/mid" STATE_DIR="$W/state" BASELINE_DIR="$W/etc" \
  ATTEMPTS=1 RETRY_SLEEP=0 "$HERE/omen-host-posture.sh" kvm1 >/dev/null || true
  awk -F= '$1=="result"{print $2}' "$W/state/omen-host-posture-kvm1.status"; }
fails=0
expect() { if [ "$2" = "$3" ]; then echo "ok   $1"; else echo "FAIL $1: got $3 want $2"; fails=$((fails+1)); fi; }
base
report; expect "clean baseline" HEALTHY "$(run)"
report X; expect "blip run 1 stays HEALTHY" HEALTHY "$(run)"
report;   expect "blip clears -> HEALTHY" HEALTHY "$(run)"
report X; run >/dev/null
report X; expect "second consecutive drift alerts" WARNING "$(run)"
for n in 3 4 5; do report X; expect "continued drift alerts (run $n)" WARNING "$(run)"; done
reason1="$(awk -F= '$1=="reason"{print $2}' "$W/state/omen-host-posture-kvm1.status")"
report X Y; run >/dev/null; report X Y; run >/dev/null
report X; run >/dev/null
reason2="$(awk -F= '$1=="reason"{print $2}' "$W/state/omen-host-posture-kvm1.status")"
expect "reason stable while same categories drift" "$reason1" "$reason2"
report;   expect "drift clears -> HEALTHY" HEALTHY "$(run)"
report;   expect "stays HEALTHY after clear" HEALTHY "$(run)"
report X; run >/dev/null; sed -i.bak 's/^LISTENERS_SHA=.*/LISTENERS_SHA=X/' "$W/etc/omen-host-posture-baseline-kvm1.env"
report X; expect "baseline refresh -> HEALTHY" HEALTHY "$(run)"
report l u b; expect "CRITICAL alerts immediately" CRITICAL "$(run)"
if [ "$fails" = 0 ]; then echo PASS; else echo "$fails failed"; exit 1; fi
