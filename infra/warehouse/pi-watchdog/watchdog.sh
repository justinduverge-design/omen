#!/usr/bin/env bash
set -euo pipefail

# Pi Watchdog: Warehouse Backup Freshness Check
# Runs via cron on the Pi. Checks if KVM1's backup and restore test are fresh.
# Alerts Discord (#nosey) if stale or missing.

# Configuration
KVM1_TAILSCALE_IP="100.115.155.19" # From docs: KVM1 Tailscale IP
KVM1_USER="steward-status" # Standard read-only status user from Slops OS docs
BACKUP_DIR="/var/backups/warehouse"
MAX_AGE_SECONDS=$((26 * 3600)) # 26 hours (allows for 24h cycle + 2h jitter/execution time)

NOW=$(date +%s)

# Send alert to Discord
alert_discord() {
    local message="$1"
    local status="${2:-CRITICAL}"
    # JSON encoding for Discord to prevent newlines breaking the payload
    PAYLOAD=$(jq -n --arg content "[$status] Pi Watchdog (Warehouse): $message" '{"content": $content}')

    if [ -n "${DISCORD_WEBHOOK_URL:-}" ]; then
        curl -s -H "Content-Type: application/json" -X POST -d "$PAYLOAD" "$DISCORD_WEBHOOK_URL" > /dev/null
    else
        echo "Warning: DISCORD_WEBHOOK_URL not set. Cannot send alert: $message"
    fi
}

echo "Checking KVM1 Warehouse backup freshness at $KVM1_TAILSCALE_IP..."

# We use ssh with StrictHostKeyChecking to prevent prompt hangs in cron
# We execute a simple read of the timestamp files
BACKUP_TS=$(ssh -q -o StrictHostKeyChecking=accept-new "${KVM1_USER}@${KVM1_TAILSCALE_IP}" "cat ${BACKUP_DIR}/latest_success.timestamp 2>/dev/null" || echo "")
RESTORE_TS=$(ssh -q -o StrictHostKeyChecking=accept-new "${KVM1_USER}@${KVM1_TAILSCALE_IP}" "cat ${BACKUP_DIR}/latest_restore_test.timestamp 2>/dev/null" || echo "")

if [ -z "$BACKUP_TS" ]; then
    alert_discord "Could not read latest_success.timestamp on KVM1. Backup may have never run or is failing."
    exit 1
fi

if [ -z "$RESTORE_TS" ]; then
    alert_discord "Could not read latest_restore_test.timestamp on KVM1. Restore test may have never run or is failing."
    exit 1
fi

BACKUP_AGE=$((NOW - BACKUP_TS))
RESTORE_AGE=$((NOW - RESTORE_TS))

if [ "$BACKUP_AGE" -gt "$MAX_AGE_SECONDS" ]; then
    alert_discord "Warehouse backup is STALE. Age: $((BACKUP_AGE / 3600)) hours."
    exit 1
fi

if [ "$RESTORE_AGE" -gt "$MAX_AGE_SECONDS" ]; then
    alert_discord "Warehouse restore test is STALE. Age: $((RESTORE_AGE / 3600)) hours."
    exit 1
fi

echo "Warehouse backups are fresh (Age: $((BACKUP_AGE / 3600))h, Restore: $((RESTORE_AGE / 3600))h)."
# Normal execution exits silently to not spam cron output, unless we want a health heartbeat (handled by Layer 5 dispatcher in reality).
