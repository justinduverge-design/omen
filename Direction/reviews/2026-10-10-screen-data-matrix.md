# Sep 13 canvas — screen-by-screen data matrix (2026-10-10)

**What this is.** Three read-only code reviews (journey A: Command / Omen call / Start-Sit; journey B: League /
Ledger / Connect / Account; journey C: Trade) of where each Sep 13 screen's data comes from **in code on `main`
today**. Nothing was run on a device or in production. "Unverified" means nobody checked it live.
**Companion:** `Direction/2026-10-06-tuesday-beta-readiness.md` (gates F and G still open).

## Headline

- The football warehouse is read by **one app route**, Start/Sit detail, for **one query** (player-week usage), in
  **shadow** mode. Supabase still answers. Every other screen reads providers, Supabase or the server's own
  computation. `nfl_games`, `nfl_plays`, `nfl_weekly_rosters`, `nfl_player_weekly_opportunity` and
  `football_metric_*` have **no reader** in `src/`.
- No commit touched `mobile/` after Oct 1 (build guard #512). Every iOS-side finding from the Oct 1 device walk is
  still open in code or unverified.
- Redo steps 01–12 were applied to production on Oct 3: Ledger, memberships, beta reports, export v2 and account
  erasure sit on new tables, so several Oct 1 server findings are probably fixed but **unverified live**.

## Gaps where the warehouse is the right fix (the step-5 slices)

| # | Slice | Screens it improves | Warehouse tables |
|---|---|---|---|
| S5-1 | Serve usage and opportunity from the warehouse (promote Start/Sit to `warehouse` mode) and add usage corroboration to the Omen call's confidence and to Waiver Watch reasons | Start/Sit, Omen call, Waiver Watch, League waivers | `nfl_player_weekly_stats`, `nfl_player_weekly_opportunity` |
| S5-2 | Player identity crosswalk for Trade compare: ESPN and Yahoo roster keys currently return `unresolved_players` (422) because the resolver reads only Sleeper-keyed ids | Trade build, three-team, find | `football_player_ids` |
| S5-3 | Ledger scoring from `nfl_player_weekly_stats` via the crosswalk, replacing the GitHub CSV + name fuzzing in the Tuesday cron (scoring is held, so every row reads Pending) | Ledger | `nfl_player_weekly_stats`, `football_player_ids` |
| S5-4 | Matchup/DvP from a grouped warehouse read instead of a request-time GitHub CSV | Omen evidence | `nfl_player_weekly_stats` |
| S5-5 | Game context facts (rest days, wind, roof, spread) and injury corroboration | Omen evidence, quiet-week, confidence | `nfl_games`, `nfl_weekly_rosters` |
| S5-6 | QB grade evidence row (RAT-QB v0) | Omen evidence | `football_metric_runs/values` |
| S5-7 | Deadline / week conversion for the wire and Activity | League | `nfl_games` |

## Gaps where the fix is not the warehouse (the page-fix list)

**Wrong or fake claims (fix first):**
- League table draws the playoff cut line under the user's own row, not the real cut; the payload carries no cut
  position (`OmenScoutScreens.swift:1413`). Add `cut_rank` to `league-overview.v1`.
- "Form · last 5" header with every row's `form` nil (`:382`, `:1390`).
- Trade Find: **Save is a stub that always says "Saved ✓"** (`TradeFind.swift:285`, `.kt:253`); the real
  `POST /api/trade/saved` exists. The screen is unreachable anyway (no entry point; founder decision open).
- Trade share card prints a verdict; the Part 9 lock says no verdict. The public snapshot also exposes it.
- Omen evidence: the artboard's WEATHER, REST and "what else was considered" copy has no producer
  (`alternatives` is always `[]`; weather is `stub` unless an API key is set; `openMeteo.js` is not imported).
- Waiver route ignores the on-screen league (`waivers.js:286`), so Command and League can disagree (Oct 1 P1-5).
- Connect: confirmation still names only the first league; "Send to support" only dismisses; `unaffected: []`
  hard-coded.

**Provider gaps:** Yahoo has no projections (`yahoo.js:55`); ESPN scoring unverified; waiver deadline is always
null; no live game clock or starters-left; no lineup lock time; trade targets permanently "unread".

**Engine/contract:** `CALL n OF m`, rejected alternatives, a roster-wide optimal payload for Start/Sit, band and
risk on Ledger detail (columns exist).

**Unverified live (device walk 2 must check):** one-call-per-team-week Ledger, memberships (one league per
platform), report storage, passkey/switcher chrome, Command vs League waiver agreement.

## Rights note

Backfill and serving nflverse data requires CC BY 4.0 attribution **in the app** (`infra/warehouse/backfill.md`).
No screen carries it today; add an "About / Data sources" line before the beta.
