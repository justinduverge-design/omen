# Omen: Fantasy Football Decision Layer

> See the winning move.

Omen is a free fantasy football app from Slops Saloon. Connect your ESPN, Yahoo or Sleeper league, and every
week Omen tells you the single best move for your team: **what** to do, **why**, **what could go wrong** and
**how sure it is**, in plain English. Behind that one sentence sits:
- a provider-neutral decision engine
- Omen's own football warehouse, with nflverse history back to 1999
- Omen's own player read (Sight)
- a Ledger that grades every call against what actually happened

**Last refreshed:** 2026-10-17. When this file disagrees with the files it links to, trust the linked files.

---

## Where Omen is today

- **Stage:** friends beta on TestFlight. Build 11 is in testers' hands. Build 12's backend is in production, and
  its app release is in progress. During the beta a build ships when it is ready, and a fixed schedule returns at
  the public launch. Build records: [`Direction/release/builds/`](Direction/release/builds/).
- **Platform:** the native **iPhone app** (SwiftUI) is the product. The Android app (Kotlin) is built but paused.
  The React web app is secondary.
- **Price:** free. There is no billing, no subscription and no Stripe.
- **Providers:** ESPN, Yahoo and Sleeper are all live.

## Features

| Feature | What the user gets |
|---|---|
| **Omen of the Week** (MVP Move) | The main event: **one call per week**. It may be a start/sit, a pickup, a drop or a trade, whichever is worth the most to this team this week. Each call comes with its evidence, its risk and a confidence band. |
| **Trade Analyzer** | The front door. **Build** a trade (two or three teams, real rosters), **find** one (Omen scans every other roster in the league for deals that help both sides), or **type** an offer you received. Trades can be saved, marked sent, have their outcome recorded, and be shared through a public link with a preview card. |
| **League** | Standings, matchups, other managers' rosters and a league switcher for people in several leagues. |
| **Waivers** (inside League) | Pickups ranked with reasons. Each is paired with the drop it costs, and byes are planned around. A FAAB budget is suggested only when the league's waiver system is verified. |
| **Start/Sit detail** | The full comparison behind a lineup call. |
| **Command Center** | The home screen. Omen's advisors (one voice, with seats labelled by subject) each give a short read on the team, the matchup, waivers and trades, and you pick what to dig into. |
| **Ledger** | Omen's track record for your league: every call, what you did, and how it turned out. |
| **Account and privacy** | Sign in with Apple, a passkey or an email code. Export or delete your data in the app. |
| **Demo Mode** | A clearly labelled sample league, used for App Store review. |

Draft Assistant is not part of this version.

## How Omen decides (the math, briefly)

Omen's stance is to **explain** provider projections honestly, not to claim it beats them.

- **Start from the league's own numbers.** Each provider's projection and the league's actual scoring rules
  (PPR, half-PPR, standard, custom) and lineup slots (FLEX, SUPERFLEX and so on) are read from the provider, not
  assumed. Locked players are never moved, swapped or dropped.
- **Sight, Omen's own read.** It is computed in the warehouse for QB, RB, WR, TE, K and DEF from usage, Vegas
  totals, the opponent, role changes and weather, with weights that shift by phase of the season. In decisions,
  Sight pulls the provider projection 30% of the way toward itself
  (`blended = provider + 0.3 × (sight − provider)`). A low-confidence Sight (kickers, for now) never moves a
  number. On held-out 2022–2025 seasons, Sight v2 correlates with actual points about as well as or better than
  production (for example RB 0.535 vs 0.506).
- **Value over replacement (VORP).** A player's value is points above the best freely available player at the
  position. The replacement levels depend on the scoring format.
- **Trades must be fair both ways.** A found trade must lift **both** lineups by at least 0.5 points a week. And
  neither side may give up more season-long value than its weekly gain justifies. That stops "+0.0 for them" and
  star-for-depth offers.
- **Choosing the weekly call.** Every eligible candidate is scored on one scale, and the highest score wins. Any
  candidate built on missing, mock, stale or cross-league data is thrown out. If nothing survives, Omen says so
  honestly instead of inventing a move.
