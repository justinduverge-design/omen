# Action plans from Codex's review comments (2026-10-02)

Source: `Direction/reviews/2026-10-02-codex-review-compilation.md`, which lists every Codex comment. This file turns the ones still open into plans.

**What was checked against `main` (`f8b09b84`):**
- every serious (P1) comment on server and database code;
- the lesser (P2) comments that touch security, privacy or the database plan;
- most iPhone serious comments, by spot check.

**Not checked:** web styling and accessibility P2s (web is paused); comments on planning docs (206); Android (paused).

"Open" means the problem is still in today's code. "Unclear" means a closer look is needed before planning a fix.

Nothing here has been changed. Each plan needs the founder's go-ahead before work starts.

## Order

| # | Plan | Why this position | Blocks |
|---|---|---|---|
| A | Database redo prerequisites | Production orders cannot finish without it | Steps 05, 06, 08, 09, 10 |
| B | Security and privacy on the live server | Real exposure today | — |
| C | League Office worker | Live weekly feature, silently wrong | — |
| D | Trade correctness | Users get empty or wrong trade results | — |
| E | Before Tuesday scoring returns | Off today; must be right before it is on | The redo's scoring ticket |
| F | iPhone | Owned by the phone session | — |
| G | Data pipelines | Not live; must be right before they feed a call | D4 |
| H | Web app | Paused; decide keep or retire first | — |
| I | Process: stop this happening again | Cheap, prevents a repeat | — |

B1 (the trade cache) was fixed in #516 on 2026-10-02. The C bug (accolade update commented out) is being fixed in a separate session the founder started the same day.

---

## A. Database redo prerequisites (database lane: Claude builds, Codex reviews)

