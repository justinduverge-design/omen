# Stats and scenarios that help fantasy managers — catalogue

**Date:** 2026-10-10
**Kind:** research and options. Nothing here is approved to build. Items marked **spec** are already covered
by `omen-fantasy-metrics-v1.md` or `omen-trend-evidence-v1.md`.

Every item below is scored against the data Omen can lawfully use today.

**Data status key:**
- **Have:** admitted data already in the warehouse or the football-intelligence path.
- **League:** the user's connected-league data (rosters, settings, schedule), within each provider's terms.
- **Caveat:** possible, but there's a rights, terms or approval question first.
- **No source:** no lawful free source; don't build.

Admitted fields worth knowing about, confirmed in the live 2026 files:
- **`games.csv`:** `spread_line`, `total_line`, moneylines, `away_rest` / `home_rest`, `roof`, `surface`,
  `temp`, `wind`, `div_game`, starting QB ids and head coaches.
- **Warehouse:** spread and total are already stored in `football.nfl_games`.

## 1. Weekly start/sit

| Stat or scenario | What it tells the manager | Data |
|---|---|---|
| **Implied team total** (from spread and total) | how many points the team is expected to score, the single best game-environment number | Have. Show it as "game environment", never as betting advice |
| **Blowout risk** (spread ≥ 10) | the favourite's RB gains late carries; the underdog's pass-catchers gain volume | Have |
| **Shootout flag** (total ≥ 50) | volume and TD upside for both passing games | Have |
| **Pace and pass rate over expected (PROE)** | plays per game in neutral situations; how pass-heavy the offence really is (`xpass`, `pass_oe`) | Have |
| **Teammate-out redistribution** | "when the WR1 sat, his targets went 40% to X, 25% to Y", from with/without splits | Have |
| **Backup QB starting** | downgrade (or upgrade) for the receivers, from starting QB ids and with/without splits | Have |
| **Short week / travel** | Thursday road games and west-to-east early kickoffs | Have (rest days, stadium, kickoff time) |
| **Wind and cold** | wind ≥ 15 mph lowers deep passing and kicking | Caveat. Completed games have it; upcoming games may need a forecast source, and OpenWeatherMap's commercial terms are unconfirmed |
| **Pressure matchup** | the QB's line against the defence's pressure: sacks and QB hits from play-by-play, rushers and out-of-pocket from FTN | Have |
| **Red-zone offence** | team TD rate per red-zone trip: who finishes drives versus settling for field goals | Have |
| **Garbage-time filter** | stats with win probability outside 10–90% removed, so late meaningless points don't inflate a player | Have |
| **Matchup fit (curveball rule)** | how the player does in the situations this defence creates | Have, **spec** (trend evidence) |
| **Floor, ceiling, boom/bust** | safe play versus swing for a win | Have, **spec** |
| **Injury status** | Out / Doubtful / Questionable | League (the provider's player status). The nflverse injuries file isn't admitted |

## 2. Waivers (League → Waiver)

| Stat or scenario | What it tells the manager | Data |
|---|---|---|
| **Breakout detector** | rising role share + rising xFP + low roster % in this league | Have + League, **spec** (role chart, xFP) |
| **Handcuff value** | the RB2's role, and what happened historically when this team's RB1 missed games | Have |
| **Streaming defence** | opponent's sacks allowed, turnover rate and implied total | Have |
| **Streaming kicker** | implied total, dome, how often the offence stalls in the red zone (field goals per trip) | Have |
| **Streaming QB** | opponent pass defence over expected, pace, implied total | Have |
| **Schedule look-ahead** | next 3 weeks and the fantasy playoff weeks: opponent fantasy points allowed over expected, by position | Have |
| **Drop candidates** | falling role, low xFP, bye-week clashes on this roster | Have + League |
| **FAAB bid guide** | what this league usually pays for similar pickups | Caveat. Needs the league's transaction history. Sleeper's free API is non-commercial (2026-08-24 review), so this is provider-terms-dependent |

## 3. Trades (the front door)

| Stat or scenario | What it tells the manager | Data |
|---|---|---|
| **Rest-of-season value** | xFP-based outlook × remaining schedule, scored in this league | Have + League, **spec** (xFP) |
| **Buy-low / sell-high** | points over expected and TD over expected, with the trend label: sell coincidence, buy an event-backed role | Have, **spec** |
| **Value over replacement in this league** | scarcity from this league's roster slots and scoring (superflex, TE premium, starting slots) | League |
| **Playoff-weeks value** | weeks 15–17 schedule strength, which matters more than September | Have |
| **Bye-week fit** | whether the trade creates a bye-week hole on this roster | Have + League |
| **"Would they accept?"** | the other manager's roster needs, so the offer helps both sides | League |

## 4. Dynasty

| Stat or scenario | What it tells the manager | Data |
|---|---|---|
| **Vacated opportunity, room age, draft capital** | where next year's targets and carries open up | Have, **spec** |
| **Age curves by position** | when RBs, WRs, TEs and QBs typically peak and fall, from 1999 onwards | Have after the backfill |
| **Rookie role growth** | late-season usage climb as a signal for next year | Have |
| **Contracts and cap space** | job security and team spending room | **Left out** (founder, 2026-10-10) |

## 5. Season and league scenarios (League destination, Small Council)

| Stat or scenario | What it tells the manager | Data |
|---|---|---|
| **Playoff odds** | simulated rest-of-season using this league's schedule and the outlooks above | League + Have |
| **Luck meter** | all-play record, and points for versus the weekly median: "you're 3–4 but the 4th-best team" | League |
| **Bye-week planner** | upcoming weeks where too many starters are off | Have + League |
| **Thursday lock reminder** | players who lock early this week | Have + League |
| **Format adjustments** | superflex, TE premium, 6-point passing TDs, PPR level: every number scored the league's way | League, **spec** (xFP via `calculateContractScore`) |

## 6. Scenario playbook for the Omen call

Ready-made situations the weekly call should recognise. Each triggers from data Omen holds:

1. **Star teammate ruled out:** promote the main beneficiary from with/without splits.
2. **Backup QB starting:** adjust the receivers; check the backup's history and depth tendency.
3. **Big favourite / big underdog:** RB versus pass-catcher shift from the spread.
4. **Shootout or slog:** from the total, plus pace.
5. **Bad weather:** deep passing and kickers down (completed-game data; forecast caveat).
6. **Short week on the road:** small downgrade, shown only if the backtest supports it.
7. **Coaching or scheme change:** Scheme DNA shift, and a "likely cause" candidate.
8. **Role change:** the role chart's alert, plus a waiver pickup if the player is available.
9. **Injury return:** expect a reduced role for 1–2 weeks (role share history after absences).
10. **Fantasy playoff push:** weight weeks 15–17 schedule in trade and waiver calls from mid-season.

Every scenario's adjustment is tested in the same backtest as the metrics. Scenarios that don't improve
next-week accuracy are shown as context only, never as a reason for the call.

## 7. Not available (don't build)

Routes run and yards per route run, receiver separation and other tracking data, man/zone coverage shells,
PFF grades, practice-report injury designations from the nflverse injuries file, player props, and
contracts. In-season snap counts are pending their rights review.

## 8. Suggested order after FM-XFP and FM-TREND

1. Teammate-out redistribution and backup-QB scenarios (biggest weekly decisions, all admitted data)
2. Implied team total, blowout and shootout flags (cheap; already in the warehouse)
3. Schedule look-ahead including the fantasy playoffs, and streaming DST/K/QB
4. Value over replacement in this league, and the luck meter
5. Playoff odds
