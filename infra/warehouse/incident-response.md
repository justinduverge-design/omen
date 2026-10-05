# Runbook: Omen football warehouse incident response

**Owner:** Justin | **Frequency:** As needed  
**Last updated:** 2026-10-05 | **Last run:** Never — repository contract only

## Purpose

Restore public, rebuildable football facts without involving Supabase user data. Omen continues to use
Supabase as the rollback source until Step 14 is separately retired. These scenarios are intentionally
separate: a full disk must not be treated like a dead host, and data corruption must not be treated like
a transient worker failure.

## Prerequisites

- [ ] Resolve `omen-prod` and KVM2 through the current approved SSH/Tailscale configuration; never use historical IPs.
- [ ] Confirm the incident does not involve Supabase user, credential, Ledger, league, or saved-trade data.
- [ ] Record the running image digest, warehouse status artifact, latest backup manifest, and last successful restore proof.
- [ ] Keep Step 14/Supabase serving or return `FOOTBALL_DATA_MODE` to the last proven Supabase mode.
- [ ] Obtain approval before any destructive volume, snapshot, or host action.

## Universal containment

1. Stop promotion and historical backfill. Do not delete a volume or overwrite a backup.
2. If warehouse reads are primary or shadow failures affect requests, return reads to the last proven Supabase mode and deploy through the normal workflow.
3. Preserve the failing container, volume, logs, status artifact, and receipt rows for diagnosis.
4. Use `node infra/warehouse/pi-watchdog/status.js evaluate <absolute-evidence.json> <UTC-time>` against an already-collected artifact. A checker crash or invalid artifact is `DOWN`, never healthy.

## Scenario A — omen-prod server unreachable or destroyed

**Trigger:** host and container checks fail together; independent tailnet and provider checks confirm the host is unavailable.

1. Keep Supabase serving Omen.
2. Verify the newest KVM2 manifest and dump locally with `node infra/warehouse/backup/manifest.js verify <absolute-manifest.json>`.
3. Provision a replacement only in an approved change window, using the reviewed warehouse Compose and a newly generated on-host password.
4. Restore into an isolated PostgreSQL 17 instance before attaching any API or worker.
5. Verify schema version, exact dump hash, row counts, zero `started` receipts, representative current-season queries, and source-rebuild instructions.
6. Re-enable shadow mode first. Promote only after backup, restore, monitoring, and shadow comparisons pass.

**Rollback:** stop the replacement warehouse; preserve its volume; keep Supabase serving.

## Scenario B — warehouse disk full or approaching watermark

**Trigger:** disk check is `DOWN`, PostgreSQL reports space exhaustion, or the measured free-space watermark is crossed.

1. Stop backfill and nonessential correction jobs; do not run VACUUM FULL or delete partitions under pressure.
2. Keep or return application reads to Supabase if query reliability is affected.
3. Measure volume, WAL, logs, temporary files, dumps, and Restic cache separately. Record the exact largest consumers.
4. Remove only independently verified disposable artifacts—never the live database volume, newest verified dump, or sole restore proof.
5. Expand storage or move verified backup/cache data in an approved host change.
6. Re-run database integrity, receipt, backup, and isolated-restore checks before resuming backfill.

**Rollback:** if space remediation is uncertain, leave backfill stopped and Supabase serving; do not improvise deletion.

## Scenario C — PostgreSQL container stopped but omen-prod is healthy

**Trigger:** host health is good, storage is healthy, but PostgreSQL/container health is down.

1. Record container inspect output, exit code, image digest, mounts, resource limits, and recent bounded logs.
2. Confirm the volume and secret file still exist without opening or printing the secret.
3. Attempt a normal container start only after resolving an explicit cause such as an expected host reboot.
4. Verify schema identity, receipts, counts, and query behavior before restoring shadow traffic.

**Rollback:** stop the container and keep Supabase serving. Never recreate the volume as a restart shortcut.

## Scenario D — data corruption or source mismatch

**Trigger:** checksum mismatch, impossible counts, broken receipt chain, known-row comparison failure, or shadow mismatch unexplained by source timing.

1. Stop writes and preserve the suspect source bytes, receipts, and database volume.
2. Keep Supabase serving; do not promote the warehouse.
3. Identify the first affected dataset and season using source hashes and receipts.
4. Restore the last independently verified backup into an isolated database and compare the affected season.
5. If the backup is also affected, rebuild only the affected public dataset/season from its exact admitted nflverse source.
6. Require fresh comparison, backup, and restore evidence before returning to shadow mode.

**Rollback:** retain the suspect database for diagnosis and operate from Supabase or the last verified warehouse copy.

## Scenario E — ingest worker failed or receipts are stuck

**Trigger:** worker check is down, ingest freshness expires, or any receipt remains `started` past its bounded execution window.

1. Confirm PostgreSQL and disk are healthy; do not treat a worker failure as a database failure.
2. Inspect only sanitized status/error codes and the source-bound receipt. Never log the database URL or raw secret.
3. Re-run source validation without a database pool.
4. Retry the exact dataset/season/run only when its source hash matches the failed receipt.
5. If the source changed, create a new source-bound run; never rebind a run ID.
6. Verify no lingering `started` receipt and confirm expected row counts before clearing the alert.

## Scenario F — KVM2 backup repository unavailable

**Trigger:** backup freshness/checksum fails while omen-prod and PostgreSQL remain healthy.

1. Do not stop the healthy warehouse solely because the recovery destination is unavailable; block primary promotion and Step-14 retirement.
2. Preserve the newest local verified dump within measured free-space limits.
3. Repair KVM2 reachability/repository access through the separately approved pinned-host dispatcher.
4. Produce a new encrypted snapshot, verify the manifest, and complete an isolated restore before declaring recovery healthy.

## Retention sizing

Retention is derived during commissioning, not fixed in this repository:

1. Measure KVM2 total, used, reserved, and safely allocatable bytes.
2. Measure at least one real current-season dump and one representative historical-season increment after Restic deduplication.
3. Reserve operating headroom and space for an isolated restore alongside the repository.
4. Propose daily/weekly/monthly counts that fit the measured safe allocation under conservative growth.
5. Recalculate after the 1999–2026 backfill and before increasing retention.

## Verification and escalation

- [ ] Supabase rollback path works.
- [ ] Latest dump and manifest hashes match.
- [ ] Isolated PostgreSQL 17 restore passes schema, receipt, count, and representative-query checks.
- [ ] Kuma, Beszel, GlitchTip/Sentry, and the independent Pi witness all recover.
- [ ] The incident-specific cause is corrected; a generic green container is insufficient.

Escalate every destructive action, unexplained corruption, missing sole backup, secret exposure, or proposed primary-mode promotion to Justin for an exact-action decision.

## History

| Date | Run by | Notes |
|---|---|---|
| 2026-10-05 | Codex | Initial scenario-specific repository contract; not live-tested. |
