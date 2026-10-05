# Football warehouse command and source families — 2026-10-05

## Added

- Import-safe manual current-season command with safe configuration default, poolless source validation, exact ingest enablement, target database/role/schema-version verification, secret-safe status records, bounded pool settings, signal cancellation, and bounded pool drain.
- Current-season orchestration now includes team-week facts and weekly rosters in both validation and ingest paths; it can no longer report success while those required Step-15 families remain untouched.
- Exact bounded nflverse team-week and weekly-roster acquisitions, strict adapters, source hashes, full raw rows, GSIS-only roster matching, and transactional season writers.
- Exact bounded gzip play-by-play acquisition, strict adapter, typed EPA/WPA/CPOE/air-EPA/YAC-EPA/success, full raw rows, transactional season writer, and unmatched GSIS skip/report behavior.
- Source-bound bounded failure receipts for every new writer. Failed receipt retries clear `source_rows` before returning to `started`.

## Safety boundary

The command is not referenced by cron, Docker, Compose, or the API. No live source was downloaded, no database credential was read, no host was contacted, and no warehouse was provisioned or mutated.

## Verification

- New and adjacent focused warehouse suites: PASS.
- Full repository suite before final review fixes: PASS, 2014/2014.
- Post-review focused suites: PASS.
- Syntax and `git diff --check`: PASS.
- PostgreSQL 17 integration for the previously landed chain: PASS at the prior checkpoint.
- PostgreSQL 17 integration for team-week, roster, and play-by-play writers: NOT RUN; must be added before commissioning.

## Remaining immediate work

1. Add PostgreSQL 17 integration for all three new writers and update the integration runner to cover the complete current-season chain.
2. Replace the in-memory 1 GiB play-by-play parse with a streaming/batched backfill path before 1999–2026 production ingestion.
3. Build and locally test encrypted backup/restore and fleet status contracts.
4. Provision KVM1 only after the PR is reviewed and the deployment/change window is explicit.
