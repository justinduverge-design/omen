#!/usr/bin/env bash
set -euo pipefail

# Omen Football Warehouse - Nightly Backup & Restore Test
# Runs on KVM1, targets KVM2 over Tailscale.

PG_USER="postgres"
CONTAINER_NAME="omen_football_warehouse"
DB_NAME="postgres"
BACKUP_DIR="/var/backups/warehouse"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/warehouse_${DATE}.sql.gz"
KVM2_TAILSCALE_IP="100.67.187.57" # From docs: KVM2 Tailscale IP
KVM2_USER="omen-backup"
KVM2_PATH="/srv/restic/omen/warehouse"

# Ensure backup dir exists locally
mkdir -p "$BACKUP_DIR"

# Send alert to Discord
alert_discord() {
    local message="$1"
    local status="${2:-CRITICAL}"
    # O9 pattern: build payload with JSON encoder to avoid newline breaking
    PAYLOAD=$(jq -n --arg content "[$status] Warehouse Backup Alert: $message" '{"content": $content}')

    if [ -n "${DISCORD_WEBHOOK_URL:-}" ]; then
        curl -s -H "Content-Type: application/json" -X POST -d "$PAYLOAD" "$DISCORD_WEBHOOK_URL" > /dev/null
    else
        echo "Warning: DISCORD_WEBHOOK_URL not set. Cannot send alert: $message"
    fi
}

echo "Starting backup at $DATE..."

# 1. pg_dump
if ! docker exec "$CONTAINER_NAME" pg_dump -U "$PG_USER" -d "$DB_NAME" | gzip > "$BACKUP_FILE"; then
    alert_discord "pg_dump failed."
    exit 1
fi
echo "Backup created at $BACKUP_FILE"

# 2. Copy to KVM2 over Tailscale
# Requires SSH keys to be set up between KVM1 and KVM2 (omen-backup user)
echo "Transferring to KVM2 ($KVM2_TAILSCALE_IP)..."
if ! scp -q "$BACKUP_FILE" "${KVM2_USER}@${KVM2_TAILSCALE_IP}:${KVM2_PATH}/"; then
    alert_discord "scp to KVM2 failed."
    exit 1
fi

# 3. Local Retention Policy (14 daily + 4 weekly)
echo "Applying retention policy on KVM1..."
# Keep last 14 days
find "$BACKUP_DIR" -name "warehouse_*.sql.gz" -mtime +14 -mtime -43 | while read -r file; do
    # Extract date from filename (warehouse_YYYYMMDD_HHMMSS.sql.gz)
    FILEDATE=$(basename "$file" | cut -d'_' -f2)
    # Check if it was a Monday
    if [ "$(date -d "$FILEDATE" +%u)" != "1" ]; then
        rm "$file"
    fi
done
# Delete anything older than 42 days entirely
find "$BACKUP_DIR" -name "warehouse_*.sql.gz" -mtime +42 -exec rm {} \;


# 4. Automated Restore Test
echo "Starting automated restore test..."
TEST_CONTAINER="omen_warehouse_restore_test"
RESTORE_NETWORK="none" # Ensure isolated

docker run -d --name "$TEST_CONTAINER" --network "$RESTORE_NETWORK" \
    -e POSTGRES_PASSWORD=test -e POSTGRES_USER=postgres -e POSTGRES_DB=postgres postgres:17

# Wait for postgres to be ready
sleep 10

# Load backup into test container
echo "Loading backup into test container..."
gunzip -c "$BACKUP_FILE" | docker exec -i "$TEST_CONTAINER" psql -v ON_ERROR_STOP=1 -U postgres -d postgres > /dev/null 2>&1

# Verify table list and row counts
echo "Verifying row counts..."
SOURCE_TEAMS=$(docker exec -i "$CONTAINER_NAME" psql -tA -U "$PG_USER" -d "$DB_NAME" -c "SELECT COUNT(*) FROM teams;")
TEST_TEAMS=$(docker exec -i "$TEST_CONTAINER" psql -tA -U postgres -d postgres -c "SELECT COUNT(*) FROM teams;")

SOURCE_PLAYERS=$(docker exec -i "$CONTAINER_NAME" psql -tA -U "$PG_USER" -d "$DB_NAME" -c "SELECT COUNT(*) FROM players;")
TEST_PLAYERS=$(docker exec -i "$TEST_CONTAINER" psql -tA -U postgres -d postgres -c "SELECT COUNT(*) FROM players;")

SOURCE_GAMES=$(docker exec -i "$CONTAINER_NAME" psql -tA -U "$PG_USER" -d "$DB_NAME" -c "SELECT COUNT(*) FROM games;")
TEST_GAMES=$(docker exec -i "$TEST_CONTAINER" psql -tA -U postgres -d postgres -c "SELECT COUNT(*) FROM games;")

if [ "$SOURCE_TEAMS" != "$TEST_TEAMS" ] || [ "$SOURCE_PLAYERS" != "$TEST_PLAYERS" ] || [ "$SOURCE_GAMES" != "$TEST_GAMES" ]; then
    alert_discord "Restore test failed: Row count mismatch (Teams: $SOURCE_TEAMS vs $TEST_TEAMS, Players: $SOURCE_PLAYERS vs $TEST_PLAYERS, Games: $SOURCE_GAMES vs $TEST_GAMES)."
    docker rm -f "$TEST_CONTAINER"
    exit 1
fi

echo "Verifying checksums..."
# Generate checksum of all tables schema and data
SOURCE_CHECKSUM=$(docker exec -i "$CONTAINER_NAME" pg_dump -U "$PG_USER" -d "$DB_NAME" | md5sum | awk '{print $1}')
TEST_CHECKSUM=$(docker exec -i "$TEST_CONTAINER" pg_dump -U postgres -d postgres | md5sum | awk '{print $1}')

if [ "$SOURCE_CHECKSUM" != "$TEST_CHECKSUM" ]; then
    alert_discord "Restore test failed: Checksum mismatch ($SOURCE_CHECKSUM vs $TEST_CHECKSUM)."
    docker rm -f "$TEST_CONTAINER"
    exit 1
fi

echo "Restore test passed. Cleaning up..."
docker rm -f "$TEST_CONTAINER"

# Log success timestamp for Pi Watchdog
date +%s > "$BACKUP_DIR/latest_success.timestamp"
date +%s > "$BACKUP_DIR/latest_restore_test.timestamp"

echo "Backup process completed successfully."
