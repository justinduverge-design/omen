# Omen Quality Baseline

Recorded 2026-06-23 from candidate `e66e9d7c7ae29212af36d947428991b20b45f25b`
using Node `v24.11.0` and npm `11.6.1`.

| Signal | Result |
| --- | --- |
| Backend tests | PASS — 356/356 |
| Root audit (`moderate`) | PASS — 0 vulnerabilities |
| Production audit (`high`, dev omitted) | PASS — 0 vulnerabilities |
| Primary frontend build | PASS |
| Legacy client build | PASS |
| `git diff --check` and conflict-marker scan | PASS |

Gate result: **PASS**. Phase 1.5g.1 ratchets the Slops-owned baseline upward; future candidates must
keep or increase the passing test count, introduce no new audit advisories at or above the threshold,
and keep both builds and diff checks green.
