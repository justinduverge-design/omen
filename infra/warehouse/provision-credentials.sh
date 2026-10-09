#!/usr/bin/env bash
set -euo pipefail

# Generates only the machine-local PostgreSQL bootstrap secret. It never writes an API environment,
# prints a credential, or rotates an existing secret. Login roles receive separate secrets later.

umask 077
SECRET_DIR="/var/lib/omen/secrets"
SECRET_FILE="$SECRET_DIR/warehouse-postgres-password"

if [ "$(id -u)" -ne 0 ]; then
  echo "Error: run as root so the warehouse secret remains root-owned." >&2
  exit 1
fi

if [ -e "$SECRET_FILE" ]; then
  echo "Error: warehouse bootstrap secret already exists; refusing to overwrite." >&2
  exit 1
fi

install -d -m 0700 -o root -g root "$SECRET_DIR"
openssl rand -base64 48 > "$SECRET_FILE"
chown root:root "$SECRET_FILE"
chmod 600 "$SECRET_FILE"
echo "Warehouse bootstrap secret created with root:root ownership and 600 permissions."
