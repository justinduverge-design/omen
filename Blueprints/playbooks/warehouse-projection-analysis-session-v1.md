# Warehouse projection analysis session v1

**Status:** Proposed; local design only, not commissioned

**Owner:** Justin

**Last updated:** 2026-10-13

**Frequency:** As needed for projection certification

**Approval boundary:** Installing tools, receiving a decrypted source or starting the supervisor
requires a fresh, exact founder approval packet. Phase 1 and Phase 5 inspection commands are
non-mutating checks; running them does not authorize any later phase.

## Purpose

Provide a short-lived, read-only analysis copy of a proven football-warehouse backup so the offline
Omen projection backtest can produce QB/RB/WR/TE evidence by scoring family. The procedure must not
weaken, replace, or share mutable state with the scheduled weekly restore proof.

This procedure is intentionally separate from `restore-isolated.sh`. The scheduled proof continues
to prove recovery and destroy a successful restore. The analysis session restores a separately
received copy into separately named resources, holds it only while an operator-owned supervisor is
alive (with a hard time limit), exposes no TCP port and then destroys the database, source copy,
socket and credentials.

## Decision

Use a supervised KVM2 container with `--network none`, a fresh Docker volume and one host bind-mounted
Unix-socket directory. A second SSH connection forwards that socket to the operator's Mac. PostgreSQL
admits only the fixed LOGIN principal `omen_warehouse_read` through that socket. The backtest itself
also verifies database name, session user and `transaction_read_only=on` before reading any facts.

Do not use the live KVM1 warehouse, `postgres`, a TCP listener, a published Docker port, a password in
argv/environment, or the scheduled restore-proof container/volume/source/proof paths.

## Alternatives rejected

| Option | Why it is rejected |
|---|---|
| Keep the weekly restore alive | Couples analysis to recovery proof, changes its cleanup contract and makes a duplicate scheduled run ambiguous. |
| Run against production on KVM1 | Turns model research into production database access and weakens the restored-evidence claim. |
| Publish loopback or Tailscale TCP | Creates a listener and an additional credential/firewall surface when SSH already supplies the private transport. |
| Unix socket with broad `trust` | A client could request `postgres`; filesystem privacy alone does not enforce the database identity. |
| Copy a database URL/password to the Mac | Creates a secret-distribution and retention problem the socket path does not need. |
| Preserve a failed analysis indefinitely | Leaves decrypted data and an unknown database state. Analysis is reproducible; failure evidence is a receipt and bounded logs, then cleanup. |

## Non-negotiable invariants

1. Host is exactly `model-host`; orchestration runs as root.
2. The exact pre-staged PostgreSQL 17 image content ID is used; the session never pulls.
3. Container has `--network none`, no published ports, read-only rootfs, bounded memory/CPU/PIDs,
   dropped capabilities and a unique volume.
4. Input manifest has already passed the existing receiver and manifest verifier. The dump digest is
   rechecked before restore.
5. Analysis resource names use an `omen-warehouse-analysis-` prefix and can never equal the
   `omen-warehouse-restore-` scheduled-proof names.
6. `/run/omen-warehouse-analysis` is `0711 root:root` (traversable but not listable). Each host socket
   directory is unique, root-owned, not a symlink, and becomes `0710 root:<operator-group>` only
   after HBA hardening. It is reachable only by the selected human SSH operator plus the container's
   PostgreSQL process.
7. Socket HBA is an allowlist: `local omen_football omen_warehouse_read trust`, followed by rejection
   of every other local role/database. Administrative restore checks use container-internal loopback
   and are never forwarded.
8. `omen_warehouse_read` is LOGIN, NOSUPERUSER, NOCREATEDB, NOCREATEROLE, NOREPLICATION,
   NOBYPASSRLS, inherits only `omen_warehouse_reader`, and has database/role default
   `default_transaction_read_only=on` plus bounded statement/idle timeouts.
9. The root supervisor owns the resources and traps EXIT, HUP, INT and TERM. It applies the hard TTL
   (maximum two hours) to a child lease waiter, never to itself: expiry or SSH disconnect ends the
   child, then the still-running supervisor performs cleanup. A separately reviewed boot/start reaper
   handles the untrappable host-power-loss or supervisor-SIGKILL case before any new session.
   Cleanup removes the container, volume, socket directory and decrypted analysis source even when
   the backtest fails.
