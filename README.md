# Omen: Fantasy Football Decision Layer

> See the winning move.

Omen is a free fantasy football app from Slops Saloon. You connect an ESPN, Yahoo or Sleeper league, and Omen
tells you the best move for your team this week: what to do, why, what the risk is and how confident it is. It
explains all of this in plain English, not math.

**Last refreshed:** 2026-10-17. Dates and build numbers in this file go stale quickly. When this file disagrees
with the files it links to, trust the linked files.

---

## Where Omen is today

- **Stage:** friends-and-family beta on TestFlight (iPhone). Build 11 is in testers' hands. Build 12's backend
  is in production, and its app release is still open. A build ships when it is ready, not on a fixed day.
  Per-build records: [`Direction/release/builds/`](Direction/release/builds/).
- **Platform:** a native iPhone app (SwiftUI) is the product. The Android app (Kotlin) exists but is paused. The
  React web app is secondary.
- **Price:** free. There is no billing, no subscription and no Stripe. MVP Move is not a paid tier.
- **Providers:** ESPN, Yahoo and Sleeper are all live. "Connected" is not treated as "usable": Omen checks that
  a connection can actually serve data, and it says so when it can't.

## What the app does

| Area | What it is |
|---|---|
| **Omen of the Week** (MVP Move) | The main event. Omen makes **one call per week**, and the type isn't fixed: a start/sit, a pickup, a drop or a trade. |
| **Trade Analyzer** | The front door. Lets you **build**, **find** or **type** a trade against real rosters. A two-sided fairness check makes sure both teams gain, and locked players are never offered. |
| **League** (with Waivers) | Standings and other managers' teams. Waivers ranks pickups with reasons, pairs each one with a drop and plans around byes. |
| **Command Center** | The home screen. Omen's advisors (one voice, with seats labelled by subject) each give a short read, and you choose what to dig into. |
| **Ledger** | Omen's track record. Each call is graded against the player it passed over, on the league's own scoring. Trades are graded over the week, the next 4 weeks and the season so far. |
| **Sight** | Omen's own player read, built from its football warehouse (v2 since 2026-10-17). It covers QB, RB, WR, TE, K and DEF and uses Vegas totals, opponent, role changes and weather. It is blended into decisions, with the provider's projection still leading. Confidence is shown as a band, never a percentage. |
| **Demo Mode** | A labelled sample league, used for App Store review. It stays until the first approval. |

Draft Assistant is not part of this version.

## How it runs

```
iPhone app (SwiftUI)          web app (React / Vite, secondary)
        \                      /
         Nginx (TLS) on KVM1, a Hostinger VPS
                   |
         Express API, Node.js  (src/server.js)
          |            |              |                 |
  ESPN / Yahoo /   Supabase        Upstash Redis     Football warehouse (Postgres on KVM1)
  Sleeper adapters (auth, RLS,     (cache)           nflverse facts, player index, weather,
  (src/adapters)   Vault secrets)                    provider projections, Sight
                                                           |
                                  scheduled jobs (systemd timers, chained; see infra/schedule/TIMERS.md)
```

- **KVM1** runs production: the API, the cron container, Nginx, the football warehouse and the football-data
  pipeline. Deploys run through a self-hosted GitHub Actions runner.
- **KVM2** stores the encrypted Restic backups and runs a weekly isolated restore proof. It also hosts a private
  Ollama/Gemma model. The model is optional: the app works without it.
- **The Raspberry Pi fleet** is the monitoring side. **Command Center** (Pi 4) runs Uptime Kuma, Beszel,
  GlitchTip and alerting. **Steward** and **Sentinel** (Pi Zero 2 W) handle routine automation and passive
  security watching, and they check host posture.
- Every machine-to-machine and admin connection goes over **Tailscale**. No host accepts password or root SSH.
  Details: [`infra/schedule/ACCESS.md`](infra/schedule/ACCESS.md) and
  [`Blueprints/specs/infrastructure/slops-os-raspberry-pi-fleet-v1.md`](Blueprints/specs/infrastructure/slops-os-raspberry-pi-fleet-v1.md).

