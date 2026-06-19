# Corvus Quality Baseline

Recorded 2026-06-19 from candidate `886d32cf760b01def62258efd8fd979aabc37f2e`
using Node `v24.17.0` and npm `11.13.0`.

| Signal | Result |
| --- | --- |
| Backend tests | PASS — 312/312 |
| Root audit (`moderate`) | PASS — 0 vulnerabilities |
| Production audit (`high`, dev omitted) | PASS — 0 vulnerabilities |
| Primary frontend build | PASS |
| Legacy client build | PASS |
| `git diff --check` and conflict-marker scan | PASS |

Gate result: **PASS**. This is the initial Slops-owned baseline; future candidates must keep or
increase the passing test count, introduce no new audit advisories at or above the threshold, and
keep both builds and diff checks green.
