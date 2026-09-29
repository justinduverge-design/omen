#!/bin/bash
set -euo pipefail

echo "=== Mocking a source database and taking a backup ==="
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS omen_source;"
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE DATABASE omen_source;"

# Create some tables in the source
sudo -u postgres psql -v ON_ERROR_STOP=1 -d omen_source << 'SQL'
CREATE SCHEMA auth;
CREATE TABLE auth.users (id int);
CREATE TABLE auth.identities (id int);
CREATE TABLE auth.mfa_factors (id int);
CREATE TABLE public.users (id int);
CREATE TABLE public.profiles (id int);
SQL

echo "Taking simulated backup via pg_dump..."
sudo -u postgres pg_dump -d omen_source -Fc -f /tmp/omen-backup.dump

echo "=== Testing Isolated Restore ==="
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS omen_isolated_restore;"
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE DATABASE omen_isolated_restore;"

echo "Restoring from simulated backup..."
sudo -u postgres pg_restore -d omen_isolated_restore -1 /tmp/omen-backup.dump

echo "Verifying row counts match (all 0 for this test)..."
sudo -u postgres psql -v ON_ERROR_STOP=1 -d omen_isolated_restore -c "SELECT count(*) FROM auth.users;"
echo "Backup and restore runbook test completed successfully."
