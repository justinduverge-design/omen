# Omen Football Warehouse - Production Runbook

This runbook documents the bounded execution order for deploying the standalone Postgres 17 Football Warehouse on KVM1, migrating football data off the main Supabase instance.

**Important Context:** The warehouse holds ONLY CC BY 4.0 nflverse data (1999-2026). It NEVER holds user data. It is completely rebuildable.

## Pre-flight Checks (Read-only)

Run these checks on KVM1 before starting deployment. Expect failure if thresholds are not met.

1. **KVM1 Disk Space:**
   ```bash
   df -h /
   ```
   *Expectation:* ~83 GB free.

2. **KVM1 RAM:**
   ```bash
   free -m
   ```
   *Expectation:* ~7 GB (7000 MB) free.

3. **KVM2 Disk Space:**
   ```bash
   ssh omen-backup@100.67.187.57 df -h /
   ```
   *Expectation:* ~77 GB free.

4. **Tailscale Reachability (KVM1 -> KVM2):**
   ```bash
   ping -c 3 100.67.187.57
   ```
   *Expectation:* 0% packet loss.

## Deployment Steps

1. **Clone/Pull Latest Code:**
   Ensure `infra/warehouse/` is up to date on KVM1.

2. **Provision Credentials:**
   ```bash
   cd infra/warehouse
   ./provision-credentials.sh
   ```
   *Check:* Verify `.env` exists with `600` permissions and contains `POSTGRES_PASSWORD`.

3. **Bring Up the Warehouse:**
   ```bash
   docker-compose up -d
   ```
   *Check:* `docker ps` shows `omen_football_warehouse` running and healthy.

4. **Execute Backfill:**
   ```bash
   ./backfill.sh
   ```
   *Check:* Script completes without errors. (Note: this will take time).

## Verification Queries

Run these against the running container to ensure data is present and valid.

```bash
docker exec -i omen_football_warehouse psql -U postgres -d postgres <<EOF
\x
-- 1. Check table sizes
SELECT relname as table_name, n_live_tup as rows
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;

-- 2. Verify recent data exists (e.g., 2023 season)
SELECT COUNT(*) FROM games WHERE season = 2023;

-- 3. Check specific team exists
SELECT * FROM teams WHERE team_abbr = 'KC';
EOF
```

## Rollback Procedure

If the verification fails or an issue is detected *before* cutover, the fallback is to remain on the Supabase Step-14 cache.

1. **Tear down the container and volume:**
   ```bash
   cd infra/warehouse
   docker-compose down -v
   ```
   *(This destroys the container and the `warehouse_data` volume).*

2. **Remove the provisioned credentials:**
   ```bash
   rm .env
   ```
   *(Also remove the appended `WAREHOUSE_DB_URL` from the main API `.env` if it was added).*

## Cutover Sequence

Once verified, the switch is made at the application level.

1. **Update API Configuration:**
   Ensure `WAREHOUSE_DB_URL` is exported in the API's environment (`.env`).

2. **Switch the Daily Job (5 AM ET):**
   Update the cron job/API route that syncs football data to write to the Warehouse connection instead of Supabase.

3. **Switch API Reads:**
   Deploy the API update that routes all football-data reads (`/api/optimizer/*`, etc.) to the `WAREHOUSE_DB_URL`.

4. **Verify Live Application:**
   Check the Beta UI to ensure football data loads correctly.

5. **Decommission Supabase Cache:**
   *ONLY AFTER successful cutover.* Drop the Step-14 football cache tables from Supabase.

---

## Local Scratch Rehearsal (Performed locally before PR)

This rehearsal verifies the Docker compose setup, the backfill script (using mock data), and the schema.

1. **Start the container:**
   ```bash
   cd infra/warehouse
   # Create a dummy .env for testing
   echo "POSTGRES_PASSWORD=test" > .env
   docker-compose up -d
   ```

2. **Load mock data:**
   ```bash
   ./backfill.sh true
   ```

3. **Tear down:**
   ```bash
   docker-compose down -v
   ```

4. **Restart and verify schema:**
   ```bash
   docker-compose up -d
   sleep 5
   # Schema will be automatically created via the init/ script
   docker exec -i omen_football_warehouse psql -U postgres -d postgres -c "\dt"
   docker exec -i omen_football_warehouse psql -U postgres -d postgres -c "\d players"
   ```

5. **Clean up:**
   ```bash
   docker-compose down -v
   rm .env
   ```
