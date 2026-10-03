# Football intelligence for the whole league — build plan and progress

**Started:** 2026-10-03 (Claude, after the database redo went live). **Sprint item:** `FI-LEAGUE` in
`Direction/current_sprint.md`. **Update this file as each box is ticked.** It is the running record, so a
new session can pick up the next unticked box.

## Why (founder, 2026-10-03)

The beta waits for this: "no beta until that's on there". Omen's calls must explain *why*, using real NFL
data on every team, coach and player. That means more than one hand-built proof: "Football
intelligence should be built for the whole game so all coaches and players come on."

## What the data supports (checked 2026-10-03)

| Data (nflverse unless noted) | Covers | Use |
|---|---|---|
| FTN charting 2024–2026 (CC BY-SA 4.0) | every play: motion, play-action, RPO, screen, no-huddle, box, blitz, rushers; 2026 through week 4 | team Scheme DNA |
| Play-by-play 2024–2026 | `posteam` per play; updated in-season | joins FTN to the offense (no 2026 participation file exists) |
| `games.csv` | head coach for every game | head-coach identities and changes (2026 new: BAL, CLE, LV, MIA, NYG, PIT, TEN) |
| Weekly player stats | targets, target share, carries, attempts… | player usage (**live**, A2) |
| Snap counts | offense snap share per player | player usage (step 8, live on merge) |
| `players.csv` + Sleeper player list | id crosswalk | **live**, A1 |
| Next Gen Stats | passing/receiving/rushing | **not admitted**: the source registry admits PBP, schedules, participation and FTN only; needs a terms check and a founder yes |
| Coordinators | — | **no open source**. Needs a small maintained list; ask the founder before adding one |

## Done

- [x] **A1 player crosswalk.** #539; production run 2026-10-03 16:55 UTC: 4,844 players, 13,040 provider ids
  (ESPN 4,823; Sleeper 2,193; Yahoo 1,180), 53 unresolved. Runs daily at 04:45 ET (cron image).
