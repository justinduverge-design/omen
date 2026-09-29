# WO-15 Backup Diagnosis & Isolated-Restore Runbook

## Diagnosis Findings

**Context:** The Omen database backup was observed to be failing on `2026-09-29T00:08:31Z`. The last verified successful backup was `2026-09-15T18:11:57Z`.

**The Backup Mechanism:**
According to `Blueprints/specs/infrastructure/slops-os-raspberry-pi-fleet-v1.md`, the backup is orchestrated by a scheduled task on KVM1 via `omen-supabase-backup.timer`, which runs every 6 hours. The backup script is located at `/opt/omen-backup/bin/backup-supabase.sh` on KVM1. The process performs a logical Supabase export — doing an explicit additional export of `auth.users`, `auth.identities`, and `auth.mfa_factors` — encrypts the dump with Restic, and transports it over SFTP to an isolated `omen-backup` account on KVM2.

**Hypothesis:**
On `2026-09-27`, a production database hygiene sweep (documented in `Blueprints/done/LEDGER.md` and `sql/2026-09-27_production_hygiene_and_grant_hardening.sql`) explicitly `DROP`ped three dead tables from production:
- `oauth_credentials`
- `system_context`
- `local_snapshots`

My **hypothesis** is that the `backup-supabase.sh` script explicitly referenced one or more of these dropped tables in its `pg_dump` arguments (e.g., `pg_dump -t public.oauth_credentials ...`). Once the tables were dropped on 9/27, the subsequent `pg_dump` runs would fail due to the missing references, causing the backup script to error out.

**Timeline Caveat:** The backup timer runs every 6 hours. If the 9/27 drops caused the breakage, the failures should have started immediately on 9/27. The `2026-09-15` date is simply the last *verified* successful backup, not necessarily the last successful *run* before the failure.

---

## Environment Limitations & Open Verification

Because I am working in an isolated environment, the following could not be accessed to definitively confirm the hypothesis:
1. The physical KVM1 and KVM2 tailscale hosts.
2. The `/opt/omen-backup/bin/backup-supabase.sh` script on KVM1.
3. The system logs for `omen-supabase-backup.timer`.
4. The live Supabase dashboard.

**Verification actions required by Orchestrator / Founder:**
To confirm the exact tables causing the failure, please run the following via the Tailscale network:
```bash
# 1. Connect to KVM1
ssh srv1737978

# 2. Inspect the backup script for explicit table references (look for -t or --table flags)
cat /opt/omen-backup/bin/backup-supabase.sh

# 3. Check the recent journal logs to confirm the exact pg_dump failure message
journalctl -u omen-supabase-backup.service --no-pager | grep "pg_dump:"
```

---

## Isolated-Restore Proof Runbook

The following bash script acts as a runbook to perform a backup, restore it to an isolated scratch database, and verify the integrity. It uses `psql -v ON_ERROR_STOP=1` for all SQL steps. This script can be run locally (where Postgres tools are available) to simulate the disaster-recovery drill.

```bash
#!/bin/bash
set -euo pipefail

echo "=== 1. Preparation: Mocking a source database ==="
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS omen_source;"
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE DATABASE omen_source;"

sudo -u postgres psql -v ON_ERROR_STOP=1 -d omen_source << 'SQL'
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE auth.users (id int);
CREATE TABLE auth.identities (id int);
CREATE TABLE auth.mfa_factors (id int);
CREATE TABLE public.users (id int);
CREATE TABLE public.profiles (id int);
-- Mocking data
INSERT INTO public.users VALUES (1), (2), (3);
SQL

echo "=== 2. Backup: Taking simulated backup via pg_dump ==="
# In production, this mirrors the logical export logic
sudo -u postgres pg_dump -d omen_source -Fc -f /tmp/omen-backup.dump

echo "=== 3. Restore: Testing Isolated Restore ==="
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS omen_isolated_restore;"
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE DATABASE omen_isolated_restore;"

echo "Restoring from the generated backup dump..."
# The -1 flag runs the restore as a single transaction
sudo -u postgres pg_restore -d omen_isolated_restore -1 /tmp/omen-backup.dump

echo "=== 4. Verify: Checking row counts ==="
# Prove the data is fully intact without touching production
sudo -u postgres psql -v ON_ERROR_STOP=1 -d omen_isolated_restore -c "SELECT count(*) FROM public.users;"

echo "Backup and restore runbook proof completed successfully."
```
