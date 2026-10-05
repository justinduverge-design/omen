# omen-prod preflight and empty-container foundation — 2026-10-05

## Outcome

The first `omen-prod` pass stopped before mutation. Read-only evidence confirmed 83 GiB free disk, 6.9 GiB available memory, Docker 29.6.2, Compose 5.3.1, existing `omen_network`, healthy Omen API/cron containers, and no PostgreSQL listener. `/opt/omen/warehouse` was absent. No file was copied, no secret generated, and no container or volume created.

The stop was required because the reviewed Compose database name and empty migration ledger could not pass the writer's target-identity contract. The repository foundation is corrected before another live attempt.

## Repository checkpoint

- PostgreSQL is pinned to the reviewed Linux/amd64 PostgreSQL 17.11 Bookworm manifest digest.
- Compose creates and health-checks canonical database `omen_football`.
- A single controlled initialization script checks `0001_football_warehouse.sql` against its separately reviewed SHA-256, applies the schema and records version/name/checksum in one PostgreSQL transaction, and fails closed on divergence.
- Container health requires the exact version, migration name, and reviewed checksum; `pg_isready` alone cannot mark a partially initialized warehouse healthy.
- The disposable PostgreSQL 17 schema proof verifies the migration receipt against the mounted migration bytes.

## Verification

- `warehouse/test/run-schema-test.sh` printed `VERIFIED football warehouse schema`.
- Infrastructure, runtime-config, and target-identity tests: 11 passed, 0 failed.
- Shell syntax and `git diff --check` passed.
- Full `npm test`: 2023 passed, 0 failed.

## Next safe boundary

Do not commission yet. Before the next host mutation, add an immutable commit-bound production artifact/install path, secret-safe least-privilege login provisioning, and a sanitized commissioning verifier. The first live slice then ends after empty container/catalog/network/resource proof. It includes no ingest, API/cron configuration, timer, backup, monitoring mutation, or cutover.

Current-season ingestion remains blocked until it acquires each source once into content-addressed staging, includes bounded play-by-play, and can verify the same exact bytes it writes. Backup and watchdog dispatch remain intentionally refused until their pinned-host implementations exist.
