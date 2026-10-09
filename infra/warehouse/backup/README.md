# Football warehouse backup and isolated-restore gate

These scripts extend Omen's commissioned encrypted Restic/SFTP path for public,
rebuildable football facts. They do not contain repository credentials, create
SSH trust, install packages, pull images, or alter Supabase.

Neither script is authorized merely because it is present in a release. Run it
only in an approved change window after resolving the checks below.

## Live read-only commissioning snapshot — 2026-10-08

The following facts were measured without opening a credential or changing a
host:

| Check | omen-prod | KVM2 (`model-host`) |
|---|---:|---:|
| Root filesystem free bytes | 87,587,409,920 | 82,168,852,480 |
| Available memory bytes | 7,233,921,024 | 7,679,070,208 |
| Docker | 29.6.2 | 29.6.2 |
| Restic | 0.16.4 | absent |
| PostgreSQL client | supplied by private PG17 container | host client 14.24 only |
| TCP 5432 listeners | 0 | 0 |
| Encrypted repository | commissioned client and password file present | `/srv/restic/omen`; remeasure before retention changes |
| Pinned PG17 restore image | running on omen-prod | exact content image ID staged and proven |

The live warehouse database measured 140,220,083 bytes and its Docker volume
314.8 MB before historical backfill. Those are database/volume measurements,
not compressed-dump or Restic-deduplicated-size measurements and must not be
substituted for them in retention calculations.

## Backup dispatcher

`create-snapshot.sh` runs only as root on `omen-prod`. It:

1. verifies the private warehouse is healthy and credential metadata is exact;
2. requires zero active ingest receipts and at least one succeeded receipt;
3. creates a PostgreSQL 17 custom-format dump through the least-privilege backup
   role, carrying the passfile only over container stdin;
4. rejects the dump if receipt/count evidence changes during its execution;
5. creates and locally hashes a manifest; and
6. sends the directory through the existing `omen-backup-client` Restic password
   file and commissioned SFTP repository assignment with warehouse-specific tags.

After Restic returns an exact 64-hex snapshot ID, the local plaintext dump is
removed. A failed upload leaves its private local directory for bounded diagnosis
instead of pretending the backup succeeded.

The script never prints or exports database or Restic secret values. The first
live run must record the manifest dump bytes and Restic snapshot size before a
retention count is proposed.

## KVM2 isolated restore

`restore-isolated.sh` runs only as root on KVM2 and requires:

- a root-owned `0700` directory containing a manifest and `warehouse.dump`
  already recovered by a separately commissioned dispatcher;
- the exact pinned PostgreSQL 17 image already present locally; and
- a distinct root-owned `0700` proof directory.

It refuses to pull an image or acquire credentials. The disposable PostgreSQL
instance has no network, no published port, a unique fresh volume, and bounded
resources. It restores with no original owner or privileges, verifies schema,
receipt and row-count evidence plus representative receipt-chain queries, writes
a `0400` proof, and removes the disposable instance only after success. A failed
restore is preserved for bounded diagnosis.

## Proven one-time restore and recurring design

The first encrypted warehouse snapshot and isolated KVM2 restore passed on
2026-10-09. The exact PostgreSQL image was staged by content ID; manifest, dump
checksum, schema version, receipt state, all seven row counts, and representative
receipt-chain queries matched. The root-owned `0400` proof was retained, while
the decrypted source and disposable container/volume were removed. This proves
recoverability for that snapshot; it does not prove a recurring recovery job.

The remaining operational gate is commissioning and proving the repeatable
transfer channel and its timers. The repository contains:

- `export-restore-file.sh` is the omen-prod forced command. Running as the
  existing backup-only user, it accepts either `latest` or `manifest|dump`, one
  lowercase 64-hex snapshot ID, and one warehouse run ID. `latest` returns only
  the exact newest warehouse snapshot/run identities. File reads verify the
  warehouse tag and use only a fixed manifest or dump path from Restic.
