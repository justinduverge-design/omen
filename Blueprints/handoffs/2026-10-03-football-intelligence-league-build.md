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
  uncommitted on `claude/football-intelligence-league` at the time of writing):
  - **2025:** all 32 offenses available, in 9 s. Example: CHI play-action 18.7%, 2nd in the NFL
    (league average 14.0%).
  - **2026:** 2 of 32 available. The evidence policy needs at least 4 games and 120 plays, so most teams
    qualify after week 5.

## Next, in order

1. [ ] **Performance.** The 2026 run took ~17 min against 9 s for 2025. Find the hot spot (suspect
   `buildFeatureWindow` scanning every fact per team; pre-partition facts by team). Also project only the
   needed play-by-play columns instead of parsing all 370. Target: a full run in well under a minute.
2. [ ] **Tests** for `leagueSchemeDna.js`:
   - join (REG only; unmatched counted);
   - fact mapping (invalid QB location skipped);
   - ranks;
   - the 4-game evidence rule respected.
3. [ ] **Signals per team** (new signal types, alongside the existing `coach_transfer_system_signal`):
   - `team_system_identity`: each rate with its league rank and average. Current season when available,
     otherwise last season, **labelled which**.
   - `team_system_change`: this season against last, once the current season is available.
   - Head-coach changes from `games.csv`: compare with the coach's previous head-coach team where one
     exists; a first-time head coach gets no comparison. **No causation claims.**
4. [ ] **Production table.**
   - Revise `sql/pending/2026-09-26_football_intelligence_serving_review.sql`: its `signal_type` check
     allows only `coach_transfer_system_signal`.
   - Rehearse it (scratch, then the throwaway project), then apply with `apply_migration`. The founder
     approved creating it under plan B (2026-10-03).
   - Keep its rules: published rows only for authenticated users, and service-role writes.
5. [ ] **Nightly job (cron image).** Download FTN, play-by-play and games; build the DNA and signals;
   validate; publish (supersede yesterday's rows); record a `data_events` ingest. Refuse to publish on a
   truncated source.
6. [ ] **Team identity mapping.** NFL abbreviation → `omen:team:*` (convention to settle; the tests use
   `omen:team:chicago-2026` and `omen:team:sea`). Watch the relocations: LV/OAK, LAC/SD, LA/STL.
7. [ ] **Show it.**
   - Start/sit call (`src/services/startSitDetail.js` `buildEvidence`): one "team system" line per
     player, e.g. "Chicago runs play-action on 18.7% of plays, 2nd in the NFL (2025)."
   - Omen call: the `football_intelligence` object, which `src/routes/omen.js` already attaches once the
     recommendation carries an `omen_team_id`.
   - iOS already renders both. **Do not touch `mobile/`**: the phone session owns it.
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