### The football warehouse

Omen keeps its own football database instead of relying on one provider's numbers. It has five layers:
**ledger** (where the data came from), **identity** (teams, players and every provider ID mapped to them),
**facts** (public nflverse data, never edited), **provider** (third-party projections, stored separately and
labelled) and **sight** (Omen's own versioned numbers, graded against real results). Ingest runs every day at
07:15 ET, then a backup is taken. Table-by-table map: [`warehouse/map/`](warehouse/map/).

## Rules that never bend

Omen is free. ESPN cookies are never logged or shown. Mock data is always labelled. Confidence is a band, never a
percentage. Production database changes and deploys each need explicit founder approval. The full list and its
history are in [`Direction/facts-of-record.md`](Direction/facts-of-record.md).

---

## Repository map

| Folder | What's in it |
|---|---|
| `src/` | Express API: `routes/`, `services/` (decisions, trades, waivers, Sight, Ledger, providers), `adapters/` (ESPN, Yahoo, Sleeper), `middleware/`, and the `omen_*_cron.js` jobs |
| `test/` | Node test suite (`npm test`) and API contract tests |
| `mobile/ios/` | The iPhone app (`OmenIOS/OmenIOS.xcodeproj`), with unit and UI tests |
| `mobile/android/` | Android app (paused) |
| `mobile/contracts/` | Native auth and QA runbooks |
| `frontend/` | React web app (Vite and Tailwind) |
| `client/` | Small React shell built into the Docker image |
| `warehouse/` | Football warehouse migrations, the table map, and verification |
| `sql/` | Supabase schema: what is applied, what is pending, and the 2026-10 redo |
| `infra/` | Host schedules, access, and warehouse backup and timer units |
| `deploy/hostinger/` | Production compose file, Nginx config, watchdog and deploy notes |
| `ops/command-center/` | Reference copies of what runs on the Command Center Pi (editing them deploys nothing) |
| `scripts/` | Repo checks, gates and generators |
| `evals/` | Prompt-safety evals |
| `extension/` | Browser extension that helps connect an ESPN account |
| `Direction/` | Product direction: the map, sprint, decisions, known issues, release records |
| `Blueprints/` | Specs, playbooks, prompts, handoffs, API route list, security and privacy |
| `Brand/`, `logos/`, `design/` | Brand system, marks and design canvases |
| `Legal/` | Provider and brand-use requests and agreement drafts |
| `References/`, `Solutions/` | Research, evidence and solved-problem write-ups |
| `Archive/` | Retired material, kept for history only |

## Start here (for people and AI assistants)

1. [`Direction/map.md`](Direction/map.md): one page that says what to read for any task.
2. [`Direction/context.md`](Direction/context.md): the product and its tool hierarchy.
3. [`Direction/release/builds/`](Direction/release/builds/): what each beta build fixed, what shipped, and what's
   still broken.
4. [`Direction/known_issues.md`](Direction/known_issues.md): open problems.
5. [`Blueprints/api-routes.md`](Blueprints/api-routes.md): every API route.

Coding agents (Claude Code, Codex) start from `CLAUDE.md` / `AGENTS.md`.

## Local development

```bash
npm install
npm test                 # backend test suite
npm start                # API on port 3000 (needs Supabase and the other env vars)
cd frontend && npm install && npm run build
```

Open `mobile/ios/OmenIOS/OmenIOS.xcodeproj` in Xcode for the iPhone app. Production secrets are injected at
runtime and never committed. The list of environment variables is in
[`deploy/hostinger/ENV-INVENTORY.md`](deploy/hostinger/ENV-INVENTORY.md).

---

Platform trademarks belong to their owners. Omen is not endorsed by, sponsored by or affiliated with Yahoo,
Sleeper, ESPN, Disney or the NFL.

Built by [@justinduverge-design](https://github.com/justinduverge-design). *Omen: see the winning move.*