10. Cleanup writes a root-owned `0400` receipt containing identifiers, timestamps, manifest/dump
    digests, result, cleanup status and backtest artifact hashes. It contains no query rows, player
    data, password, URL, provider credential or private user data.
11. The analysis never pushes the weekly restore-proof Kuma heartbeat and never creates a
    `restore-proof-*.json`; its success cannot be mistaken for scheduled recovery proof.
12. One session at a time. Refuse while `omen-warehouse-restore-proof.service` is active or while an
    analysis session exists. Also refuse if the entire requested interval (`now` through
    `now + TTL + 30 minutes cleanup reserve`) intersects Sunday 12:00:00 through 17:00:00 UTC, or if
    the timer's reported next elapse is less than `TTL + 30 minutes` away. The fixed window covers
    the 14:00 UTC schedule and its observed randomized delay without relying only on wall-clock
    equality.

## Resource model

```text
encrypted snapshot on KVM1
        |
        | existing forced-command receiver (exact snapshot/run identity)
        v
KVM2 private analysis source (0700, unique copy)
        |
        v
network-none PG17 container + fresh volume
        |
        | allowlisted Unix socket only
        v
SSH stream-local forward to a private Mac socket
        |
        v
local omen-projections-backtest.js
        |
        v
local JSON/Markdown evidence + hashes in KVM2 cleanup receipt
```

The source must be copied into an analysis-specific directory rather than moved or reused from
`/var/lib/omen/warehouse-restore-sources`. This keeps the scheduled receiver's stale-source and
already-proven guards authoritative.

## Required implementation before commissioning

The pure planning/refusal core is implemented locally in
`infra/warehouse/backup/projection-analysis-session.js`. It validates the session/run IDs and TTL,
derives only analysis-namespaced resources, and refuses both the fixed protected window and a
reported timer elapse that intersects TTL plus cleanup reserve. It creates nothing and is safe to
include in a release, but is not a runnable analysis session.

The receiver, resource-owning supervisor, reaper, HBA transition and completion interface remain
unimplemented. No KVM2 install/run is earned until their reviewed implementation satisfies all of
the following:

- accept only an absolute verified manifest, an absolute receipt path and a bounded integer TTL;
- derive all other names from the verified backup run ID plus a random, validated session suffix;
- refuse a pre-existing container, volume, socket directory, source or receipt;
- create the capability roles before restore, restore with `--no-owner --no-privileges`, then create
  the LOGIN reader and grant only the NOLOGIN reader role;
- revoke database `CONNECT` from `PUBLIC`, grant it only to `omen_warehouse_reader`, and verify the
  ordered HBA contains the one reader allow rule followed by local rejection;
- rewrite and reload `pg_hba.conf` before making the host socket reachable;
- keep the non-listable parent `0711 root:root`; create the session socket directory initially as
  `root:<container-postgres-gid>` with no operator access,
  start the container with the operator's host GID as a supplemental group, harden/reload HBA, run
  rejection probes from inside the container, and only then change the session directory to
  `0710 root:<operator-group>` so the SSH operator can traverse it; this ordering closes the
  broad-init-HBA exposure window without making the parent block forwarding;
- prove rejection of `postgres`, a fabricated role and the wrong database directly through the
  hardened host socket before printing `SOCKET_READY socket=<fixed non-secret path>`;
- verify `session_user`, `current_database()`, `transaction_read_only`, role attributes and exact
  membership through the same socket;
- run the bounded lease waiter as a child under `timeout --signal=TERM --kill-after=30s`; never wrap
  the resource-owning supervisor in `timeout`, because SIGKILL cannot run a shell trap;
- on every start, run a reviewed reaper that refuses or removes only fully validated stale
  `omen-warehouse-analysis-*` resources and writes a cleanup-failure receipt; it must never match
  scheduled `omen-warehouse-restore-*` resources;
- accept a backtest completion record containing only artifact SHA-256 hashes and certification
  metadata; and
- verify after cleanup that the container, volume, socket and decrypted source are absent before
  sealing the receipt.

The implementation must have deterministic tests for every refusal and cleanup branch before it is
placed in a warehouse release. Do not add it to `build-release.sh` until those tests and an independent
review pass.

## Runbook

### Prerequisites

- [ ] Build 12 projection suite passes.
- [ ] A weekly restore proof exists for the selected snapshot and verifies with `manifest.js`.
- [ ] KVM2 preflight confirms the pinned image and stopped anchor exist, no restore/analysis container
      is running, sufficient disk/memory remain, and the scheduled proof is not active or imminent.
