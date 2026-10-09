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
| Encrypted repository | commissioned client and password file present | `/srv/restic/omen`, 32,387,072 allocated bytes |
| Pinned PG17 restore image | running on omen-prod | absent |

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

## Current blockers to a live restore proof

The encrypted backup half can reuse a commissioned Omen mechanism. The KVM2
restore half cannot yet be run honestly because:

1. KVM2 does not have Restic installed;
2. KVM2 does not have the pinned PostgreSQL 17 image staged; and
3. no reviewed, pinned-host dispatcher currently moves a decrypted warehouse
   snapshot from the KVM1-only Restic client into the KVM2 restore source without
   copying the Restic password to KVM2 or granting a general shell to the
   SFTP-only account.

Do not solve the third item by copying the Restic password, loosening the
chroot/SFTP account, accepting a host key interactively, or using an unpinned
image. Commission a narrow forced-command dispatcher, then exercise these exact
steps:

1. produce the first encrypted warehouse snapshot;
2. record custom-dump bytes and Restic repository growth;
3. restore into a fresh root-owned KVM2 source directory;
4. pre-stage the pinned PG17 image by an approved image-transfer mechanism;
5. run the isolated restore and validate the proof with
   `manifest.js verify-restore`; and
6. remove the preserved source/target only after the proof has been retained.

## Retention decision rule

No fixed count is asserted yet. After the first full 1999–2026 snapshot, let:

- `A` be KVM2 safely allocatable bytes after normal operating reserve;
- `R` be space reserved for one isolated restored database plus Docker overhead;
- `F` be measured full Restic repository growth for the first snapshot; and
- `D` be the 95th-percentile daily repository growth measured over at least
  seven runs.

Only policies satisfying `repository_size + F + R + retained_daily*D < A` are
eligible. The extra `F` reserves one independent full-snapshot-equivalent during
repair. Recalculate after historical backfill and after any schema or source-row
retention expansion.
