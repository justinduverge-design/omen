# A7B Phase 1 — code and security review

**Date:** 2026-08-24

**Scope:** `src/services/footballData/rawVault.js`, `scripts/football-data.js`, and `test/footballDataRawVault.test.js`

**Verdict:** APPROVE for the bounded non-production Phase 1 slice — no P0 or P1 findings

## Summary

The change adds a local-only collector for the single rights-reviewed nflverse `stats_player` release and an exact-manifest replay command. It has no server mount, timer, production root, database, credential, dependency, publication, scoring, or ADP path.

## Security and correctness review

| Dimension | Result | Evidence |
|---|---|---|
| Source/SSRF boundary | PASS | Callers choose only `dataset=stats_player` and a normalized season. The HTTPS host, release tag, asset pattern, attribution, and licence record are fixed in source; the CLI accepts no URL option. |
| Resource bounds | PASS | Streaming reads stop at 64 MiB and reject an oversized declared or observed body. The real 2025 input is 8,656,387 bytes. |
| Filesystem containment | PASS | Production root and descendants are refused; relative paths are canonical; immutable files use exclusive creation; existing directory symlinks that escape the selected root are rejected before nested writes. |
| Immutability/idempotency | PASS | SHA-256 is the raw object key. Identical retrievals reuse one raw object and create distinct timestamped observation manifests. Conflicting bytes at an immutable path fail closed. |
| Replay integrity | PASS | Replay requires one exact manifest path, refuses `latest`, validates the allowlist/rights/release/manifest self-consistency, then re-hashes raw bytes and schema before creating a non-promoted run. |
| Failure behavior | PASS | 404 is `SOURCE_DEFERRED`; source errors, timeouts, content-type drift, missing/duplicate required columns, stale rights, tampering, and unsafe paths fail before promotion. No fallback source exists. |
| Secrets and privacy | PASS | No credential or user data is accepted, stored, or logged. Output contains only local paths, source metadata, byte counts, and hashes. |
| Performance | PASS for Phase 1 | Memory is bounded to 64 MiB; disk duplication occurs only for deliberate replay evidence. There is no hot request path or scheduler. |

## Findings resolved during review

1. **Canonical season construction:** numeric strings with leading zeroes initially produced a noncanonical release URL even though the stored season normalized. Fixed by constructing the asset and URL from the normalized integer; regression-tested.
2. **Directory-symlink escape:** lexical containment alone allowed `raw/` to be a symlink outside the selected root and could create directories there before failing. Fixed with component-by-component directory validation; regression-tested against an escaping symlink.
3. **Manifest self-consistency:** replay now checks collector version, canonical raw path, snapshot ID, successful HTTP evidence, every reviewed rights field, required source columns, and the recorded schema fingerprint before reading output.

## Residual limitations — accepted because they define later A7B phases

- The allowlist enables only `stats_player`; PBP, schedules, rosters, team stats, and kicking remain unimplemented.
- Phase 1 validates the raw envelope and header contract, not row-level identity, uniqueness, cardinality, completed-game coverage, offensive derivation, kicker/DST rules, or independent scoring totals.
- A local SHA-256 receipt is not an independent witness. Pi verification, staging storage, correction drills, KVM1 recovery, alerts, and publication remain absent.
- Existing-directory symlinks are rejected, but this single-operator local spike is not presented as a hostile multi-user filesystem sandbox.

No release, production, provider, database, or endpoint claim is made.
