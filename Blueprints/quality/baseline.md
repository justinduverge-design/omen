# Omen Quality Baseline

Recorded 2026-06-30 from candidate `a2a4aca1a301be6ba394acf9eafbeaf702628984+worktree`
using Node `v24.11.0` and npm `11.6.1`.

| Signal | Result |
| --- | --- |
| Backend tests | PASS — 427/427 |
| Root audit (`moderate`) | PASS — 0 vulnerabilities |
| Production audit (`high`, dev omitted) | PASS — 0 vulnerabilities |
| Primary frontend build | PASS |
| Legacy client build | PASS |
| `git diff --check` and conflict-marker scan | PASS |

Gate result: **PASS**. The Yahoo live draft tracking contract ratchets the Slops-owned baseline upward; future candidates must
keep or increase the passing test count, introduce no new audit advisories at or above the threshold,
and keep both builds and diff checks green.
