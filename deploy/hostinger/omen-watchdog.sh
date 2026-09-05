#!/bin/sh
# Omen container watchdog for Hostinger KVM1.
#
# WHY THIS EXISTS
# ---------------
# `restart: unless-stopped` restarts a container that EXITS. It does nothing at
# all for a container that is still running but wedged - a blocked event loop, a
# spinning synchronous path, a deadlocked pool. Docker's own healthcheck detects
# exactly that case and then... records it. Nothing acts on it.
#
# On 2026-09-05 `omen_api` sat at 99.31% CPU with a fully blocked event loop.
# Docker marked it unhealthy every 30 seconds for hours. Every alerting layer
# fired correctly - Kuma, GlitchTip, Discord. The site stayed down anyway,
# because detection without a remediator is just a more detailed outage.
#
# WHY NOT `willfarrell/autoheal`
# ------------------------------
# The standard answer mounts /var/run/docker.sock into a container, which is
# root-equivalent on the host. This box already runs a deliberately read-only
# Docker proxy for beszel (POST=0, ALLOW_RESTARTS=0) - that posture should not be
# undone to gain a restart loop. systemd already runs as root, already supervises
# Docker, and needs no new socket exposure.
#
# WHAT IT DOES NOT DO
# -------------------
# This restores availability. It does not fix the fault, and a container that
# needs restarting repeatedly is a bug report, not a solved problem - which is
# why repeated heals escalate to Discord rather than staying quiet.
set -eu

CONTAINER="${OMEN_WATCHDOG_CONTAINER:-omen_api}"
STATE_DIR=/var/lib/omen-watchdog
# Keyed by container. A shared counter would let one container - a self-test, or
# a second service added later - silently spend another's heal budget, so the
# real outage would hit an already-exhausted brake and never be healed at all.
# Found by this script's own self-test doing exactly that, 2026-09-05.
STATE="$STATE_DIR/heals-$(printf '%s' "$CONTAINER" | tr -c 'A-Za-z0-9_.-' '_')"
WEBHOOK=/etc/slops-alerting/discord-webhook-url

# A restart is disruptive, so require the fault to persist rather than firing on
# one unlucky probe. Docker's own healthcheck already needs 3 consecutive
# failures at a 30s interval; this adds a second, independent confirmation.
GRACE_SECONDS="${OMEN_WATCHDOG_GRACE:-45}"

# Heals inside this window before the watchdog stops trying and escalates
# instead. Restarting forever hides a crash loop and can be worse than being
# honestly down: it turns a loud failure into a silent, flapping one.
MAX_HEALS="${OMEN_WATCHDOG_MAX_HEALS:-3}"
HEAL_WINDOW_SECONDS="${OMEN_WATCHDOG_WINDOW:-3600}"

mkdir -p "$STATE_DIR"

log() { echo "omen-watchdog: $*"; }

notify() {
    [ -r "$WEBHOOK" ] || return 0
    printf '%s' "$1" \
        | python3 -c 'import json,sys; sys.stdout.write(json.dumps({"content": sys.stdin.read()}))' \
        | curl -fsS --max-time 15 -H 'Content-Type: application/json' \
               --data-binary @- "$(cat "$WEBHOOK")" >/dev/null 2>&1 || true
}

health_of() {
    docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' \
        "$CONTAINER" 2>/dev/null || echo missing
}

status="$(health_of)"

# `none` means the container defines no healthcheck; `missing` means it is not
# there at all. Neither is this script's problem to solve, and restarting on
# either would fight whoever is legitimately deploying.
case "$status" in
    healthy|starting|none|missing) exit 0 ;;
esac

log "$CONTAINER reports '$status'; confirming in ${GRACE_SECONDS}s"
sleep "$GRACE_SECONDS"

status="$(health_of)"
if [ "$status" != unhealthy ]; then
    log "$CONTAINER recovered on its own ('$status'); no action taken"
    exit 0
fi

# Prune heals outside the window, then decide. Keeping the timestamps rather
# than a bare counter is what makes "3 heals in an hour" different from "3 heals
# since the box was built".
now="$(date +%s)"
recent=""
if [ -f "$STATE" ]; then
    while IFS= read -r ts; do
        [ -n "$ts" ] || continue
        [ "$((now - ts))" -lt "$HEAL_WINDOW_SECONDS" ] && recent="$recent$ts
"
    done < "$STATE"
fi

count="$(printf '%s' "$recent" | grep -c . || true)"

if [ "$count" -ge "$MAX_HEALS" ]; then
    log "$CONTAINER unhealthy but already healed $count times in ${HEAL_WINDOW_SECONDS}s; escalating instead"
    notify "SLOPS WATCHDOG: $CONTAINER is unhealthy and has ALREADY been restarted $count times in the last $((HEAL_WINDOW_SECONDS / 60)) minutes. Automatic healing is now PAUSED so the crash loop stays visible. This needs a human."
    exit 1
fi

# Capture evidence BEFORE restarting. A restart destroys the only state that can
# explain the wedge, and "we fixed it and learned nothing" is how the same
# outage happens next week. Diagnosis first, remediation second.
EVIDENCE="$STATE_DIR/evidence-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$EVIDENCE"
{
    date -u
    echo "--- container health ---"
    docker inspect --format '{{json .State.Health}}' "$CONTAINER" 2>&1
    echo "--- host ---"
    uptime; free -m; df -h /
} > "$EVIDENCE/host.txt" 2>&1
timeout 20 docker stats --no-stream "$CONTAINER" > "$EVIDENCE/stats.txt" 2>&1 || true
docker logs --tail 400 --timestamps "$CONTAINER" > "$EVIDENCE/logs.txt" 2>&1 || true

log "restarting $CONTAINER (heal $((count + 1)) of $MAX_HEALS in window); evidence in $EVIDENCE"
docker restart "$CONTAINER" >/dev/null

printf '%s%s\n' "$recent" "$now" > "$STATE"

sleep 20
after="$(health_of)"
if [ "$after" = healthy ] || [ "$after" = starting ]; then
    notify "SLOPS WATCHDOG: $CONTAINER was unhealthy and has been restarted automatically. It is now '$after'. This RESTORED SERVICE but did not fix a cause - evidence saved on KVM1 at $EVIDENCE. Heal $((count + 1)) of $MAX_HEALS in the last $((HEAL_WINDOW_SECONDS / 60)) minutes."
else
    notify "SLOPS WATCHDOG: $CONTAINER was unhealthy, was restarted automatically, and is STILL '$after'. Restarting did not help. Evidence on KVM1 at $EVIDENCE. This needs a human."
    exit 1
fi
