# WO-15 — KVM1 Supabase backup repair (2026-09-29)

**Status:** repaired and verified. Supabase backup healthy; scratch restore matched source.
**Scope touched:** KVM1 backup scripts only. No app code, no schema change, no Supabase dashboard
change, no production writes, no Restic/SFTP credential change. KVM2 was read-only.

## Correction to the earlier diagnosis

The original hypothesis in this PR — `pg_dump` failing on tables dropped 2026-09-27
(`oauth_credentials`, `system_context`, `local_snapshots`) — was **wrong**. The script has no
`-t`/`--table` references to those tables. It dumps `--schema=public` plus three named `auth` tables.

There were two independent failures, stacked:

1. **Hostname guard.** `/opt/omen-backup/bin/backup-supabase.sh` hard-coded
   `EXPECTED_HOST="srv1737978"` and exits `Wrong host: omen-prod` when `hostname` differs. Both VPSes
   were renamed; every timer run exited at the guard (~80 ms, before any `pg_dump`). Last healthy
   backup was 2026-09-15T18:11:57Z.
2. **Auth enum guard.** Once (1) was fixed, the run failed at `auth_enum_guard`:
   `Auth enum structure changed; recovery format review required`. Supabase added `recovery_code` to
   `auth.factor_type` (now `totp,webauthn,phone,recovery_code`). This guard is deliberate and
   fail-closed, because `auth-types.sql` recreates the enum on restore.

## Changes made on KVM1 (originals kept as `.bak-*` beside each file)

| File | Change |
|---|---|
| `/opt/omen-backup/bin/backup-supabase.sh` | `EXPECTED_HOST="omen-prod"`; `recovery_code` added to `EXPECTED_ENUM_STATE` and to the generated `auth-types.sql`; `RECOVERY_FORMAT` 1 → 2; Restic tag `recovery-format-v1` → `recovery-format-v2` |
| `/usr/local/sbin/omen-football-backup` | `EXPECTED_HOST=omen-prod` |
| `/usr/local/sbin/omen-football-restore` | `EXPECTED_HOST=omen-prod` |

Backups: `backup-supabase.sh.bak-20260929` (hostname only), `.bak-20260929-enum` (before enum change),
`omen-football-backup.bak-20260929`, `omen-football-restore.bak-20260929`.

## Verification

- Supabase backup: `AUTOMATIC_OMEN_BACKUP=PASS`, snapshot
  `faf57c31227945f3e1cadcff9bdfd3ce22deb19bcce8c6618201d5a4da4f7845`, format 2, 15 public tables.
- Football backup: completed, snapshot `b2694f3ae77ae33a2720484d6639291b75b959fcff9301689fff2cdea7ec0b1c`.
  `omen-football-restore` guard fixed but **not run**.
- Isolated restore of the Supabase snapshot into a throwaway `postgres:17` container
  (`--network none`, no published ports): all 9 `SHA256SUMS` entries verified; 15 public base tables;
  every public table row count and the auth counts (8 users, 9 identities, 0 MFA factors) matched
  `source-table-counts.txt` / `source-counts.txt`; 12 RLS policies and 11 FKs restored; enum includes
  `recovery_code`. Scratch container and restored files deleted afterward.
- No systemd units failed at close.

## Restore-drill procedure (what actually worked)

```bash
# On KVM1, as omen-backup-client (HOME=/var/lib/omen-backup-client):
restic restore <snapshot> --target <scratch-dir>      # then: sha256sum -c SHA256SUMS
docker run -d --name omen-restore-scratch --network none \
  -e POSTGRES_PASSWORD=<throwaway> -v <export-current>:/export:ro postgres:17
```

Inside the scratch instance, with `psql -v ON_ERROR_STOP=1` and `pg_restore --exit-on-error
--no-owner --no-privileges`, in this order:

1. Create roles `anon`, `authenticated`, `service_role` (cluster-global, create once).
2. In the target DB: `DROP SCHEMA public;` (the dump creates it) and `CREATE SCHEMA auth;`.
3. Apply `auth-types.sql`, then restore `auth-core-schema.dump`.
4. Create a stub `auth.uid()` — Supabase provides it; plain Postgres does not, and an RLS policy in
   `public.dump` calls it. Stub reads `request.jwt.claim.sub` / `request.jwt.claims ->> 'sub'`.
5. Restore `auth-users`, `auth-identities`, `auth-mfa-factors` with `--data-only`, then `public.dump`.
6. Compare per-table counts against `source-table-counts.txt` and `source-counts.txt`.

## Open items

- The enum guard will trip again whenever Supabase changes those enums. Consider alerting on
  `omen-supabase-backup.service` failure — this pipeline was silently failing for ~2 weeks.
- Auth users went 12 → 8 between the 2026-09-15 backup and now; looks like test-account cleanup,
  not verified.
- Postfix (`/etc/postfix/main.cf`, `/etc/mailname`) still names `srv1737978.hstgr.cloud` (Hostinger's
  public FQDN). Postfix is disabled/inactive; left alone.
- The backup covers `public` and three `auth` tables only; other auth tables and storage are not in it.