| | Problem | Evidence | Fix | Done when |
|---|---|---|---|---|
| A1 | Once step 05 is on, "delete my account" fails halfway for anyone with a Ledger call | Codex #508. `src/routes/userPrivacy.js:236-262` deletes table by table, then `users`; step 05's guard refuses the last delete | The route calls `account_erase()` when the function exists, and keeps today's path when it doesn't. Tests for both | Deployed **before** step 05. Then steps 05 and 10 are applied back to back |
| A2 | The beta-report filter misses pasted ESPN cookies such as `ESPN S2 = …` | Codex #440. `src/routes/betaReports.js:6` matches only `espn_s2` | Match label variants (`espn s2`, `espn-s2`, `s2=`) and cookie-shaped values; test with real-looking samples | Shipped before step 09 |
| A3 | The 30-day purges exist but nothing runs them | Codex #508. No caller of `beta_reports_purge_expired()` or `retired_rows_purge_due()` in `src/`, `scripts/` or `Dockerfile.cron` | Add both to the cron container, daily, with a log line per run | Scheduled before steps 08/09 count as done; first run seen in the logs |
| A4 | A projection row can point at the wrong data record (another provider's, or a purge instead of an ingest) | Codex #508. Step 06 has only a foreign key on `ingest_event_id` | Step 06 trigger: the cited event must be an `ingest` for the same provider. Re-run the rehearsal on scratch, real Supabase and a restored copy | Step 06 re-verified before its production order |
| A5 | When the server moves to `league_memberships`, a new connection must start "followed" | Codex #397. `src/routes/leagues.js:426-430`: an empty follow table means nothing is followed | Part of the follows server ticket: writing a connection also writes a `connect` membership | Test: a one-league user connects and sees their league |

**Production order** (in `Blueprints/handoffs/2026-10-01-database-redo.md`):
1. 07, 01, 02, 03, 04, 06 (06 after A4);
2. A1 deployed;
3. 05 and 10 together;
4. 08 and 09 (after A2 and A3).

## B. Security and privacy on the live server (backend session; Codex reviews)

| | Problem | Evidence | Fix | Priority |
|---|---|---|---|---|
| B1 | Trade-finder cache is shared across users: another person's private rosters can be read | Codex #474. `src/routes/trade.js:724` key has no user id | Key by user id, plus a regression test | **Fixed in #516** (2026-10-02) |
| B2 | Yahoo routes return raw internal errors; the Yahoo diagnostic probe is open to every user | Codex #295, #296. `src/routes/yahoo.js:181,210,227,261` | Fixed messages in 5xx responses, detail kept server-side and sent to error tracking (#295 P2). Restrict or remove `/access-probe` | High |
| B3 | Monitoring and logs can receive personal data | Codex #353 ×2, #355. Yahoo error body (`providerErrors.js:76`); Sleeper usernames and league ids in paths (`sleeper.js:11`); `Error` objects bypass the log scrubber (`logging.js`) | Drop the Yahoo body, or allowlist fields. Replace path ids with placeholders. Scrub `Error`/Axios objects | High |
| B4 | Anyone can remove anyone's waitlist signup by email; an unsubscribed address can be re-added and emailed | Codex #269 ×2. `src/routes/waitlist.js:64` | Signed unsubscribe token; keep a suppression record | Medium |
| B5 | Ownership is trusted, not checked | Codex #371, #56 ×2: `findUserTeam` (`espn.js:188`) takes a requested ESPN team id if it exists in the league; Sleeper connect never checks league membership; draft picks are fetched before the access check (`sleeper.js:144`) | Check the ESPN team against the SWID owner. Check Sleeper membership at connect. Check access before fetching picks | Medium |
| B6 | An operator script reads **every** user's ESPN cookies | Codex #418. `scripts/espn-projection-live-proof.js:46` | Require an explicit user id; refuse without one | Medium. Do not run it until fixed |
| B7 | `/API/...` (capital letters) skips the general rate limit | Codex #77. `src/server.js:93` | Case-insensitive check, or mount the limiter on `/api` | Low |
| B8 | Sleeper scoring rules are being retained while the rights question was recorded as open | Codex #380. `scoringSnapshotResolver.js:61` `sleeper: true` | **Decided 2026-10-02:** keep them for all providers, record *why we use them*, and move them into a deletable compartment (prep session designs it) | Decided |

Sequence: B2, B3, B6 first (small and contained), then B5, then B4 and B7. B8 is decided (compartment).

## C. League Office worker (backend session; Slops Saloon bulletin)

| | Problem | Evidence | Status |
|---|---|---|---|
| C1 | The season $100 accolade update is inside a comment and never runs | `src/league_office_sync_worker.js:381` (literal `\n`) | **In progress** (separate session) |
| C2 | Two workers can run the same job; a job left "running" is never retried | Codex #441 ×2, #461 ×2. `claimQueuedJobs` (line 126) only selects; line 89 returns early for "running" | Open |
| C3 | One missing add or drop fails the whole week | Codex #463. Line 177 throws | Open |
| C4 | A missing ESPN projection becomes 0, so a fake line can be published | Codex #463. `leagueOfficeMessage.js` `Number(null)` passes `isFinite` | Open |
| C5 | Reruns rewrite a locked line and its lock time | Codex #463. Line 267 | Open |
| C6 | Accolade rows that don't exist yet are silently not written | Codex #463 (P2). The update matches 0 rows | Open |
| C7 | ESPN 403 is not treated as "reconnect needed" | Codex #441 (P2) | Open |
| C8 | On Tuesday/Wednesday the recap may describe the week before last | Codex #463 | **Unclear**: compare one real Tuesday run's logged weeks to the calendar |

Fix: an atomic claim (one `UPDATE … WHERE status='queued' RETURNING`), plus a 30-minute lease on "running". Publish whatever awards have evidence. Treat a missing projection as missing. Keep the first locked line. Upsert accolade rows. Map 403 to reconnect. Before C5 and C3, the founder confirms the intended behaviour (a locked line never changes; a missing award is skipped, not a failure).

## D. Trade correctness (backend session)

| | Problem | Evidence | Status |
|---|---|---|---|
| D1 | Trade finder returns nothing for ESPN and Yahoo leagues | Codex #474. Adapters return `roster_positions: []` (`espn.js:1235`, `yahoo.js:234`) | Open |
| D2 | Trade finder can suggest trades its own valuation rejects | Codex #474. No `fairnessGuard` passed from the route | Open |
| D3 | A `null` projection counts as 0 points | Codex #364, #49. `tradeValue.js:147` (`Number(null)` is 0) | Open |
| D4 | Three-team trades: the headline verdict is copied from team one; one-sided payloads pass; a bad scoring format returns 500 | Codex #473 ×3 | Open |
| D5 | Sleeper projections always use PPR scoring | Codex #259, #418. `sleeper.js:203` reads `pts_ppr` only | Open |
| D6 | A position with nobody on the roster isn't treated as a need; IR/taxi players can't be traded in; Yahoo reads every roster before the cap | Codex #474, #364, #259 | Open (P2) |
| D7 | The lineup search blocks the server for up to 2 seconds per call | Codex #259, #404. A time budget exists; the work still runs on the main thread | **Unclear**: measure at production traffic before choosing a worker thread |

D1 decides whether the trade finder works at all for two of three providers. **Decided 2026-10-02: fix it.**

## E. Before Tuesday scoring returns (folds into the redo's scoring ticket)

Tuesday scoring is off (`OMEN_CRON_SCORING_ENABLED` unset). The redo moves outcomes to `decision_outcomes`. Whoever builds that ticket must fix or avoid all of these:
- The dry-run flag is not passed to the cron container (#260).
- Feedback-only rows would be scored as losses (#261).
- Every league is scored as PPR, and stored formats don't match the scorer's names (#261, #369).
- New rows fall into legacy scoring (#369).
- A missing fact counts as zero (#369, `scoringContract.js:71`).
- Two-point conversions are counted three times (#371, #374).
- Incomplete field-goal bands are marked supported (#379).
- A blank fantasy-point value counts as zero (#260).
- A historical 404 is retried forever (#302).
- The score cache ignores the season type (#309).

**Done when:** each item has a test in the new scoring path.

## F. iPhone (the phone session; listed for it, not changed here)

**Open:**
- **#507:** the timing log prints a Ledger record id.
- **#459:** waiver analysis isn't cleared on league switch.
- **#377:** a slow request from before a league switch can overwrite the new league's screen (no request guard found).
- **#343:** the crash reason goes to Sentry unscrubbed.
- **#331:** Keychain tests fail in the unsigned release CI.

**Unclear:**
- #320: Ledger hidden when disconnected; Ledger not scoped to the league.
- #377: cross-provider switch when the server can't persist it.
- #317: recovery states routed to retry.
- #399: first swipe swallowed.
- #423: nested scroll.
- #310: unauthorized mapped to "not connected"; cancel race.
- #343: release symbolication.

**Fixed:** #198, #317 (reload after connect), #494 ×2, #450, #447.

There are also 32 lesser iPhone comments, mostly polish and accessibility; see the compilation. The phone session should take them in its own queue.

## G. Data pipelines (before any feeds a call)

Football data acceptance (#370 ×3, #381 ×3), football intelligence (#467 ×3, #470 ×3), weather (#495 ×2). None is on the live recommendation path today, except that football intelligence is attached to v3 Omen responses (#470 ×2: its confidence label is rewritten, and a timeout is hidden). Fix #470 first, because users can see it. The rest gate D4.

## H. Web app (paused)

There are 6 serious comments and about 33 lesser ones, mostly theming and contrast. The founder decides first whether the web app stays.
- **Decided 2026-10-02: the web app stays.** It is rebuilt on the shared backend after native is done, so these comments wait for that work.
- When web work starts, fix #121 first. Account deletion is unreachable for a user who never connected a league, and app stores require deletion to be reachable.

## I. Process: stop this happening again

1. **Read the review before merging.** Recorded in the decision log on 2026-10-02.
2. **A standing digest of open Codex comments.** A script lists every Codex thread on merged PRs that is neither resolved nor outdated, by area and severity. Run it at close-out; the compilation above is its first output.
3. **Answer each Codex comment.** Mark it resolved with the fixing commit, or reply with why it stands. Then the GitHub "resolved" flag means something.
4. **Docs comments.** The 206 Codex comments on planning docs overlap with the truth gate's 242 P0 findings. Handle them as one docs truth pass, not one by one.
