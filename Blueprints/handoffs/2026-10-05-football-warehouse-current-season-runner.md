# Football warehouse current-season runner checkpoint — 2026-10-05

## Outcome

The non-production warehouse foundation now has an injected, resumable current-season
orchestrator. It acquires schedules, player identities, and player-week statistics in
parallel; validates every source before the first database mutation; and then writes in
the dependency order teams → schedules → players → player weekly.

This runner is intentionally not wired to cron, KVM1, a production database, or an Omen
customer route. The four writers own separate transactions, so the run is fail-stop and
resumable rather than globally atomic.

## Safety contract

- The season is explicit and never inferred from the clock or a clamped week.
- Dataset run IDs are deterministic functions of the exact source bytes, dataset, and
  season/global scope. Full SHA-256 receipts remain the source of record.
- All three acquisitions share cancellation and a bounded caller-visible deadline.
  A cancellation-ignoring injected dependency cannot hold the runner open past that
  deadline; terminal handlers remain attached to late promises.
- Caller cancellation is checked before/between adapters and between independently
  committed writer stages.
- PostgreSQL statement and advisory-lock waits are transaction-locally bounded on all
  four writers. Failure receipts use a separate short bounded best-effort transaction.
- Direct player-week writer calls admit only the exact nflverse season asset.
- Failed player-week run IDs cannot be rebound to different source bytes; player
  identity retries refresh diagnostics only when still bound to the same source hash.
- With dependent facts present, schedule refreshes may update scores, lines, weather,
  coaches, venue context, and preserved source rows in place. Any change to game IDs,
  week, game type, or participants still stops with `dependent_facts_exist`.

## Verification

- Focused runner/writer/timeout tests: 44 passed after review fixes.
- PostgreSQL 17 runner proof: initial four-stage ingest, identical unchanged retry,
  nonstructural schedule refresh after facts, exact joins, and zero lingering `started`
  receipts.
- All warehouse schema/writer/source integration scripts pass fail-fast.
- Full repository suite: 1,983/1,983 passed after all review fixes.

## Next safe slice

Build the executable composition root around a dedicated warehouse pool with bounded
connection acquisition, safe environment-name validation, structured status-only
logging, and an explicit dry-run/validate mode. Do not activate a timer or deploy it
until KVM1 provisioning, backup/restore, and production readiness gates are separately
approved and proven.
