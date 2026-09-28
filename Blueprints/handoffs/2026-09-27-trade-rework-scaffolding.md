# Trade rework (lane T) — parallel-work scaffolding

**Date:** 2026-09-27
**Owner:** Claude
**Scope:** infrastructure only — no feature code. Prepares T1–T4 (`Direction/current_sprint.md` lane T,
spec `Blueprints/specs/omen-trade-rework-v1.md`) to be picked up independently.

## What exists now

One git worktree and branch per item, all forked from `main` at `66ba1029` (the commit that minted
lane T):

| Item | Worktree | Branch |
|---|---|---|
| T1-ThreeTeamCapability | `../omen-t1-three-team-capability` | `feat/t1-three-team-capability` |
| T2-FindATradeGenerator | `../omen-t2-find-a-trade-generator` | `feat/t2-find-a-trade-generator` |
| T3-SwipeCandidateReview | `../omen-t3-swipe-candidate-review` | `feat/t3-swipe-candidate-review` |
| T4-SavedTradeQueue | `../omen-t4-saved-trade-queue` | `feat/t4-saved-trade-queue` |

Each worktree's `node_modules` and `frontend/node_modules` are hardlink-copied from the primary
checkout (`cp -al`, same filesystem, near-zero cost) rather than re-installed, so each is immediately
runnable. Verified: `npm test` in `omen-t1-three-team-capability` passes **1261/1261**, confirming the
linked `node_modules` is independent and functional, not a shared/aliased directory that would let one
worktree's install corrupt another's.

## What this does not do

- Does not start implementation. Each worktree sits at the same commit as `main`; whoever picks up an
  item begins their own work there.
- Does not scaffold iOS/Android build state (`DerivedData`, Gradle caches) — those are per-checkout by
  nature of Xcode/Gradle and rebuild on first open; no action needed ahead of time.
- Does not resolve the T1/T2 shared-file risk — see the parallel-safety note in `current_sprint.md`
  lane T. Two worktrees existing does not make two uncoordinated changes to
  `src/services/tradeValue.js` safe; land T1 first or coordinate the function signatures before either
  PR touches it.
- T3 and T4's worktrees are reserved space only. They fork from the current `main`, not from T2's
  (unmerged) work — whoever starts T3 needs T2's payload shape first (rebase or wait for merge), and
  T4 needs both T2 and T3. Starting real work in the T3/T4 worktrees before their blockers clear means
  redoing it against a moving target.

## Housekeeping

Each worktree is disposable — `git worktree remove ../omen-t<n>-...` after its PR merges, or if an
item is descoped. `git worktree list` from the primary checkout shows all four alongside the
pre-existing `omen-football-data-research` and `omen-native-journeys-20260918` worktrees (unrelated to
this lane).
