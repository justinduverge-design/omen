#!/bin/bash
# Slops Pi link watchdog (2026-10-18). Runs every minute from slops-link-watchdog.timer.
# If the default gateway stops answering: after 10 minutes restart Wi-Fi, after 30 minutes reboot.
# Why: on 2026-10-16 Steward's Wi-Fi roamed between eero nodes, the handshake timed out and the link
# stayed half-up for ~37 h with no recovery. Local-only: no network calls beyond pinging the gateway.
set -u
state=/run/slops-link-watchdog.since
gw=$(ip -4 route show default | awk '{print $3; exit}')
if [ -n "$gw" ] && ping -c 2 -W 3 "$gw" >/dev/null 2>&1; then
  if [ -f "$state" ]; then echo "link recovered after $(( $(date +%s) - $(cat "$state") ))s"; rm -f "$state" /run/slops-link-watchdog.wifi-restarted; fi
  exit 0
fi
now=$(date +%s)
[ -f "$state" ] || { echo "$now" > "$state"; echo "gateway ${gw:-none} unreachable; watching"; exit 0; }
down=$(( now - $(cat "$state") ))
if [ "$down" -ge 1800 ]; then
  echo "gateway unreachable for ${down}s; rebooting"
  systemctl reboot
elif [ "$down" -ge 600 ] && [ ! -f /run/slops-link-watchdog.wifi-restarted ]; then
  echo "gateway unreachable for ${down}s; restarting Wi-Fi"
  touch /run/slops-link-watchdog.wifi-restarted
  nmcli radio wifi off; sleep 5; nmcli radio wifi on
fi
