# Football warehouse schedules checkpoint — 2026-10-05

## Outcome

The local, non-production warehouse foundation now admits the exact nflverse global
`games.csv` asset and can transactionally write canonical teams and one complete season
of schedules before player-week facts are loaded.

This checkpoint does not deploy, provision KVM1, contact Supabase, acquire live data, or
change an Omen customer route. It touches no decision-engine file.

## Landed in this slice

- Bounded acquisition of the exact allowlisted schedules asset, with content-type,
  declared-length, observed-byte, cancellation, and abort enforcement.
- Strict RFC 4180 adaptation with exact-byte SHA-256 provenance, ordered schema
  fingerprint, full source-row preservation, historical franchise aliases, explicit
  preseason exclusion, and no kickoff-timezone guessing.
- A completeness floor of 240 admitted games and 28 participating canonical teams for
  each requested season; the global asset must still cover all 32 current canonical
  franchises.
- A 32-team upsert-only writer that never deletes historical teams.
- A season-scoped schedules writer that stages and validates before replacement.
- Schedule correction fails closed when player-week facts, team-week facts, weekly
  rosters, or plays already exist. A future coordinated correction runner must reload
  those dependent families in the correct order.
- Failed run IDs remain bound to their original exact source hash; failure diagnostics
  cannot rebind provenance to different bytes.
- A PostgreSQL 17 integration proof covering schedules → canonical teams/games → a
  schedule-validated player-week fact, plus preservation on a blocked correction.

## Verification

- Focused acquisition/adapter/writer tests: `30/30` passed.
- PostgreSQL 17 schedule chain: `VERIFIED schedules -> canonical teams/games -> player-week PostgreSQL 17 chain`.
- All six warehouse schema/writer/source integration scripts passed.
- Full repository suite: `1965/1965` passed.
- `git diff --check`: passed.
- Kickoff drift: passed.
- Harness cost: passed (`2735` always-loaded tokens against `10000`).
- Sprint staleness: ran and reported eight pre-existing documentation/issue-state
  findings; this slice did not change them.
- Layer 0 truth-gate and Valor Brain validation: not run because the Layer 0 paths are
  absent from this managed worktree.

## Next safe slice

Add the injected current-season orchestration runner with database statement/lock
timeouts and deterministic run IDs. Keep live acquisition, KVM provisioning, cron
activation, API switching, historical backfill, backup commissioning, and production
deployment behind their own explicit gates.
