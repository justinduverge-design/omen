# Omen

> See the result before it happens.

Fantasy football managers make the same handful of decisions every week: who to start, who to pick up, who to
drop, and whether a trade is worth it. The information to make those calls well is out there, but it's spread
across a dozen sites, buried in numbers, and usually reduced to one projection you're asked to trust.

**Omen does the work and gives you one answer.** Connect your ESPN, Yahoo or Sleeper league, and each week Omen
names the single best move for your team. It tells you what to do, why, what could go wrong and how sure it is,
in plain English. It's free.

Omen is the first product from Slops Saloon, the product studio of Valor Ventures LLC.

---

## What it does

- **Omen of the Week.** One call per week, and it can be any kind of move: a start/sit, a pickup, a drop or a
  trade. Omen picks whichever is worth the most to your team right now, and shows its evidence, its risk and a
  confidence band.
- **Trade Analyzer.** **Build** a trade with real rosters (two or three teams), let Omen **find** one by scanning
  every roster in your league for deals that help both sides, or **type** in an offer you got. Save it, send it,
  record how it went, or share it with a link.
- **League and Waivers.** Standings, matchups and every manager's roster. Waivers ranks pickups with reasons,
  pairs each one with the drop it costs and plans around bye weeks.
- **Command Center.** The home screen. Omen's advisors each give a short read on your team, your matchup,
  waivers and trades, and you choose what to dig into.
- **Ledger.** Omen keeps score on itself. Every call is recorded with what you did and how it actually turned
  out.

## How it thinks

Omen doesn't pretend to out-predict the experts. It explains the projections honestly, adds what it can see that
they miss, and admits when a call is close.

- **Your league's real rules.** Scoring (PPR, half-PPR, standard or custom), lineup slots (FLEX, SUPERFLEX) and
  locked players are read from your league, never assumed.
- **Sight, Omen's own read.** Every player gets a second opinion built from Omen's own football data: usage,
  Vegas totals, the opponent, role changes and weather. Sight moves the provider's projection 30% of the way
  toward its own view. It never overrides the provider, and a low-confidence read never moves anything.
- **Value over replacement.** A player is worth what he scores above the best player you could pick up for free
  at his position.
- **Trades that work for both teams.** A suggested trade has to improve both lineups by at least half a point a
  week, and neither side can give up more long-term value than it gains. No lopsided offers.
- **Honest confidence.** Calls are labelled **coin flip**, **leaning** or **confident**, never a percentage. A
  close gap is a coin flip, because a projection is barely better than a guess when two players are within a
  point. "Confident" requires a clear gap *and* real evidence, such as a usage trend or a confirmed injury.
- **No answer beats a made-up one.** A move built on missing, stale or sample data is thrown out. If nothing
  good is left, Omen says so.
- **Graded honestly.** The Ledger scores each call against the player Omen passed over, using your
  league's scoring. Easy calls, like benching a player who's ruled out, don't pad the record.

## How it's built

```
        iPhone app (SwiftUI)        web (React)
                     \                /
              API: Node.js + Express, behind Nginx
             /            |              |                \
   ESPN / Yahoo /     Supabase        Redis        Football warehouse
   Sleeper adapters   (accounts,      (cache)      (Omen's own NFL database)
                      connections,
                      the Ledger)
```

- **The app.** A native iPhone app is the main product. A React web app runs alongside it (the Trade Analyzer,
  shared trades, the public pages and the core screens). An Android app is built but paused.
- **One shape for three providers.** Adapters turn ESPN, Yahoo and Sleeper leagues into the same roster format,
  so everything after them works the same for any league. A connection that can't actually serve data is
  reported as broken, not shown as an empty league.
- **The API.** It covers Omen's weekly call, trades, waivers and lineups, the league, the Ledger, the
  connections, and data export and deletion. Every response the app relies on is locked by a schema and test
  fixtures, so a backend change can't quietly break a screen. Full list:
  [`Blueprints/api-routes.md`](Blueprints/api-routes.md).
- **The football warehouse.** Omen keeps its own database of the NFL: games, rosters, weekly stats,
  play-by-play back to 1999, weather and injury reports. It also maps every player's ESPN, Yahoo, Sleeper and
  NFL IDs to one person. Public facts, third-party projections and Omen's own numbers are kept in separate
  layers, so it's always clear whose number is whose. It refreshes every morning.
- **The infrastructure.** Two cloud servers handle production and encrypted backups, and the backups are
  restore-tested every week. A small fleet of Raspberry Pis does the monitoring and alerting. Everything talks
  over a private Tailscale network.
- **The language model is optional.** A private model can phrase the explanation, but the math makes every
  decision and the app works without it.

## What Omen won't do

- It won't charge you. Omen is free.
- It won't log or show your ESPN login details. You can export or delete your data from the app at any time.
- It won't mix sample data into a real answer without labelling it.
- It won't turn a guess into a percentage.

## Status

Omen is in a friends beta on TestFlight for iPhone. New builds ship when they're ready. What's in each build:
[`Direction/release/builds/`](Direction/release/builds/).

---

## For developers

| Folder | What's inside |
|---|---|
| [`src/`](src/) | The API: routes, decision logic, provider adapters and scheduled jobs |
| [`mobile/`](mobile/) | The iPhone app (and the paused Android app) |
| [`warehouse/`](warehouse/) | The football warehouse: schema and table map |
| [`frontend/`](frontend/) | The web app |
| [`test/`](test/) | Tests and the API contract locks |
| [`sql/`](sql/) | Supabase schema history |
| [`infra/`](infra/), [`deploy/`](deploy/hostinger/) | Servers, schedules, backups and deploy |
| [`extension/`](extension/) | Browser extension that connects an ESPN account |
| [`Direction/`](Direction/) | What we're building and why. Start at [`Direction/map.md`](Direction/map.md) |
| [`Blueprints/`](Blueprints/) | Specs, architecture and playbooks |
| [`Brand/`](Brand/), [`logos/`](logos/) | Brand system and logos |

Each folder has its own README.

```bash
npm install && npm test     # backend tests
npm start                   # API on :3000 (env vars: deploy/hostinger/ENV-INVENTORY.md)
```

Open `mobile/ios/OmenIOS/OmenIOS.xcodeproj` in Xcode for the iPhone app. Coding agents start from `CLAUDE.md` /
`AGENTS.md`.

---

ESPN, Yahoo, Sleeper and the NFL are trademarks of their owners. Omen is not affiliated with or endorsed by any
of them.
