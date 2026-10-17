# Omen API (`src/`)

Node.js and Express. `server.js` is the entry point. In production it runs in the `omen_api` container on KVM1;
the `omen_cron` container runs the scheduled jobs.

| Path | What it holds |
|---|---|
| `server.js`, `omen_api_v2.js` | App setup and route mounting |
| `routes/` | One file per API area: `omen` (Omen of the Week), `trade`, `waivers`, `startSit*`, `league*`, `moves` (Ledger), `dashboard`, `account`, `userPrivacy` (export and delete), `platforms`/`espn`/`yahoo`/`sleeper` (connections), `system`, `demo`, `betaReports` |
| `adapters/` | ESPN, Yahoo and Sleeper adapters. All three return the same normalized roster and player shape, so nothing downstream knows which provider a league came from |
| `services/` | The decision logic: `omenSelector`/`omen` (the weekly call), `tradeFind`/`tradeValue`/`tradeHorizons` (trades), `waiverAnalysis` (waivers), `sightDecision`/`sightEnrichment` (Sight), `ledger` (grading), `credentialHealth`, `playerCrosswalk`, `weather`, `llm` (optional narration) |
| `services/footballWarehouse/` | Warehouse ingest, metrics (Sight) and Ledger outcome writers |
| `services/footballIntelligence/`, `services/footballData/` | Football-intelligence pipeline and the scoring-data pipeline (each has its own module map) |
| `middleware/` | Auth, security headers, rate limits, error envelopes, logging (ESPN values scrubbed) and Sentry |
| `omen_*_cron.js` | Scheduled jobs: credential health, daily purge, nflverse stats, player crosswalk, football intelligence, the Tuesday run |

Every route and its contract version: `Blueprints/api-routes.md`. Response shapes are locked in
`test/contracts/`. Run the tests with `npm test`.
