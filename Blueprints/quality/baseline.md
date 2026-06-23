# Omen Quality Baseline

Recorded 2026-06-23 from candidate `8e5d56bc5f4238a66f68e4c50d3e8e43d0cbc433`
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