- [ ] The reviewed supervisor is included in a verified, commit-bound warehouse release.
- [ ] Founder approves the filled command packet for that exact release, snapshot and TTL.
- [ ] Mac output directory is new, absolute and mode `0700`.

### Phase 1 — read-only preflight

These commands do not authorize Phase 2:

```sh
ssh kvm2 'hostname; id; sudo systemctl is-active omen-warehouse-restore-proof.service || true; sudo systemctl list-timers omen-warehouse-restore-proof.timer --no-pager; sudo docker image inspect sha256:91eb910c44c7ed13f7f1a4ccadaa9ca72ef14cddc04cacb6e070e48eb44731a3 --format "{{.Id}}"; sudo docker ps -a --filter name=omen-warehouse-analysis- --format "{{.Names}} {{.Status}}"; df -B1 /var/lib/omen; free -b'
```

Expected: `model-host`, scheduled proof inactive, exact image present, no analysis resources, and
capacity above the measured restore reserve. If any assertion differs, stop and update the approval
packet; do not normalize posture or remove resources speculatively.

### Phase 2 — start the approved supervisor

Open a dedicated terminal and keep it open. The final reviewed script must print only the session ID,
socket path, expiry and non-secret state transitions.

```sh
ssh -tt kvm2 'sudo /opt/omen/warehouse-restore/run-projection-analysis-session.sh --manifest /var/lib/omen/warehouse-analysis-sources/APPROVED_SESSION_ID/manifest.json --receipt /var/lib/omen/warehouse-analysis-receipts/APPROVED_SESSION_ID.json --ttl-seconds 7200'
```

Expected: restore, ordered-HBA, identity and host-socket refusal probes pass, then `SOCKET_READY`.
If it exits before `SOCKET_READY`, confirm its cleanup receipt says every ephemeral resource is
absent. Do not manually reuse its names.

### Phase 3 — forward only the allowlisted socket

In a second terminal, create a private, short local directory (Unix socket paths have a small
platform-dependent length limit) and forward the approved remote socket. OpenSSH must fail rather
than silently replacing either socket.

```sh
install -d -m 0700 /ABSOLUTE/LOCAL/SESSION
ssh -N -o ExitOnForwardFailure=yes -o StreamLocalBindUnlink=no -L /ABSOLUTE/LOCAL/SESSION/.s.PGSQL.5432:/run/omen-warehouse-analysis/APPROVED_SESSION_ID/.s.PGSQL.5432 kvm2
```

Keep this connection open. Never forward a TCP port.

Before running the backtest, repeat the identity boundary from the Mac through the forwarded socket:

```sh
test "$(psql --no-psqlrc --host /ABSOLUTE/LOCAL/SESSION --username omen_warehouse_read --dbname omen_football --tuples-only --no-align --command "select session_user || '|' || current_database() || '|' || current_setting('transaction_read_only')")" = "omen_warehouse_read|omen_football|on"
! psql --no-psqlrc --host /ABSOLUTE/LOCAL/SESSION --username postgres --dbname omen_football --command 'select 1'
! psql --no-psqlrc --host /ABSOLUTE/LOCAL/SESSION --username omen_warehouse_read --dbname postgres --command 'select 1'
```

Expected: the exact reader identity succeeds; superuser and wrong-database attempts fail. These
client-side probes happen after `SOCKET_READY`, so readiness does not depend circularly on a tunnel
that has not been created yet.

### Phase 4 — run the local read-only backtest

```sh
node scripts/omen-projections-backtest.js --seasons 2022-2025 --warmup 2 --positions QB,RB,WR,TE --sleeper --socket /ABSOLUTE/LOCAL/SESSION --out-dir /ABSOLUTE/NEW/EVIDENCE/DIRECTORY
```

The CLI must refuse unless it sees `omen_warehouse_read`, `omen_football` and a read-only session.
Record PASS/HOLD/FAIL separately for QB/RB/WR/TE and standard/half-PPR/PPR. Sparse evidence is HOLD.

### Phase 5 — seal hashes and clean up

Send only the two artifact hashes and completion status to the supervisor using the reviewed bounded
completion interface. Then close the socket-forwarding terminal and allow the supervisor to exit.
If the completion interface is not implemented, interrupt the supervisor; cleanup is mandatory and
the receipt must mark the analysis incomplete.

Verify with read-only commands:

```sh
ssh kvm2 'sudo docker ps -a --filter name=omen-warehouse-analysis- --format "{{.Names}} {{.Status}}"; sudo docker volume ls --filter name=omen-warehouse-analysis- --format "{{.Name}}"; sudo find /run/omen-warehouse-analysis -mindepth 1 -maxdepth 1 -print 2>/dev/null; sudo find /var/lib/omen/warehouse-analysis-sources -mindepth 1 -maxdepth 1 -print 2>/dev/null'
```

Expected: no session resources. Inspect only receipt metadata, never restored rows:

```sh
ssh kvm2 'sudo stat -c "%a:%U:%G %n" /var/lib/omen/warehouse-analysis-receipts/APPROVED_SESSION_ID.json'
```

Expected: `400:root:root`.

## Approval-required future host mutation command list

This section is a command template, **not an approval request and not executable as written**. Before
commissioning, replace every `APPROVED_*` token with a concrete value, attach the verified release
manifest hash and script SHA-256, and present the resulting exact list to Justin. Approval of one
filled list does not approve a later snapshot, release, session or rerun.

```sh
# Install from an already verified commit-bound release; never curl or copy an ad hoc working file.
ssh kvm2 'sudo install -m 0755 -o root -g root /opt/omen/warehouse/releases/APPROVED_COMMIT/infra/warehouse/backup/run-projection-analysis-session.sh /opt/omen/warehouse-restore/run-projection-analysis-session.sh'

# Create private analysis roots without changing scheduled-proof roots or units.
ssh kvm2 'sudo install -d -m 0700 -o root -g root /var/lib/omen/warehouse-analysis-sources /var/lib/omen/warehouse-analysis-receipts; sudo install -d -m 0711 -o root -g root /run/omen-warehouse-analysis'

# Receive/copy the exact already-approved snapshot into a distinct analysis source through the
# reviewed analysis receiver. This command must be supplied by the implementation review; do not
# substitute cp from the scheduled restore source.
ssh -tt kvm2 'sudo /opt/omen/warehouse-restore/receive-projection-analysis-source.sh APPROVED_SNAPSHOT_ID APPROVED_RUN_ID APPROVED_SESSION_ID'

# Start the supervised two-hour analysis window in the foreground.
ssh -tt kvm2 'sudo /opt/omen/warehouse-restore/run-projection-analysis-session.sh --manifest /var/lib/omen/warehouse-analysis-sources/APPROVED_SESSION_ID/manifest.json --receipt /var/lib/omen/warehouse-analysis-receipts/APPROVED_SESSION_ID.json --ttl-seconds 7200'
```

No `systemctl enable`, timer change, Docker pull, firewall change, listener, account-key change,
Sentinel baseline refresh or weekly proof invocation belongs to this procedure.

## Failure handling and rollback

| Symptom | Required response |
|---|---|
| Scheduled proof active, or requested TTL plus cleanup reserve overlaps its protected window | Do not start; choose another window. |
| Image or anchor absent | Stop. Image restoration is a separate approved change. |
| Manifest/digest/proof mismatch | Stop, cleanup analysis copy, investigate the backup chain. Do not select an older snapshot silently. |
| Any socket identity other than fixed reader succeeds | P0 for this procedure: terminate, cleanup, retain receipt/log metadata and repair before retry. |
| Backtest fails | Mark receipt incomplete, hash any non-sensitive diagnostic output, cleanup everything, repair locally. |
| SSH supervisor disconnects | The supervisor trap cleans up; verify absence with Phase 5 read-only commands. |
| TTL expires | TERM then KILL the child lease waiter after grace; the supervisor cleans up and the receipt says `expired`, never success. |
| Host power loss or supervisor receives SIGKILL | The next start must run the narrow reaper and refuse to continue unless every stale analysis resource is removed and receipted. |
| Cleanup cannot remove a resource | Receipt says cleanup failed; do not refresh Sentinel posture or start another session. Escalate with exact resource names. |

Rollback is removal of the installed analysis scripts and empty analysis roots in a separately
approved command list. The scheduled restore scripts, timer, proof files, pinned image anchor and
encrypted repository are never rollback targets for this feature.

## Evidence required to move from Proposed to Commissioned

- focused local refusal/cleanup tests;
- shell static checks and release-inventory tests;
- independent code/security review;
- one approved KVM2 dry refusal with no restore;
- one approved full session proving wrong-role rejection, TTL/trap cleanup and receipt sealing;
- backtest JSON/Markdown hashes match the receipt;
- post-run Sentinel posture understood; and
- the next scheduled weekly proof still succeeds independently.