- **Confidence is a band, never a percentage.** It is **coin flip** (gap under 1.5 points), **leaning** or
  **confident**. "Confident" needs a gap of at least 4 points **and** observed corroborating evidence, such as a
  usage trend or a verified injury, because a projection gap alone is right only about 52% of the time when it
  is within a point.
- **The Ledger grades honestly.** Each call is scored against the player it passed over, on the league's own
  scoring. Easy calls against an OUT or bye player don't count toward the hit rate. Trades are graded over the
  week, the next 4 weeks and the season so far.
- **Narration is optional.** A private self-hosted model (Gemma) can phrase the reasoning. It is grounded in the
  deterministic labels, never chooses the move, and the app works without it.

Specs: [`Blueprints/specs/omen-decision-engine-v2.md`](Blueprints/specs/omen-decision-engine-v2.md) and
[`Blueprints/specs/football-data/`](Blueprints/specs/football-data/).

## Data: the football warehouse

Omen keeps its own football database (PostgreSQL 17 on KVM1) instead of trusting any one provider. It has five
layers:

| Layer | Holds |
|---|---|
| ledger | Where every row came from: ingest receipts and schema versions |
| identity | Teams, players and coaches, with each player's ESPN, Yahoo, Sleeper and GSIS IDs mapped to one person |
| facts | Public nflverse data: games, rosters, weekly stats, play-by-play back to 1999, weather forecasts and observations, and injury reports. Never edited |
| provider | Third-party projections, stored and labelled separately |
| sight | Omen's own versioned metrics, graded against what happened |

Ingest runs every day at 07:15 ET. A successful run triggers an encrypted backup, and a restore is proven every
week. User data never goes in the warehouse; it stays in Supabase. Table map: [`warehouse/map/`](warehouse/map/).

## Backend and API

```
iPhone app (SwiftUI)          web app (React / Vite)
        \                      /
       Nginx (TLS) on KVM1, a Hostinger VPS
                   |
       Express API, Node.js  (src/server.js)
        |             |             |               |
 ESPN / Yahoo /   Supabase       Upstash Redis   Football warehouse
 Sleeper adapters (auth, RLS,    (short cache,   (Postgres 17 on KVM1)
                  Vault secrets,  trade shares)
                  Ledger)
```

- **Adapters** turn ESPN (cookie-based), Yahoo (OAuth) and Sleeper (public API) into one normalized roster
  shape, so nothing downstream knows which provider a league came from. A connection that exists but can't
  serve data is reported as unusable, never treated as an empty league.
- **Main API routes** (the full list with contract versions is in
  [`Blueprints/api-routes.md`](Blueprints/api-routes.md)):

| Area | Routes |
|---|---|
| Omen of the Week | `POST /api/omen/mvp-move`, `POST /api/omen/feedback` |
| Trade | `POST /api/trade/compare`, `GET /api/trade/find`, `GET /api/trade/roster`, `/api/trade/saved/*`, `/api/trade/share/*` |
| Waivers and lineup | `GET /api/waivers/analysis`, `GET /api/optimizer/lineup`, `GET /api/start-sit/detail` |
| League | `GET /api/league/overview`, `GET /api/league/standings`, `GET /api/leagues`, `POST /api/leagues/active` |
| Ledger | `GET /api/moves`, `GET /api/moves/:id` |
| App shell | `GET /api/dashboard/summary`, `GET /api/dashboard/quiet-week`, `GET /api/session`, `GET /api/system/min-version` |
| Connections | `/api/platforms/*` (ESPN, Sleeper, status and disconnect), `/api/yahoo/*` (OAuth and leagues) |
| Privacy | `GET /api/user/export`, `DELETE /api/user/delete` |
| Public | `GET /api/health`, `/api/ready`, `/api/version`, `/api/demo`, `/api/players/search` |

