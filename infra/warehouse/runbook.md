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
6. Reconcile the LOGIN roles with `sudo infra/warehouse/provision-login-roles.sh`. The script writes
   credential files only at the fixed host path and runs administrative SQL through the fixed private
   container. It does not require a host PostgreSQL client or a published port, and never carries a
   password in Docker argv or environment variables.
7. Verify the migration checksum ledger, catalog, partitions, typed columns, and capability-role grants
   with `sudo infra/warehouse/verify-production-readonly.sh`. This production verifier runs in an
   explicit read-only transaction. Do **not** run `warehouse/test/verify_schema.sql` on production; that
   file intentionally inserts disposable fixture rows for local schema rehearsal.

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

## Sight status export (the Valor loop board)

`monitor/sight-status.js` builds `omen-sight-status.v1`: per Sight version, the weeks computed and graded,
failed runs with their codes, and Sight's error against the provider's on the same players (per graded
week, season to date, per position), plus the grading switch (this release's compose) and the served
switch (`GET /api/version` on 127.0.0.1). It reads `football_metric_runs` in a read-only transaction (and a
read-only session, as `status-export` does) and the ingest's own summary line from the journal. It never
reads `football_metric_values`, a player row, user data or the env file.

It follows the A4-gates pattern: `monitor/omen-sight-status.timer` runs `monitor/sight-status-run` hourly as root.
KVM1 has no host Node, so the runner collects the raw inputs in sh (`docker exec … psql` in a read-only session,
`journalctl`, `curl` of the local `/api/version`) and summarizes them with `sight-status.js from-dir` inside the
release's own pinned ingest image (`worker_image` in `RELEASE-CONTRACT`; `--network none`, read-only, `--pull never`).
It writes `/var/lib/omen-sight-status/status.json` (or the `checker_failure` line), and the existing read-only `omen-football-status` channel
only `cat`s that file when asked for `sight-status` (`ops/football-data/kvm1/omen-football-status-export`).
No SSH identity gains docker, journal or database access. Command Center pulls it hourly (Valor-Core
`ops/sight-pull`, as its own user with its own key) for the loop board.

Founder-only host steps, after the release carrying it is selected. omen-prod runs Tailscale SSH, which never
reads `authorized_keys`: who may log in as `omen-football-status` is the tailnet SSH policy (Command Center's
access was added on 2026-11-13), and what that user can do is its **login shell**, which is the export
(`/usr/local/libexec/omen-football-status-export`), not an `authorized_keys` forced command. Tailscale SSH runs
it as `<export> -c "<command>"` without `SSH_ORIGINAL_COMMAND`; the export takes the command from `-c`, accepts
exactly `status`, `a4-gates` or `sight-status`, and exits 64 for anything else (extra words, sftp, scp, an
interactive login with arguments). There is no `authorized_keys` step.

1. From the Mac, at the merged commit, copy the export to the host (it is not in the release root):

   ```bash
   cd ~/Documents/GitHub/Valor-Core/Slops-OS/slops-saloon/omen
   scp ops/football-data/kvm1/omen-football-status-export justin@omen-prod:/tmp/omen-football-status-export.new
   ```

2. On omen-prod (`ssh justin@omen-prod`), replace the installed export atomically, keeping its owner and mode,
   and confirm the login shell still points at it:

   ```bash
   f=/usr/local/libexec/omen-football-status-export
   sudo install -o "$(stat -c %U "$f")" -g "$(stat -c %G "$f")" -m "$(stat -c %a "$f")" /tmp/omen-football-status-export.new "$f.new"
   sudo mv "$f.new" "$f" && rm /tmp/omen-football-status-export.new
   getent passwd omen-football-status | cut -d: -f7                     # expect the same path as $f
   grep -qx "$f" /etc/shells && echo listed                             # expect: listed (if not: echo "$f" | sudo tee -a /etc/shells)
   sudo -u omen-football-status "$f" -c status | head -c 80; echo       # expect the start of status.json
   sudo -u omen-football-status "$f" -c 'status; id'; echo "exit $?"    # expect: exit 64
   ```

3. Still on omen-prod, install the Sight timer and service from the selected release. Preflight: the release's
   `worker_image` is already pulled (the daily ingest uses it), since the runner never pulls.

   ```bash
   r=/opt/omen/warehouse/current
   sudo docker image inspect "$(sed -n 's/^worker_image=//p' "$r/RELEASE-CONTRACT")" > /dev/null && echo image-present
   sudo install -o root -g root -m 0644 "$r/infra/warehouse/monitor/omen-sight-status.service" "$r/infra/warehouse/monitor/omen-sight-status.timer" /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable --now omen-sight-status.timer
   sudo systemctl start omen-sight-status.service
   wc -l < /var/lib/omen-sight-status/status.json                               # expect 1
   grep -c '"checker_completed":true' /var/lib/omen-sight-status/status.json    # expect 1
   systemctl list-timers omen-sight-status.timer --no-pager
   ```

   `"served"` stays null until the API image carrying `/api/version`'s `sight` block is serving.

4. Prove from Command Center: `ssh -i ~/.ssh/valor_sight_status omen-football-status@omen-prod sight-status`
   prints the same one line, the same call with `'sight-status extra'` exits 64, and
   `ssh cc '~/Valor-Core/ops/sight-pull'` succeeds. Tailscale SSH ignores the `-i` key and admits cc by its
   tailnet identity, so a refusal here is the tailnet policy, not the key. The `a4-gates` reader works over
   the same `-c` path.
5. On Sentinel, refresh omen-prod's posture baseline: the export's hash changed (expect one finding, then
   re-baseline).

`steward-status` and `sentinel-status` still have `/bin/bash` as their login shell. They are not in the tailnet
SSH rule today; lock each to its own export the same way before adding it, or the rule grants a full shell.

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
