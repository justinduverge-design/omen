# Handoff — 2026-08-24 — A7B Phase 1 local raw vault

**Branch:** `codex/a7b-football-data` from `origin/main` `088ba89`

**Assignment:** `ATA-20260824-01`

**Status:** Phase 1 complete locally; A7B remains open and returns to a founder gate before Phase 2

**Production effect:** none — not pushed, merged, deployed, scheduled, provisioned, or connected to scoring

## Outcome

A7B now has its first executable slice: a dependency-free local command that captures the fixed, rights-reviewed nflverse `stats_player` release into an immutable SHA-256-addressed raw object plus a complete retrieval manifest, and replays one exact manifest into a new non-promoted evidence directory.

The command deliberately has no arbitrary URL, provider credential, database, timer, production-root, `latest`, publication, scoring, or ADP mode.

## Files changed

- `src/services/footballData/rawVault.js` — allowlist, bounded fetch, immutable raw/manifest storage, rights/schema/path checks, exact replay.
- `scripts/football-data.js` — local `capture` and `replay` CLI.
- `test/footballDataRawVault.test.js` — capture, idempotency, schema, source, size, path, rights, tamper, and replay coverage.
- `scripts/README.md` — safe-run contract and commands.
- `Direction/reviews/2026-08-24-a7b-phase1-code-review.md` — security/correctness verdict.
- `Direction/current_sprint.md`, `Direction/agent_inbox.md`, `Direction/decision_log.md` — task gate and progress truth.
- `Blueprints/playbooks/skill-usage-ledger.md`, `Blueprints/done/LEDGER.md` — procedure receipts.

## Evidence

### Intended RED → GREEN

- RED: `node --test test/footballDataRawVault.test.js` failed because `../src/services/footballData/rawVault` did not exist.
- GREEN: focused suite **10/10** passes all Phase 1 cases, including identical-byte deduplication, noncanonical season input, 404 deferral, schema drift, non-allowlisted source, 64 MiB bound, directory-symlink escape, exact replay, raw tamper, rights tamper, and stale-rights/production-root refusal.

### Real non-production capture and replay

Temporary evidence root: `/tmp/omen-a7b-live.psGF8Z` (resolved by macOS to `/private/tmp/...`).

- Source asset: nflverse `stats_player_week_2025.csv`.
- Bytes: `8,656,387`.
- SHA-256: `e5e0615b3d96a3eaebfaee91e55afb4a4e7fe0caf057454177bcd7d6ad4bcfc2` — exact match to A7's 2026-08-24 research evidence.
- Repeat capture: `raw_created: false`; a new observation manifest was created while the raw object remained single-instance.
- Hardened replay snapshot: `nflverse-data.stats_player.20260825T012428307Z.e5e0615b3d96a3ea`.
- Replay manifest SHA-256: `d1c8f58d26e4c637f65a705e0e359097efc04339a2f876d42ea350a3c60016aa`.
- Replay receipt: `/private/tmp/omen-a7b-live.psGF8Z/replays-hardened/20260825T012437346Z-d1c8f58d26e4c637/receipt.json`; `promoted: false`.

### Broader quality

- Full backend suite: **668/668**. Rerun with the original checkout's existing dependency runtime because git worktrees do not contain untracked `node_modules`; no dependency install or package change.
- `npm audit --audit-level=moderate`: 0 vulnerabilities.
- `git diff --check`: clean.
- Code/security review: APPROVE, no P0/P1 (`Direction/reviews/2026-08-24-a7b-phase1-code-review.md`).
- Sprint-staleness checker: no findings in the checks that ran; its coverage excludes prose-vs-prose contradictions and human evaluation of `Done when:`.
- Workspace checker: HEAD stayed at kickoff base `088ba89`; it reported the other registered worktrees and this branch's 11 expected A7B paths. This isolated worktree remained the only tree used for A7B edits.

The first attempted full run without `NODE_PATH` was invalid and is not counted: it failed on missing worktree-local modules such as `express` and `@sentry/node`, not test assertions. The correctly configured rerun is the evidence run.

## Contracts

### Manifest

`omen-football-raw-manifest.v1` records collector version, snapshot ID, exact source URL/release asset, retrieval timestamps, HTTP status/ETag/Last-Modified/content type, byte length, raw SHA-256 and relative path, CC BY rights record and review date, season coverage, source header fingerprint/columns, and correction parent.

### Replay receipt

`omen-football-raw-replay.v1` records exact manifest hash/path, raw hash/length, schema fingerprint, verification results, and `promoted: false`.

No HTTP/API or frontend contract changed.

## Skills and procedure receipt

- **Skills invoked:** `run-slops-saloon` for Omen runtime routing at kickoff (no UI driver action was applicable); `engineering:code-review` for security, performance, correctness, failure, and maintainability review.
- **Required local SLOPS skills unavailable through this session's registered skill catalog:** `slops-repo-inspector`, `slops-tdd`, `slops-data-ingest-plan`, `slops-git-flow`, `slops-quality-baseline`, `slops-code-review`, `security-privacy-evidence`. Their substantive checks were followed through repository inspection, an intended RED, the approved A7 architecture, isolated worktree, focused/full tests, audit/diff, and the dated review.
- **Conditional N/A:** UI/design/mobile skills (no UI); recommendation Done (no recommendation); provider-recovery skills (no provider credential or private API); release/ship/canary (nothing merged or deployed).
- **Procedure gap:** a new worktree cannot see the original checkout's untracked `node_modules`, so the documented `npm test` substitute needs either a dependency-runtime note or a standard `NODE_PATH` command. No package install should be inferred as the fix.

## Remaining A7B work and next gate

A7B's overall `Done when:` is not met. Phase 2 still needs identities, versioned offensive/kicker/DST facts, at least four varied replay weeks, and independent-reference gates. Later phases still need staging correction/source-loss/schema-drift/KVM1/Pi evidence and A4's no-write rehearsal.

The next action is a separately approved Phase 2 slice. No automatic continuation into it is authorized by this handoff.