- `receive-restore-source.sh` is the KVM2 root receiver. It uses a dedicated key,
  a dedicated pinned known-hosts file, strict host checking, a fresh `0700`
  staging directory, manifest validation, exact byte count, SHA-256 verification,
  and atomic admission into the restore-source root.
- `run-nightly-backup.sh` invokes the selected release's snapshot creator and
  then `apply-retention.sh`; only after both succeed does it send `up` to a
  dedicated Kuma push URL held in a root-only file. The retention tool refuses
  to run without `/etc/omen-warehouse/warehouse-restic-retention` as a `0600`
  root-owned file containing exactly three bounded positive integers: daily,
  weekly, and monthly keep counts. It limits only the warehouse-tagged snapshot
  selection and prunes unreferenced repository data. Missing measured policy is
  a failed backup heartbeat, never an implicit unlimited policy.
  The heartbeat accepts the private Pi Kuma endpoint at
  `http://100.98.81.0:3001/api/push/...` or an HTTPS push endpoint; it refuses
  every other plaintext HTTP destination.
- `run-weekly-restore-proof.sh` discovers the newest exact snapshot through the
  forced command, receives it, runs the pinned networkless restore, independently
  verifies the proof, and only then removes the decrypted restore source.
- Separate persistent systemd timers run backup nightly at 12:30 UTC and restore
  proof Sundays at 14:00 UTC, after the daily 11:15 UTC ingest window.

The channel deliberately uses two immutable reads from one exact snapshot; the
manifest authenticates the dump. The Restic password remains on omen-prod.
No script copies or prints the Restic password, grants a general shell, widens
the KVM2 SFTP-only account, or pulls an image. A failed receive or restore
preserves bounded diagnostic material; only a verified success removes the
decrypted source.

### Exact commissioning scope (not executed by repository delivery)

1. Add a dedicated recovery key to the existing non-admin
   `omen-backup-client` account on omen-prod. Its authorized-key entry is
   source-restricted to KVM2 and carries both `restrict` and
   `command="/opt/omen/warehouse-recovery/export-restore-file.sh"`.
   Do not reuse the monitoring-status key.
2. Install one dedicated private key and one separately verified pinned
   known-hosts file at the fixed root-only KVM2 paths named by the receiver.
3. Install the release manifest verifier at the receiver's fixed path and stage
   this exact release on both hosts without selecting it for the live warehouse.
4. Create the dedicated Kuma push monitor and write its URL, without echoing it,
   to `/etc/omen-warehouse/kuma-backup-push-url` as `0600 root:root`.
5. From KVM2, invoke `run-weekly-restore-proof.sh`; inspect the resulting
   root-only `0400` proof and confirm the decrypted source was removed.
6. Test refusal of an arbitrary command, wrong snapshot tag, wrong run ID,
   changed host key, existing target, and checksum mismatch before considering a
   timer. Retain the proof before removing decrypted source material.
7. Install and enable the nightly backup timer on KVM1 and the weekly restore
   timer on KVM2. Batch A closes only after each timer has produced one successful
   scheduled run; a manual `systemctl start` does not satisfy that claim.

Do not solve this blocker by copying the Restic password, loosening the chroot,
accepting a host key interactively, using an unpinned image, or giving the
transfer identity an unrestricted shell.

## Retention decision rule

No fixed count is asserted yet. After the first full 1999–2026 snapshot, let:

- `A` be KVM2 safely allocatable bytes after normal operating reserve;
- `R` be space reserved for one isolated restored database plus Docker overhead;
- `F` be measured full Restic repository growth for the first snapshot; and
- `D` be the 95th-percentile daily repository growth measured over at least
  seven runs.

Only daily/weekly/monthly policies whose measured worst-case retained growth
satisfies `repository_size + F + R + retained_growth < A` are eligible. The
extra `F` reserves one independent full-snapshot-equivalent during repair. Write
the chosen counts to the external policy only after founder approval; the timer
cannot run successfully without it. Recalculate after historical backfill and
after any schema or source-row retention expansion.
