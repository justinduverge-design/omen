# Release readiness: Tuesday 2026-10-27 (started 2026-10-12)

Cadence is **every other Tuesday**. The 2026-10-13 cycle is closed on the engineering side (state: `Direction/2026-10-06-tuesday-beta-readiness.md` §2c-2e;
rollback: `Direction/2026-10-13-release-rollback-card.md`). This file is an index, not a report: it points at the file that holds each fact.
Status words: DONE / OPEN / FOUNDER / DEFERRED. Nothing is VERIFIED without device evidence.

## 1. What carries over from the 2026-10-13 cycle
| Item | Status | Where |
|---|---|---|
| Gate G: phone walk of every screen (incl. one real Yahoo call, ESPN/Yahoo cut line, trade call end to end) | FOUNDER | `Direction/2026-10-11-device-walk-2.md` |
| Sentinel baseline refresh KVM1 then KVM2 | FOUNDER | `Blueprints/handoffs/rate-limit-shutdown-checkpoint.md` |
| Scheduled restore proof passes on its own timer (Sun 2026-10-18 14:10 UTC); Gate D done-condition | OPEN | `Direction/2026-10-06-tuesday-beta-readiness.md` Gate D |
| Build 7: App Store Connect check, archive, upload | FOUNDER | readiness §2d |
| Retention `7 4 3` re-measure | OPEN, about 2026-10-18 | `infra/warehouse/backup/README.md` |

## 2. The section 10 decisions in plain words (original table: `2026-10-06-tuesday-beta-readiness.md` §10)
Four sign-offs, each a separate yes/no with a date; they exist so "ready" is never one blurry statement.
1. **Merge the warehouse foundation.** Already true (merged). Sign: yes.
2. **Create the private database and load 2026 data.** Already true (KVM1 Postgres 17, 1999-2026 loaded, backups running). Sign: yes.
3. **Enable API shadow reads.** Overtaken: the API reads the warehouse (`FOOTBALL_DATA_MODE=warehouse` since 2026-10-11). Sign: record as promoted; rollback is `shadow`.
4. **Ship beta screens that claim warehouse-data readiness.** The only real decision. Needs Gate G (phone) evidence. Safe to say yes with the accepted gaps listed in §2d (Yahoo projections are Omen's own; snap share blank; scoring held so Ledger reads Pending).
Also record: merged commit (`ab18af0` baseline), deploy run, rollback owner (founder, card above), observation window (Tuesday).

## 3. Candidate scope for 2026-10-27 (ordered; each ships only with its own evidence)
| # | Item | Status | Where |
|---|---|---|---|
| 1 | Fixes from the phone walk | OPEN | walk notes |
| 2 | Apply the projections schema, then ingest stage, then store read flag (tolerant code is already live) | DEFERRED | `Blueprints/handoffs/2026-10-11-warehouse-weekly-projections.md`, `infra/warehouse/projections.md` |
| 3 | Omen projections v1: fix P1 in PR #654, run the backtest on a restored warehouse copy; Omen leads only where the backtest says it does | OPEN | `Blueprints/specs/football-data/omen-projections-v1.md` |
| 4 | Provider reads: trade targets on League (G3), transactions (G4), roster slots (G5), Yahoo waiver status (G6), failed-team flags (G8) | OPEN, partial work in worktree `agent-adc5dd7f231affd7f` | `Blueprints/specs/football-data/omen-provider-capability-matrix-v1.md` |
| 5 | Specs to re-run: evidence-layer map, fantasy-week information architecture, provider discovery + probe plan | OPEN | `Direction/decision_log.md` 2026-10-12 entries |
| 6 | Challenger row ("provider says X, Omen says Y") in the decision-drivers model | DEFERRED until 3 | `Blueprints/specs/football-data/omen-decision-drivers-v1.md` |
| 7 | Kickoff times into the freshness policy (before December) | DEFERRED | `src/services/injuryFreshness.js` |
| 8 | SSH: one `omen` user on both VPSes | DEFERRED, week after the release | `infra/schedule/ACCESS.md` |
| 9 | Housekeeping: truth-gate P0 cleanup, sprint staleness | OPEN | `node ../../Blueprints/tools/truth-gate/truth-gate.mjs`, `scripts/check-sprint-staleness.js` |

## 4. Rules for this cycle
- **Freeze:** merge cutoff Monday 2026-10-26 afternoon; no code merges Monday evening through Tuesday (docs-only merges do not deploy). Rollback is the only exception.
- Fresh-agent review (`slops-code-review`) before every merge; gate every merge on `gh pr checks`. Never merge past an open P0/P1.
- Production changes (schema apply, timers, keys) are shown to the founder as exact commands first.
- Watch: Kuma #7/#8/#9, Discord alerts, `slops-canary` after each deploy.

## 5. Where things live (routing)
Timers and chain: `infra/schedule/TIMERS.md` · host access: `infra/schedule/ACCESS.md` · warehouse and backups: `infra/warehouse/` · decisions: `Direction/decision_log.md` (search, do not read whole) · provider reach: capability matrix above · this week's state: `Blueprints/handoffs/rate-limit-shutdown-checkpoint.md`.
