# Football warehouse runtime composition — 2026-10-05

## Landed in this slice

- The current-season ingest runner now has an explicit `validate` mode that acquires and fully adapts schedules, player identities, and player-week data, then returns before every database writer.
- Warehouse PostgreSQL configuration is isolated from Omen's Supabase configuration. The database URL is read from an absolute, restricted server-side file and is never included in validation errors.
- Pool size, connection timeout, idle timeout, acquisition timeout, and SSL mode are bounded and fail closed. PostgreSQL URL SSL query overrides are rejected.
- A dedicated pool composition wires the existing acquisitions, adapters, and transactional writers. A separate validation composition can run with no database pool.
- `pg` is a runtime dependency rather than a development-only dependency.

## Deliberately not activated

There is no executable entrypoint, Docker/Compose change, cron registration, KVM deployment, live source run, database connection, schema application, or production mutation in this slice.

## Next safe slice

Add the manual, import-safe command wrapper. Require an explicit ingest mode, keep validation as the safe default, attach secret-safe pool error handling, add a bounded target-identity preflight, handle SIGINT/SIGTERM with one idempotent shutdown path, and always drain the pool in `finally`. Only after those tests pass should deployment manifests be proposed.

## Verification

- Focused runtime/runner tests: PASS (19 tests).
- Full repository test suite: PASS.
- Kickoff drift: PASS.
- Harness cost: PASS (2735 / 10000).
- Sprint staleness: FAIL with the same eight unrelated pre-existing findings.
- Layer 0 truth-gate and Valor Brain: NOT RUN; their referenced paths are unavailable from this managed worktree.
