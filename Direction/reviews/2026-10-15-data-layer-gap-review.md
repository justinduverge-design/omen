# Data layer: what is not built, and what could be better — 2026-10-15

Read-only review. Evidence: live Supabase queries (2026-10-15), the code on `main`, and the repo's own
plans. Nothing was changed. "Built" means code exists on `main`; it does not mean it is proven on a device.

## Where it stands

Supabase holds people and the Ledger; the KVM1 warehouse holds football data; provider data is read live.
The 13-step redo **is applied** in production (the 2026-10-03 audit still says 0 of 13: that document is
stale, and so was the 2026-10-09 warehouse handoff, which says 2026 only and `shadow` mode. The 2026-10-27
readiness plan says 1999-2026 loaded and `FOOTBALL_DATA_MODE=warehouse` since 2026-10-11. Three documents,
three realities: unverified here because this session cannot reach the tailnet).

## Gaps, most important first

| # | Gap | Evidence | Why it matters | Fix |
|---|---|---|---|---|
| 1 | **No call has ever been graded.** The Ledger exists to prove what Omen said and whether it held up. | 21 decisions; 13 outcome rows, all `data_incomplete` / `legacy_estimate` / no result; Tuesday scoring is held by `OMEN_CRON_SCORING_ENABLED` (off) | Without grading there is no accuracy number, no band calibration, and the confidence bands (confident / leaning / coin flip) are unvalidated. | Enable scoring once the scoring-rules writer (#2) lands; run `omen_ledger_outcomes_dry_run.js` first. Needs founder yes. |
| 2 | **Nothing saves a league's scoring rules.** | `league_scoring_rules` 3 rows, all the step 11 one-time backfill; `grep` finds no writer in `src/` | Grading a call against the league's own scoring needs the rules. Blocks #1. | Redo spec §7 ticket 6: write the rule set when its hash is new. |
| 3 | **No call records whether the person followed it.** | `decision_actions` 0 rows | The Ledger's "followed?" column is always empty; no feedback loop. | Find out whether the app ever sends it (route exists in `ledger.js` / `moves.js`). |
| 4 | **Credential health is never re-checked or stored.** | 7 of 9 connections `unknown`; `valid` is set only at connect time; `needs_reauth` is computed in `platforms.js` responses but never persisted | A dead ESPN cookie still reads `valid`; one known account is already rejected by ESPN. | Persist the failure when a provider read returns 401/403; re-check on a schedule. |
| 5 | **The legacy `moves` table is still written.** | 5 `moves` rows in the last 7 days beside the new Ledger | Two sources of truth, which is what the redo set out to end. | Freeze `moves` after #1 (needs its own approval). |
| 6 | **No startup schema check.** | Redo spec §7 ticket 9; no `information_schema` check in `src/` | Schema drift is found by a user hitting an error, not at boot. | `/api/ready` degraded on drift. |
| 7 | **No automated data-quality checks.** | Only Kuma heartbeats on the ingest | A job can succeed and load nothing or load bad rows. | Task 4. |
| 8 | **Provider reads still missing:** transactions, ESPN/Yahoo league slot lists, Yahoo waiver status/ownership, per-team Yahoo failure flag; provider lock flags unused | provider matrix, `Direction/2026-10-27-beta-readiness.md` item 4 | Recommendations can name a locked player; Trade borrows the user's slots. | PROVIDER-READS in the sprint; lock flags are the cheapest. |
| 9 | **Player-ID coverage is patchy.** | Yahoo 1,180, Sleeper 2,195 of 5,972; 56 Sleeper unresolved; all Yahoo ids `provider_supplied` | Cross-provider joins fail silently for the rest. | Task 5. |
| 10 | **Single off-host backup on an expiring box.** | `known_issues.md`: KVM2 expires 2027-05-06; weekly restore proof has no heartbeat monitor | A hardware or billing event loses the only copy. | Decide a new home before the expiry; add the heartbeat. |
| 11 | **Duplicate football data.** | `nflverse_weekly_stats` (Supabase) vs warehouse | Two copies drift; step 14 is slated for retirement. | Retire after warehouse-primary proof (own approval). |
| 12 | **Docs disagree with reality** (see top) | audit, handoffs, readiness plan | Agents and people act on the wrong state. | Truth-gate cleanup is already an open sprint item; I would add a "state as of" probe script. |

## Why the beta is running with these

The user-facing path (read the league live, produce a call, show it honestly) does not depend on grading,
credential health or scoring-rule storage. The honest-fallback design hides the gaps from users. What is
missing is the **measurement and accountability layer**: whether Omen is right, whether connections are
alive, and whether data loaded correctly. With 7 users and 21 calls the beta is small enough to run on the
founder watching; it will not be once it grows.

## Suggested order

1. #2 scoring-rules writer, then #1 enable grading (together they make the Ledger real).
2. #4 credential health, because it silently degrades every ESPN and Yahoo user.
3. #7 data-quality checks (task 4) and #6 startup check.
4. #8 provider reads, starting with lock flags.
5. #3, #5, #9, #10, #11, #12 as capacity allows.
