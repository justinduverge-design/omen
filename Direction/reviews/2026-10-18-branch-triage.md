# Branch triage — 2026-10-18

**Scope:** the ~30 local branches left in the Omen checkout after the 2026-10-18 prune (287 merged branches already
deleted). Evidence is `git cherry -v origin/main <b>` plus a check of `origin/main` for the *behavior*, not the text.
Only local refs were deleted; every deleted branch either has a copy on `origin` or is an ancestor of a merged PR head.
No remote branch was deleted.

## Deleted

| Branch | Unique commits | Verdict | Evidence |
|---|---|---|---|
| claude/ios-switch-concurrent-reload (#624, closed) | 3 | ALREADY ON MAIN | Closed as "merged as part of #636". Main `LeagueCarouselViewModel.swift:408` has the `lastCommittedPageID` guard; `CommandCenterView.swift:573` reloads with `async let`. |
| claude/ios-switcher-sheet-polish (#631, closed) | 4 | ALREADY ON MAIN | Same: landed via #636 (stacked). Main `OmenSwitchSheet.swift` uses the system sheet (`presentationDetents`). |
| rescue/android-google-siwg-signin (#452, closed) | 1 | SUPERSEDED/DEAD | Android paused (2026-09-30). Copy kept on `origin/rescue/android-google-siwg-signin` if Android resumes. |
| pr632 | 1 | ALREADY ON MAIN | Local tip is an ancestor of the merged PR #632 head (`d1d90c46`); `omenHold.js`, `omenTradeCandidate.js` on main. |
| pr716 | 11 | ALREADY ON MAIN | Ancestor of merged PR #716 head (`b2320524`); `telemetry.js`, `tradeSearchWorker.js` on main, `client/` gone. |
| claude/first-factor-experiment | 13 | ALREADY ON MAIN | PR #500 merged; all 31 files exist on main (8 since edited). |
| claude/phone-fixes-1 | 2 | ALREADY ON MAIN | PRs #502/#504 merged; lenient `football_intelligence` decode in main `OmenDecision.swift`. |
| codex/football-data-research | 1 | ALREADY ON MAIN | PR #467 merged; leftover commit only appends retired ledgers. |
| feat/t3-swipe-candidate-review | 2 | ALREADY ON MAIN | Landed via #501 (T3+T5 into main) and #633. |
| feat/t4-saved-trade-queue | 1 | SUPERSEDED | Main took another form: `src/services/savedTradesStore.js` + real Save (#633). Copy on origin. |
| feat/t5-three-team-builder-interaction | 2 | ALREADY ON MAIN | Landed via #501. |
| merge/trade-rework-t1-t5 | 6 | ALREADY ON MAIN | T1 three-team + T2 find-a-trade in main `src/routes/trade.js`; all commits on `origin/claude/trade-rework-integration`. |
| claude/kicker-weather (worktree `/private/tmp/claude-501/omen-kdef`) | 0 (patch-equivalent on main) | ALREADY ON MAIN | Worktree held only untracked `node_modules`; worktree removed. |
| claude/build-12-prs-retro (worktree `.codex/worktrees/three-beta-release-plan`) | 0 | ALREADY ON MAIN | Worktree clean; removed. |

## Kept

| Branch | Unique commits | Verdict | Why kept / next step |
|---|---|---|---|
| omen-projections-v1 (#654, open) | 2 | KEEP | Open PR. |
| codex/omen-native-lock-v2 | 18 | KEEP (active) | Committed today; Codex work, not touched. Worktree has 5 dirty files. |
| feat/provider-gap-g3-g8 | 1 (WIP, untested, +1438 lines) | WORTH LANDING (after work) | Main has no `leagueTradeTargets` / `leagueTransactions` / `leagueRosterBundle`. Pushed. Follow-up in `current_sprint.md`. |
| codex/root-cause-containment-20260928 | 24 | NEEDS FOUNDER (salvage review) | 27 files absent from main (`leagueContext.js`, `providerConnectionState.js`, provider-state SQL reviews, readiness validators). Main moved on (`providerErrors.js`); some may be superseded, migrations need Codex review. Pushed. Follow-up in `current_sprint.md`. |
| codex/tuesday-beta-ready-20260929 | 23 | NEEDS FOUNDER | Near-copy of root-cause-containment plus trade-find tests; **not pushed**; worktree `.codex/worktrees/tuesday-beta-ready/omen` has 14 dirty files (ledgers, `optimizer.js`, pbxproj). Decide with the item above. |
| codex/founder-closeout-existing-work | 1 | SUPERSEDED, delete on founder OK | 2026-09-17 witness-status/evidence fix; **not pushed**. Main has evidence on `OmenDecision.swift` but not `DesignSystem/OmenEvidence.swift`; also touches Android and retired ledgers. |
| codex/native-journeys-20260918 | 0 (on main) | ALREADY ON MAIN, worktree dirty | Worktree `.codex/worktrees/omen-native-journeys-20260918`: 12 modified files (Android + iOS). Founder decides whether that dirt matters, then `git worktree remove` + delete. |
| claude/league-memberships | 0 (on main, #554) | ALREADY ON MAIN, worktree dirty | `agent-a498…`: 5 re-recorded contract fixtures (test byproduct). Safe to discard on OK. |
| claude/ledger-write-path | 0 | ALREADY ON MAIN, worktree dirty | `agent-a1b9…`: 10 files, re-recorded fixtures + `ledgerDecisions.test.js`. |
| claude/projection-layer1 | 0 | ALREADY ON MAIN, worktree dirty | `agent-a3a7…`: 9 re-recorded fixtures. |
| claude/saved-trades-table | 0 | ALREADY ON MAIN, worktree dirty | `agent-a5e3…`: 13 files incl. **`src/routes/trade.js`** and `api-routes.md` — look before discarding. |
| fix-fixtures-554 | 0 (not ahead) | ALREADY ON MAIN, worktree dirty | `agent-af5d…`: 15 re-recorded fixtures. |

Not reviewed by rule: `infra/vector-logs` (main checkout, another session).