- [x] **A2 usage lines in the start/sit call.** #540, live. Each player gets a "Verified" line, e.g. "Kalif
  Raymond: 7.0 targets a game over the last 3 games (24% of the team's targets)." iOS shows it with no
  app build.
- [x] **League Scheme DNA engine, first run** (`src/services/footballIntelligence/leagueSchemeDna.js`,
  shipped with tests; see box 2):
  - **2025:** all 32 offenses available, in 9 s. Example: CHI play-action 18.7%, 2nd in the NFL
    (league average 14.0%).
  - **2026:** 2 of 32 available. The evidence policy needs at least 4 games and 120 plays, so most teams
    qualify after week 5.

## Next, in order

1. [x] **Performance.** The cause was memory, not the engine: all ~370 play-by-play columns were kept for a
   season. `parseCsv` now takes `columns` and keeps only the four used. 2025 + 2026: about 7 s, 0.9 GB peak.
   One team's window takes about 50 ms.
2. [x] **Tests.** `test/footballIntelligenceLeague.test.js`: the join (REG only, unmatched counted), the fact
   mapping (invalid QB location and odd values skipped), per-team DNA and league ranks, the 4-game evidence
   rule, and column projection.
3. [x] **Signals per team.** `src/services/footballIntelligence/teamSignals.js` (#546): a `team_system_identity`
   signal for all 32 teams, in the `football-intelligence-signal.v1` shape the Omen call and iOS already read.
   - Each signal carries the two most distinctive rates with NFL rank and league average.
   - The current season is used for **every** team only once at least 24 teams qualify, so a rank is
     always across the league; until then 2025 is used and labelled.
   - Head-coach changes from `games.csv` are stated as facts. A comparison with the coach's previous team
     waits for the new season's evidence.
   - Real output: "Chicago's offense in 2025: quarterback plays outside the pocket on 18.2% of plays
     (1st of 32); play-action on 18.7% of plays (2nd of 32)." Miami is flagged with a new head coach.
   - `team_system_change` (this season against last) is deferred until 2026 qualifies.
4. [x] **Production table.** Redo step 13 `football_intelligence_signals` (#547).
   - `signal_type` admits `team_system_identity` and `team_system_change`.
   - Rehearsed on scratch: 01–13, with the other twelve expected catalogs byte-identical.
   - Rehearsed on the throwaway: applied and rolled back through `apply_migration`. Verified there:
     published-only reads, anon refused, one published row per scope.
   - **Applied to production 2026-10-03** through `apply_migration`. `VERIFIED 13`; the catalog
     fingerprint equals the expected state in all 9 families.
5. [x] **Nightly job.** `src/omen_football_intelligence_cron.js`, daily 06:30 ET in the cron image.
   - Downloads games plus the current and previous season's FTN and play-by-play (play-by-play streamed
     line by line, four columns kept).
   - Builds per-team DNA one team at a time: 519 MB peak, against the container's 1 GB.
   - Publishes `team_system_identity` per team: unchanged content is skipped; changed content supersedes
     the published row. Refuses below 30 teams. Records a `data_events` ingest.
   - Real rows proven against the step 13 table on scratch (32 published, then a supersede).
6. [x] **Team identity mapping.** `src/services/footballIntelligence/nflTeams.js` (#546): `omen:team:<abbr>`, one
   per current franchise; provider aliases (JAC, WSH, LAR, OAK, SD, STL…) map onto it. Coach ids:
   `omen:coach:<slug>`.
7. [x] **Show it.**
   - Start/sit: one `observed_context` line per player's team, from the published summaries
     (`teamSystemLines.js`).
   - Omen call: `src/routes/omen.js` now sets `primary_player.omen_team_id` from the player's NFL team,
     so the existing hook reads the published `team_system_identity` (the serving repository's team lookup
     now asks for that type).
8. [x] **Snap share and trend** in the usage line (`src/services/playerUsage.js`, #551, branch
   `claude/usage-snaps-trends`). Snap counts join on `pfr_id`, read from nflverse `players.csv` at
   runtime (6 h cache, two columns; no schema change). A snap-count outage drops only the snap share.
   The trend compares the last 3 games with the player's earlier games that season and is stated only
   with 2+ earlier games and a meaningful change (volume ±2 a game and 25%; snap share ±10 points),
   e.g. "Up from 4.0 targets a game over the first 2 games." Live check (2026 through week 4): "Kalif
   Raymond: 7.0 targets a game over the last 3 games (24% of the team's targets), on the field for 66%
   of the offense's snaps." Trend lines first appear once a player has 5 games (week 6 on).
9. [ ] **Phone check with the founder,** then the beta decision.

## Tuesday 2026-10-06 plan (founder asked 2026-10-03: "how will we build it by Monday?")

The database design covers every screen and is live (steps 01–13). What remains is **server wiring**: the
code that writes to and reads from the new tables. It deploys continuously, and most of it needs no new
iPhone build.

| Day | Work | Screens |
|---|---|---|
| Sat 10-03 | FI-LEAGUE steps 5, 7, 8 (nightly publish, team-system lines, snap share); data export fix; SWID log redaction | Omen call, Start/Sit, Account |
| Sun 10-04 | Ledger write path: each Omen call writes `decisions` + `decision_factors`; Ledger and Ledger Detail read the new tables | Omen, Ledger |
| Sun 10-04 | League follows (plan A5): connecting writes `league_memberships`; the switch sheet reads `leagues` + memberships | Switch sheet, Command |
| Sun 10-04 | Saved trades: move #519's Redis store onto `saved_trades` | Trade |
| Mon 10-05 | Tuesday scoring writes `decision_outcomes` (week 5 is scored Tuesday morning); store projections as read (`projection_snapshots`); startup schema check | Ledger, Start/Sit |
| Mon 10-05 | Full phone walkthrough with the founder, including the deletion test (steps 05/10); release prep (RELEASE-OCT-6) | all |

- **Cut first if behind:** projection storage.
- **Risks:**
  - App Store review time for anything that needs a new build.
  - Scope for one session. Suggested to the founder: run a second session in parallel, for example on the
    Ledger and Tuesday scoring.

## Open questions for the founder

- Coordinators: OK to keep a small, sourced, maintained list (team, role, season, source URL)?
- Next Gen Stats: check its terms and admit it, or leave it out?

## Still open from earlier today

- **SWID in server logs.** The ESPN client logs the `fans/{SWID}` URL. Redact it before the beta.
- **Data export.** It fails on `moves.feature` and `moves.updated_at`, two columns that don't exist.
  Fix before the beta.
- **Phone deletion test** (steps 05 and 10), deferred by the founder to the very end.
- **Memberships.** Reconnecting a provider adds no league membership until the follows ticket (plan A5)
  is built.
