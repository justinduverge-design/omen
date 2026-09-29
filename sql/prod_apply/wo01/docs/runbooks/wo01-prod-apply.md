# WO-01 Production Apply Runbook

**Executing Agent:** Claude Code

## Prerequisites
- A fresh backup of the production database has been verified.
- The execution is within an approved maintenance window.
- Approvals for the execution have been obtained.
- Do NOT touch live production Supabase manually. All automated commands should be executed strictly following this runbook.

## Step 1: Preflight Checks
**Command:**
```bash
psql "$DATABASE_URL" -f sql/prod_apply/wo01/00_preflight.sql
```
**Expected Output:**
- A list of the tables (`waitlist_signups`, `platform_connections`, `oauth_state`, and the seven `league_office_*` tables) along with their rowsecurity status.
- A list of existing policies on these tables (many of these should currently have 0 policies).
- A count of rows for each table.

## Step 2: Apply Migrations
**Command:**
```bash
psql "$DATABASE_URL" -f sql/prod_apply/wo01/01_apply.sql
```
**Expected Output:**
- `CREATE POLICY` and `GRANT` statements executing successfully without errors.
- Note: This script is idempotent, so running it multiple times is safe.

## Step 3: Verification
**Command:**
```bash
psql "$DATABASE_URL" -f sql/prod_apply/wo01/02_verify.sql
```
**Expected Output:**
- `NOTICE:  All expected policy counts match.`
- The script should complete without any exceptions.

## Rollback Conditions
If **any** verification step fails (e.g., mismatch in policy counts, or the anon user is able to read from `waitlist_signups`), or if there are unexpected errors during application:
1. **Run Rollback:**
   ```bash
   psql "$DATABASE_URL" -f sql/prod_apply/wo01/03_rollback.sql
   ```
2. **Re-run Preflight:**
   ```bash
   psql "$DATABASE_URL" -f sql/prod_apply/wo01/00_preflight.sql
   ```
3. **Stop and Report:**
   Halt further execution and report the failure, including the full error log, to the team.
