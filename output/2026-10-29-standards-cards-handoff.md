# Handoff: STANDARDS cleanup cards in Omen (2026-10-29)

Source: Valor-Core `briefs/next-session.md` item 2, cards in Valor-Core `STANDARDS.md`.
Order asked: G, A, J, K, C, then D, E, B, F. One PR per card, each with a fresh-agent review.

## Done (PRs open, none merged)
| Card | PR | Note |
|---|---|---|
| G | #799 | Guard hook fails closed; blocks REST/GraphQL merges. Still open: GraphQL query read from a file. `.codex/hooks/guard-bash.sh` is gitignored, unchanged (card H). |
| A | #800 | ShellCheck by `#!` line (88 scripts). |
| J | #801 | PR backend tests trigger on every path tests read; `test/prQualityPaths.test.js` keeps it complete. |
| K | #802 | `scripts/db/rehearse-pending.sh` in Migration CI; both rehearsals refuse non-local Postgres. Codex review requested. Finding: `sql/pending/2026-09-26_football_intelligence_serving_review.sql` is a no-op on production (redo step 13); Justin to decide on retiring it. |
| C | #803 | Steward checks write DOWN check_crashed on a crash. Docker parity harness not run. Pi re-sync after merge. |
| D | #804 | closeout runs Valor-Core `ops/valor-brain` (VALOR_CORE or walk-up); truth-gate retired; kickoff and prompts say `npm run closeout`. Follow-up: Omen's own copy `scripts/check-valor-brain.mjs`. |
| E | #805 | `--help` guard on 21 ops scripts and merge-pr.sh; refusals on stderr; exit 2 for usage. KVM1/Pi re-sync after merge. |

G, A, J, K change guards or CI: Justin merges. Merge through `scripts/merge-pr.sh` only.

## Left
- **B**: replace the 7 hand-written `parseArgs` with `node:util` `parseArgs` (rules 4, 5).
- **F**: header check in CI, headers on the ~26 scripts without one (rule 1). E already gave the 15 headerless
  `ops/` scripts a description inside their `--help` text; F can count that or add a comment header too.

## Merge state (later on 2026-10-29)
Merged through `scripts/merge-pr.sh`: #799 G, #800 A, #801 J, #803 C, #804 D, #805 E, #802 K.
Then #806 B. #807 F was merged while its base was still E's branch, so it went into that branch and not
main. It was re-landed into main as #808 (card F only, 33 files). All nine cards are on main as of `9b36ef63`.
Lesson: `merge-pr.sh` doesn't check the PR's base. A stacked PR must be retargeted, and the retarget confirmed, before merging.
Valor-Core: L (#6), H (#7) and I (#8) were already merged. Valor-Core #10 (weekly coverage, STANDARDS fixes) is open.
Pi/KVM1 re-sync is needed for C and E. Finished worktrees to remove by hand (the hook blocks `--force`):
`omen-script-tests`, `omen-steward-crash`, `omen-closeout-paths`, `omen-script-help`, `omen-rehearse-pending`.

## Remaining Omen fixes (now unblocked)
- Guard hook: a GraphQL merge whose query is read from a file (`-F query=@file`) gets past it.
- closeout.sh: valor-brain NOT RUN still exits 0. Decide whether NOT RUN should fail or be a separate status.
- Steward checks: a crash before the ERR trap (the first `date` call) is still unrecorded.
- `scripts/check-valor-brain.mjs` is a second copy of Valor-Core's validator. CI needs a way to get it.
- Hook false positives: `git +push ... main` matches any command that pushes and also mentions `origin/main`;
  `--force` matches `git worktree remove --force`.
- Docker parity for card C: Justin offered his Windows machine (SSH, LAN or Tailscale). He needs to give the host name.

## Facts for the next session
- STANDARDS.md miscounts card C's premise (the steward checks already had `set -Eeuo pipefail`); fix in Valor-Core.
- Local Biome isn't installed in fresh worktrees; use `npx -y @biomejs/biome@2.5.15` (CI's version) before pushing.
- `check-sprint-staleness.js` fails on `main` today, so `npm run closeout` exits 1 regardless.
- Docker wasn't running on the Mac this session.
