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
| Snap counts | offense snap share per player | player usage (next) |
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
4. [ ] **Production table.**
   - Revise `sql/pending/2026-09-26_football_intelligence_serving_review.sql`: its `signal_type` check
     allows only `coach_transfer_system_signal`.
   - Rehearse it (scratch, then the throwaway project), then apply with `apply_migration`. The founder
     approved creating it under plan B (2026-10-03).
   - Keep its rules: published rows only for authenticated users, and service-role writes.
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
8. [ ] **Snap share** in the usage line (snap counts join on `pfr_id`, which nflverse `players.csv`
   carries).
9. [ ] **Phone check with the founder,** then the beta decision.

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
