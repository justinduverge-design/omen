# Unmerged work inventory, 2026-10-13

**Why this exists.** On 2026-10-13 the founder authorized deleting stale worktrees. 59 clean, fully pushed worktrees were
removed. The ones below were kept because they hold work that is not on GitHub. Some of it may feed **Build 12**
(2026-10-20; see `Archive/build-12/2026-10-20-build-12-plan.md` once it is merged). Nothing here has been reviewed for merge.

**What is and is not safe.** Commits live in the shared repo object store, so a committed branch survives deleting its worktree
folder. Uncommitted files live only in the folder on this Mac. Deleting a folder below loses its uncommitted files.

**Rule for Build 12.** Anything pulled from here goes through the normal loop: fresh branch from main, diff review, PR.
Never archive an iOS build from any of these copies. They are 255 to 611 commits behind main.

## Codex worktrees (largest risk)

| Folder | Branch | Behind main | Unpushed commits | Uncommitted | Notes |
|---|---|---|---|---|---|
| `~/.codex/worktrees/tuesday-beta-ready/omen` | `codex/tuesday-beta-ready-20260929` | 448 | 23 | 14 files (`src/routes`, trade/start-sit/waiver route tests) | Trade context bound to season, canonical league context on lineup routes, platform read grants, readiness gate docs. Candidate source for Build 12 trade reliability. |
| `~/.codex/worktrees/a1eb/omen` | same branch (second checkout) | 448 | 23 (same commits) | about 3,579 files, mostly artifacts | Same commits as above. Uncommitted content not reviewed. |
| `~/.codex/worktrees/omen-native-journeys-20260918` | `codex/native-journeys-20260918` | 611 | 1 (`a39d2f26` ESPN connect tests assert the property) | 12 files (ios, android, Solutions) | Overlaps tonight's ESPN connect work. Compare before reusing. |
| `~/.codex/worktrees/three-beta-release-plan/omen` | detached | 4 | 3 (Build 12 planning docs) | 9 files (renumbering Build 10 to 12) | Planning docs for 2026-10-20. Not yet on GitHub. |
| `~/.codex/worktrees/beta-access-rescue/omen` | unknown | unknown | unknown | unknown | **No longer a git repository** (its worktree link was pruned during cleanup). Files are intact on disk. Inspect before deleting. |

## Claude agent worktrees (`.claude/worktrees/`)

All five hold a merge-from-main commit plus uncommitted contract fixture files. Probably stale, but unverified.

| Folder | Branch | Behind | Unpushed | Uncommitted |
|---|---|---|---|---|
| `agent-a1b9422b1d287ab74` | `claude/ledger-write-path` | 255 | 1 | 10 (`test/contracts`, ledger test) |
| `agent-a3a756238af0b0d81` | `claude/projection-layer1` | 255 | 1 | 9 (`test/contracts`) |
| `agent-a498b23ddb040ba64` | `claude/league-memberships` | 255 | 1 | 5 (`test/contracts`) |
| `agent-a5e34dd407840944e` | `claude/saved-trades-table` | 255 | 1 | 13 (saved-trades route and store tests, `src/routes`, `Blueprints/api-routes.md`) |
| `agent-af5d3a9823009c8c1` | `fix-fixtures-554` | 249 | 0 | 15 (`test/contracts`) |

The saved-trades-table checkout is the only one with likely real work. Check it against merged trade PRs before dropping it.

## Also kept
Git stashes: `stash@{0}` on `codex/espn-reconnect-alert-noise` and `stash@{1}` on `main` ("pre-pull-founder-work"). Not inspected.

## What was removed
59 worktrees, all clean with every commit already on GitHub. No branches were deleted. Three more held only untracked `node_modules`.