- **Contracts are locked.** Every response shape the app depends on has a JSON schema, recorded fixtures and a
  lock in `test/contracts/`. The iPhone tests decode the same fixtures, so a server change can't quietly break a
  screen.
- **Jobs:** credential health (every 6 hours; a refused login is deleted and the connection marked
  needs-reconnect), Tuesday scoring for the Ledger, nflverse stats, the player crosswalk, and the daily warehouse
  ingest.

## Infrastructure

- **KVM1** (Hostinger VPS): production. It runs the API and cron containers, Nginx, the warehouse and the
  football-data pipeline. Deploys go through a self-hosted GitHub Actions runner.
- **KVM2** (Hostinger VPS): encrypted Restic backups, the weekly isolated restore proof, and the private Gemma
  model.
- **Raspberry Pi fleet:** **Command Center** (Pi 4) runs Uptime Kuma, Beszel, GlitchTip and Discord alerting.
  **Steward** and **Sentinel** (Pi Zero 2 W) handle routine automation, passive security watching and
  host-posture checks.
- Every admin and machine-to-machine connection goes over **Tailscale**. No host accepts password or root SSH.
  Maintenance runs Friday mornings, never Monday night through Tuesday. Details: [`infra/`](infra/).

## Rules that never bend

- Omen is free.
- ESPN cookies are never logged or shown.
- Mock data is always labelled.
- Confidence is a band, never a percentage.
- Production database changes, deploys and store actions each need the founder's explicit approval.

Full list: [`Direction/facts-of-record.md`](Direction/facts-of-record.md).

---

## Repository map

Every major folder has its own README that explains what's inside and how to work in it.

| Folder | What's in it |
|---|---|
| [`src/`](src/) | The Express API: routes, decision services, provider adapters, middleware and scheduled jobs |
| [`test/`](test/) | Node test suite (`npm test`) and the API contract locks |
| [`mobile/`](mobile/) | The iPhone app (`ios/OmenIOS/OmenIOS.xcodeproj`) and the paused Android app |
| [`warehouse/`](warehouse/) | Warehouse migrations, table map and verification |
| [`sql/`](sql/) | Supabase schema history and the 2026-10 database redo |
| [`infra/`](infra/), [`deploy/hostinger/`](deploy/hostinger/), [`ops/command-center/`](ops/command-center/) | Hosts, schedules, backups, production deploy and Pi monitoring |
| [`frontend/`](frontend/), `client/` | React web app and the small shell built into the Docker image |
| [`extension/`](extension/) | Omen ESPN Connect browser extension (Chrome and Edge) |
| [`scripts/`](scripts/), `evals/` | Repo checks, gates, generators and prompt-safety evals |
| [`Direction/`](Direction/) | What and why: the map, rules, sprint, decisions, known issues and build records |
| [`Blueprints/`](Blueprints/) | How: specs, architecture, playbooks, prompts and handoffs |
| [`Brand/`](Brand/), `logos/`, `design/` | Brand system, marks and the native design canvases |
| `Legal/` | Provider and brand-use requests and agreement drafts |
| [`References/`](References/), [`Solutions/`](Solutions/), `Archive/` | Research and evidence, finished reports, and retired material |

**Start here:** [`Direction/map.md`](Direction/map.md) (what to read for any task), then
[`Direction/context.md`](Direction/context.md). Coding agents start from `CLAUDE.md` / `AGENTS.md`.

## Local development

```bash
npm install
npm test                 # backend tests, including the contract locks
npm start                # API on port 3000 (needs Supabase and the env vars in deploy/hostinger/ENV-INVENTORY.md)
cd frontend && npm install && npm run build
```

For the iPhone app, open `mobile/ios/OmenIOS/OmenIOS.xcodeproj` in Xcode. Secrets are injected at runtime and
never committed.

---

Platform trademarks belong to their owners. Omen is not endorsed by, sponsored by or affiliated with Yahoo,
Sleeper, ESPN, Disney or the NFL.

Built by [@justinduverge-design](https://github.com/justinduverge-design). *Omen: see the winning move.*
