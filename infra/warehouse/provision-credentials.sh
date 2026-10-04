#!/usr/bin/env bash
set -euo pipefail

# Provision Credentials for Omen Football Warehouse
# Runs on KVM1 at deploy time.
# Generates the Postgres password and writes it to .env.
# Refuses to run if .env already exists to prevent accidental overwrites.

ENV_FILE=".env"
API_ENV_FILE="../../.env" # Assuming the API env file is at the repo root relative to infra/warehouse

if [ -f "$ENV_FILE" ]; then
  echo "Error: $ENV_FILE already exists. Refusing to overwrite."
  echo "If you need to rotate credentials, remove $ENV_FILE manually first."
  exit 1
fi

echo "Generating secure Postgres password..."
# Generate a 32-character random string (base64 encoded, then stripped of non-alphanumeric chars for safety)
DB_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)

echo "Writing credentials to $ENV_FILE..."
cat <<EOF > "$ENV_FILE"
POSTGRES_USER=postgres
POSTGRES_PASSWORD=${DB_PASSWORD}
POSTGRES_DB=postgres
EOF

# Strict permissions (600) so the secret never appears in logs, chat, or the repo
chmod 600 "$ENV_FILE"

echo "Credentials provisioned successfully in $ENV_FILE with 600 permissions."

# Also append to the API .env file if it exists, so the API can connect
# In real life, the path to the API .env file would need to be passed or known
if [ -f "$API_ENV_FILE" ]; then
    echo "Appending connection string to $API_ENV_FILE..."
    # We append to avoid overwriting existing API configs
    echo "" >> "$API_ENV_FILE"
    echo "# Added by infra/warehouse/provision-credentials.sh" >> "$API_ENV_FILE"
    echo "WAREHOUSE_DB_URL=postgresql://postgres:${DB_PASSWORD}@omen_football_warehouse:5432/postgres" >> "$API_ENV_FILE"
    echo "Appended WAREHOUSE_DB_URL to $API_ENV_FILE."
else
    echo "Warning: API .env file not found at $API_ENV_FILE. You will need to add WAREHOUSE_DB_URL manually to the API configuration."
fi

echo "Done."
