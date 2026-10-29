#!/bin/bash
# --help prints this and exits before anything runs (STANDARDS card E, rule 7).
case "${1:-}" in
  -h|--help) cat <<'USAGE'
slops-link-watchdog.sh (Steward Pi, as root, every minute by slops-link-watchdog.timer)
Watches the default gateway; reconnects Wi-Fi after 10 minutes down and reboots after 30, with
backoff and at most 3 reboots per outage. No arguments. Exit 0.
USAGE
    exit 0 ;;
esac
# Slops Pi link watchdog (2026-10-18). Runs every minute from slops-link-watchdog.timer, as root.
#
# Why: on 2026-10-16 Steward's Wi-Fi roamed between eero nodes, authentication timed out and the link
# stayed half-up for ~37 h with no recovery (Blueprints/specs/infrastructure/slops-os-raspberry-pi-fleet-v1.md).
#
# The link counts as up when the default gateway answers ICMP or ARP. When it stays down:
#   10 min  reconnect Wi-Fi (once per outage)
#   30 min  reboot; each further reboot in the same outage waits twice as long (30, 60, 120 min),
#           and after 3 reboots only Wi-Fi reconnects are tried, every 30 min. A router that is down for
#           hours therefore costs at most 3 reboots, not one every half hour.
# Timing uses /proc/uptime (monotonic), never the wall clock: the Pi has no RTC and NTP can jump it.
# Local only: nothing is sent anywhere except pings and ARP to the gateway.
set -u

run_dir=/run/slops-link-watchdog          # per boot (tmpfs)
keep_dir=/var/lib/slops-link-watchdog     # survives reboots: reboot count and the last reason
mkdir -p "$run_dir" "$keep_dir"
since="$run_dir/down-since"
up_since="$run_dir/up-since"
reconnected="$run_dir/reconnected-at"
reboots="$keep_dir/reboots"

uptime_s() { cut -d. -f1 /proc/uptime; }
number_or_empty() { local v; v=$(cat "$1" 2>/dev/null) || return 0; [[ $v =~ ^[0-9]+$ ]] && echo "$v"; }
log() { echo "$*"; logger -t slops-link-watchdog -- "$*"; }

now=$(uptime_s)
gw=$(ip -4 route show default | awk '{for (i = 1; i < NF; i++) if ($i == "via") { print $(i + 1); exit }}')
link_up() {
  [ -n "$gw" ] || return 1
  ping -c 2 -W 3 "$gw" >/dev/null 2>&1 && return 0
  arping -c 2 -w 4 -I wlan0 "$gw" >/dev/null 2>&1
}

if link_up; then
  if [ -f "$since" ]; then
    log "link recovered after $(( now - $(number_or_empty "$since" || echo "$now") ))s"
    rm -f "$since" "$reconnected"
  fi
  [ -f "$up_since" ] || echo "$now" > "$up_since"
  # Ten minutes of good link ends the outage: the next one starts the reboot backoff from scratch.
  up=$(number_or_empty "$up_since")
  if [ -n "$up" ] && [ $(( now - up )) -ge 600 ]; then rm -f "$reboots"; fi
  exit 0
fi

rm -f "$up_since"
start=$(number_or_empty "$since")
if [ -z "$start" ]; then
  echo "$now" > "$since"
  log "gateway ${gw:-none} unreachable (ICMP and ARP); watching"
  exit 0
fi
down=$(( now - start ))
count=$(number_or_empty "$reboots"); count=${count:-0}
reboot_after=$(( 1800 << count ))   # 30, 60, 120 min
last_reconnect=$(number_or_empty "$reconnected")

reconnect() {
  echo "$now" > "$reconnected"
  if nmcli device reconnect wlan0 >/dev/null 2>&1; then
    log "gateway unreachable for ${down}s; Wi-Fi reconnected"
  else
    log "gateway unreachable for ${down}s; reconnect failed, cycling the radio"
    nmcli radio wifi off; sleep 5; nmcli radio wifi on || nmcli radio wifi on
  fi
}

if [ "$count" -lt 3 ] && [ "$down" -ge "$reboot_after" ]; then
  echo $(( count + 1 )) > "$reboots"
  reason="$(date -u +%Y-%m-%dT%H:%M:%SZ) reboot $(( count + 1 ))/3: gateway ${gw:-none} unreachable for ${down}s"
  echo "$reason" >> "$keep_dir/reboot-reasons"
  log "$reason"
  systemctl reboot
elif [ "$down" -ge 600 ] && [ -z "$last_reconnect" ]; then
  reconnect
elif [ -n "$last_reconnect" ] && [ $(( now - last_reconnect )) -ge 1800 ]; then
  reconnect   # after the reboot cap (or between reboots): keep trying, gently
fi
