# Corvus Decision Log

## Active Decisions

- Corvus is the Fantasy Football MVP product.
- Trade Analyzer is the front door.
- Draft Assistant is the preparation and seasonal tool.
- Omen of the Week / MVP Move is the main event.
- Start/Sit lives inside Omen / MVP Move.
- Waiver logic lives inside Omen / MVP Move unless explicitly separated later.
- Yahoo, Sleeper, and ESPN all matter.
- ESPN is essential but risky and needs recovery playbooks.
- ESPN recovery routes through `/account` with safe state/query context only.
- ESPN league selection belongs in a full Account section for MVP, not a modal.
- Omen may preserve safe request context after ESPN recovery, but the user must click to rerun.
- `espn_import_blocked` remains the MVP user-facing state; safe backend `reason_code` values may be added later.
- Security and privacy decisions are tracked in `Blueprints\security-privacy.md`; compliance evidence is tracked in `probo.yaml`.
- Users need plain-English reasoning, not heavy math.

## Decisions Added 2026-05-23

- **Canonical Omen path**: `POST /api/omen/mvp-move` + `OmenOfTheWeek.jsx` is the canonical path. `Omen.jsx` was a developer test harness — its route will be unregistered. `GET /api/omen-of-the-week` will be retired after `OmenOfTheWeek.jsx` migrates to POST. `RecoveryPanel` from `Omen.jsx` will be absorbed into `OmenOfTheWeek.jsx`.
- **Matchup DvP data source**: nflverse-data (not Sportradar). Already live in the POST omen route.
- **LLM reasoning**: Gemma/Ollama already wired in `src/routes/omen.js`. Not a stub.

## Decisions Added 2026-05-24

- **Omen migration complete**: `OmenOfTheWeek.jsx` now calls `POST /api/omen/mvp-move`. ESPN recovery states (4) wired. `GET /api/omen-of-the-week` retired. 175/175 tests pass.
- **optimizer/omen product tier**: `POST /api/optimizer/mvp-move` (Pro-gated six-agent pipeline) and `POST /api/omen/mvp-move` are the same product surface at different enrichment tiers. Not competing features — same feature at free vs. Pro depth. Architectural merge decision is open and deferred to post-launch.
- **Corvus repo restructure complete**: The nested `Corvus/` folder was folded into the repo root. The repo itself is now the Corvus product layer.
- **Canonical local path**: `C:\Users\JDuve\OneDrive\Desktop\SLOPS\slops-saloon\corvus`.
- **Canonical GitHub repo**: `justinduverge-design/corvus`.
- **Canonical Oracle checkout**: `~/corvus`.
- **Production service identity**: health checks report `service: corvus-api`.

## Decisions Added 2026-05-25

- **Backend contract truth reconciled**: `Blueprints/handoffs/backend-to-frontend.md` now states the current tested Omen behavior. `POST /api/omen/mvp-move` has a Yahoo-first live path for authenticated, subscribed users with usable Yahoo league context. Sleeper and ESPN live Omen remain `pending_live_engine`.
- **Current local backend verification**: `npm test` passes 199/199 locally.
- **Frontend build blocker recorded**: primary `frontend/` build currently fails in `frontend/src/pages/Account.jsx`; this is assigned as a Layer 2 Claude/frontend task, not a backend blocker. *(Resolved — build passes as of 2026-05-26. All subsequent builds are clean. Test baseline reached 240/240 by 2026-05-31.)*

## Decisions Added 2026-06-02

- **Tier 2 frontend deployed**: All five Tier 2 features (Account pricing display, Omen feedback hardening, team theme hydration, Move History / Hall of Records, League Standings) built and deployed in PR #22 (run `26833528435`). See `decisions.md` for the full closed decision entry.
- **Font system corrected**: Production font stack is Cormorant Garamond (display/brand) + Alegreya Sans (body/UI) + DM Mono (data). PR #22 corrected the prior Barlow Condensed + DM Sans spec to align with `Brand/brand-system.md`.
- **Production deploy confirmed**: PR #22 run `26833528435` completed successfully. Smoke: `/api/health` `status: ok`; `/api/ready` `status: ready`.

## Decisions Added 2026-06-03

- **"The Ledger" brand name:** Move History page named "The Ledger" (approved by Justin). "Hall of Records" retired. URL: `/ledger`. Nav label: "The Ledger".
- **`Omen.jsx` dev-only route:** Gated to `/dev/omen` in local Vite, stripped from production via `React.lazy` + `import.meta.env.DEV`. Not deleted — retained as API test harness for local development.
- **`Standings.jsx` vs `LeagueStandings.jsx` separation:** Two distinct components. `LeagueStandings.jsx` = collapsible embedded widget for Football tab. `Standings.jsx` = full dedicated page at `/standings` with own fetch, proper disconnected CTA, and PA column. Both retained.
- **UI/UX audit complete:** All 15 routed pages + shared components passed `/ui-ux-pro-max` audit. 44px touch targets, `motion-reduce` sweep, ARIA patterns, CSS token consistency are now baseline across the full app.

## Decisions Added 2026-06-04

- **Build loop source of truth:** `Direction/agent_inbox.md` is the single active-task slot. `Direction/current_sprint.md` is the queue/history view. `Blueprints/handoffs/*` remains the contract bus for frontend/backend coordination.
- **Launch-QA sprint state:** The 2026-06-04 sprint draft was promoted into `Direction/current_sprint.md`. Current Corvus posture is launch-QA and ops validation; prepared local backend patches are not production behavior until an approved deploy.

## Decisions Added 2026-06-05

- **Trade Analyzer player-search source:** `GET /api/players/search` is the Phase 2 autocomplete backend contract. It is public, rate-limited, and backed by public Sleeper NFL player data with in-process caching. Successful responses are a JSON array of `{ id, name, position, team, projected_points }`, capped at 10. `projected_points` is `null` unless the source provides a numeric projection, so frontend must not present it as live advice. Existing static `frontend/src/data/nflPlayers.js` remains the fallback when the source returns `503 player_search_source_unavailable`.

## Decisions Added 2026-06-04 (session 2)

- **Stripe webhook recovery ops gate cleared:** Justin confirmed Stripe webhook recovery follow-up is complete. Checked off in `Direction/current_sprint.md`.
- **Platform Connections redesign:** `PlatformConnections.jsx` rebuilt from a 3-column card grid to a compact bordered list. One row per platform; connected state shows platform name, username/description, `Connected` badge, and subtle ghost buttons for Switch/Reconnect/Disconnect. Connect and switch forms expand inline below the row (one open at a time). All API contracts, Sleeper guided flow, and ESPN recovery states preserved. Accent buttons use `--color-accent` — fully team-theme-aware. Disconnect is a danger ghost button (turns red on hover) rather than the primary CTA. Build confirmed clean.
- **"Omen of the Week" naming confirmed** by Justin as the approved user-facing feature name for the weekly recommendation feature.

## Open Decisions

- Final UI naming between Omen of the Week, Omen, MVP Move, or a combined label.
- Whether waiver logic ever becomes a separate product surface.
- Whether recovery analytics ship before or after the first paid launch gate.
- Whether `getOmenOfTheWeekMock()` in systemContracts.js is retired after Omen migration or kept as a fallback.
- Whether `POST /api/optimizer/mvp-move` merges into `POST /api/omen/mvp-move` as a Pro enrichment layer, or stays a separate route permanently.
