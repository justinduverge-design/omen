# Omen football warehouse deployment runbook

**Status:** local foundation only; production execution requires a separate approved change window.
**Boundary:** rebuildable nflverse football facts only. No user, league, credential, Ledger, or saved-trade data.

## Stop conditions

Stop without changing the host when any preflight, migration, data, resource, backup, restore, or
observability check differs from its recorded expectation. Do not delete a volume or credential as a
rollback. Do not switch reads, stop the Supabase Step-14 writer, or drop Step 14 in this procedure.

## Read-only preflight

Record, without printing secrets:

- current omen-prod/KVM2 identity, Tailscale reachability, disk, memory, load, Docker version and networks;
- current API/cron containers and the 04:45/05:00/06:00/06:30 ET job ordering;
- KVM2 Restic repository health and the existing user-plane backup window;
- Command Center Kuma, Beszel and GlitchTip reachability;
- Steward/Sentinel forced-command status channels and pinned SSH host keys;
- absence of a public PostgreSQL listener on omen-prod.

Historical IPs and capacity estimates in repository documents are hints, not executable values.
Resolve and verify live targets immediately before an approved deployment.

## Local schema rehearsal

Run the disposable PostgreSQL 17 proof from the repository root:

```bash
warehouse/test/run-schema-test.sh
node --test test/warehouseInfrastructureSafety.test.js test/footballWarehouseUsageRepository.test.js
```

The schema proof must print `VERIFIED football warehouse schema`. It creates an ephemeral local
cluster when the required PostgreSQL tools are installed and removes only that test directory.

## Credential and container creation

During the approved omen-prod change window:

1. Run `sudo infra/warehouse/provision-credentials.sh`. It creates the bootstrap secret at the
   Compose-declared machine-local path with `root:root` ownership and `0600` permissions. Never open,
   print, copy into chat, or append it to an environment file.
2. Confirm the external `omen_network` already exists. The Compose project creates a separate
   `internal: true` warehouse network and must not publish a host port.
3. Start PostgreSQL without attaching the API or cron writer.
4. Verify the health check and actual runtime controls. Inspect Docker `HostConfig.Memory` (2 GiB),
   NanoCPUs/CPU quota, PID limit, log rotation, network attachments, mounts and secrets. A Compose file
   declaration alone is not proof; cgroup or Docker inspection must show enforcement.
5. Verify host and public-tailnet listeners again. Port 5432 must have no published or host port.
6. Verify the migration checksum ledger and catalog using `warehouse/test/verify_schema.sql`.

## Bounded data proof

The current `backfill.sh` is retained upstream preparation and is **not authorized for execution**.
It must be replaced by the transactional warehouse writer before data is loaded. The writer must:

- use verified per-season nflverse release assets;
- hash exact raw bytes and create `sha256:<64 lowercase hex>` receipts;
- validate required columns before writes;
- stage and commit one dataset/season atomically;
- skip unmatched players without guessing and enforce a recorded threshold;
- support safe rerun and receipt-based resume;
- retain the complete admitted play row plus typed access fields.

First load the current season for the Tuesday shadow proof. Verify counts, uniqueness, receipts, one known player-week,
one game, one team-week, one roster membership and one full play row before historical backfill.

## Backup and restore gate

The current `backup/backup.sh` and `pi-watchdog/watchdog.sh` are **not authorized for execution**.
They must be replaced with the established encrypted Restic/SFTP, pinned-host-key, forced-command
status-export and dispatcher patterns. A passing gate requires:

- a warehouse-tagged encrypted snapshot on KVM2;
- a manifest with PostgreSQL/migration versions, receipt high-water marks, counts, bytes and SHA-256;
- an isolated networkless PostgreSQL 17 restore on KVM2;
- schema, count, receipt-chain and representative-query verification;
- an independent Steward freshness result and Command Center alert/recovery exercise.

## Safe rollback

Before read cutover, rollback means stop new warehouse work, preserve the container volume and evidence,
and keep the API and daily job on their current Supabase/CSV path. `docker compose stop postgres` is
recoverable; volume deletion is not a normal rollback. Any later destructive cleanup requires its own
explicit target resolution, backup proof and approval.

After read cutover, return `FOOTBALL_DATA_MODE` to the previously proven mode, redeploy the API, verify
Start/Sit output and preserve the warehouse for diagnosis. Step 14 remains intact throughout the
observation window.

## Promotion sequence

1. Local schema and repository proof.
2. Approved omen-prod container creation with runtime-limit and no-public-port proof.
3. One current-season transactional ingest and real shadow-read proof while Supabase continues serving Tuesday.
4. Encrypted KVM2 backup and isolated restore proof.
5. Independent Kuma, Beszel, GlitchTip, Steward and Sentinel evidence.
6. Founder-approved warehouse-primary mode change immediately after all required proofs pass; Supabase remains rollback.
7. Historical 1999–2026 backfill in chronological order, beginning with 1999 after the current-season proof.
8. Retention proposal based on measured KVM2 usable capacity and measured compressed backup size, never a guessed fixed count.
9. Separate rehearsal and approval before any Supabase Step-14 retirement.
