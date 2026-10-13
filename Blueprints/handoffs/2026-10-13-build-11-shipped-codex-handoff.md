# Build 11 shipped: what to watch, and where Build 12 work picks up

**Date:** 2026-10-13. **Audience:** Codex and any later session. **Founder decision:** Build 11 is the last upload for about
two weeks. Next build number is **Build 12** (planned Tue 2026-10-20 at the earliest; founder expects trade work in about two weeks).

## Build numbers
| Build | What it was |
|---|---|
| 9 | Stale checkout. Lacked fixes that were already on main. |
| 10 | Cut from current main (PR #659). Superseded by 11 before founder released it to testers. |
| 11 | ESPN first-login fix (PRs #660, #662) plus server status logging (#661). Main commit `22c7f172`. Uploaded 2026-10-12, delivery `af666c05-0388-48b4-af48-298ec92f5235`. |
| 12 | Next. The old "Build 10" plan is renamed to Build 12 in the Codex worktree `three-beta-release-plan` (uncommitted there). |

`CURRENT_PROJECT_VERSION` on main is **11**. Bump to 12 only in the PR that ships Build 12. Archive only from the main checkout
`slops-saloon/omen`; other iOS copies on this Mac are 126 to 611 commits behind (see `2026-10-13-unmerged-worktree-inventory.md`).

## WATCH LIST for Build 11 (do this before choosing Build 12 scope)
1. **Rodys's ESPN account and any new ESPN connection.** He has one league (13338821 is the founder's league, not his), signs in with
   MyDisney plus an SMS code, and on Build 9/10 landed on the League ID box and a "400". The cause is a theory: ESPN's fan lookup
   answered 404 ("fan not found") twice, one second apart, right after a brand-new login. Build 11 waits for the cookie pair to settle,
   tries 4 times two seconds apart, re-reads cookies on each retry, and offers Check again (3 rounds).
2. **How to check:** on `omen-prod`, `docker logs omen_api --since <window> | grep -E "fan.api.espn.com|ESPN league discovery failed|ESPN connect validation failed"`.
   Logs carry the HTTP status only (no cookies, no ids). A fan lookup of 200 followed by the toggle screen means the fix worked.
   Repeated 404, or 401/403 on "connect validation failed", means it did not; read that status before changing anything.
3. **Nobody had tried ESPN connect on Build 11 as of 2026-10-13 21:40 UTC** (no fan lookups in the logs since the deploy).
4. Known unproven: a first-time login on a fresh account was never reproduced. The founder declined creating a test account.
5. GlitchTip: a 404 from the fan lookup is reported (issue #2, "ESPN API returned HTTP 404") and pings Discord once. Build 11 can add up to
   16 events to that one issue per stuck tester. If it gets noisy, mark that 404 `expected` in `src/adapters/espn.js` (cost: lose the signal if ESPN breaks it for everyone).
6. Open alert, not from this work: `Omen football: witness_mismatch` (2026-10-13 05:48 ET). The witness data lives on command-center under
   `/var/lib/omen-football-witness` and needs sudo to read. Not checked.

## Codex: where the work is
- Planning docs for 2026-10-20 (renumbered Build 12) are uncommitted in `~/.codex/worktrees/three-beta-release-plan/omen`.
- 23 unpushed trade-context commits sit on `codex/tuesday-beta-ready-20260929` (448 commits behind main). Candidate for trade reliability.
- Trade is the unfinished feature. Founder: partner selection and manual trade still failed on the phone on 2026-10-12.
- Loop: fresh branch from main, diff review in a fresh agent, PR, merge on green, never past an open P0/P1.
