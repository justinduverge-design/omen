# A7B Phase 3 code review — 2026-08-25

## Summary

Reviewed the complete local staging-shadow service, operator CLI, nine focused
tests, contract, and runbook for security, performance, correctness, and
maintainability. Verdict: **approve for the bounded local Phase 3 slice**.

## Findings resolved during review

1. The synthetic drill derived its baseline hash from re-serialized JSON. It now
   accepts the SHA-256 of the exact input bytes; the CLI computes that hash before
   parsing. This prevents formatting from creating false evidence identity.
2. Overlapping role roots were detected only after directory preparation. They
   are now rejected lexically before any write, then checked again after realpath
   resolution to catch symlink aliases. A focused regression test locks this.

## Security and correctness

- No network, credential, SQL, database, scheduler, deploy, or publication path.
- Dedicated-root, production-root, traversal, symlink, overlap, immutable-write,
  receipt/hash, schema, scope, quality, freshness, disk, and witness guards fail
  closed.
- Recovery validates exact backup bytes and the Phase 2 receipt before writing a
  fresh primary, and requires a matching witness observation.
- Corrections cannot conceal scope/ruleset changes or unexplained derived changes.

## Verification

- Focused: 9/9.
- Full backend: 688/688 using the existing checkout dependency runtime through
  `NODE_PATH`; the first unqualified run failed only because this fresh worktree
  intentionally has no untracked `node_modules`.
- `npm audit --omit=dev`: 0 vulnerabilities.
- Prompt Guard: 3 prompts, 2 cases.
- Sprint staleness: 0 findings in executed coverage.
- Syntax and `git diff --check`: clean.

## Non-claims

The KVM1/Pi names are locally simulated responsibilities, not live-host evidence.
Independent machines, live alert delivery, service installation, scheduling,
deployment, publication, and production scoring remain unreviewed and unapproved.
