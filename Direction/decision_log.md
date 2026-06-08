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
- Tuesday scoring launch provider is `nflverse-data` weekly player stats. The current Sportradar cron fetch path is not launch-ready and should be replaced or isolated before scoring real user moves.

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

## Decisions Added 2026-06-05 (session 2)

- **`VITE_ESPN_ENABLED=true` — intentional launch setting:** ESPN platform connection is enabled for production. Set in `frontend/.env.local` 2026-06-05. Build confirmed clean (113 modules). ESPN content present in compiled JS bundle (cookie form, recovery states, reconnect flow). Guardrail preserved: ESPN cookie values are never logged or displayed. Real-account QA in progress — Justin connecting a live ESPN account to verify the connect form, inline expansion, and recovery states in the UI.
- **ESPN QA gate:** The open Verify item (real-account ESPN reconnect QA) will be checked off once Justin confirms the connect → connected badge → reconnect/disconnect flow works end-to-end with a live account. Until then, ESPN is enabled in code but the QA gate is not fully cleared.
- **ESPN 202 redirect behavior (off-season API quirk):** During live QA, ESPN returned HTTP 202 instead of 401 when the wrong season year was requested. ESPN's off-season API behavior: invalid season endpoints redirect to `www.espn.com/fantasy/` which returns 202 rather than a proper auth error. `isSeasonRetryable` in `src/adapters/espn.js` updated to treat 202 as a retryable error alongside 401 and 404. Test added (`verifyLeagueAccess retries on 202 ESPN homepage redirect`). 13/13 tests pass.
- **ESPN off-season connect mode (approved by Justin 2026-06-05):** When ESPN's v3 fantasy API returns 202 for ALL season candidates (both current and previous year), Corvus now treats this as "off-season unavailable" rather than "credentials invalid." Credentials are stored in Supabase Vault normally. The connect response includes `offseason: true`. Frontend shows a gold banner: "ESPN saved. Credentials are stored — league access will be verified when the 2026 season opens." The `espn_import_blocked` recovery flow remains unchanged for in-season failures. This avoids blocking users from connecting during the NFL off-season when ESPN's API is inactive.

## Decisions Added 2026-06-05

- **Trade Analyzer player-search source:** `GET /api/players/search` is the Phase 2 autocomplete backend contract. It is public, rate-limited, and backed by public Sleeper NFL player data with in-process caching. Successful responses are a JSON array of `{ id, name, position, team, projected_points }`, capped at 10. `projected_points` is `null` unless the source provides a numeric projection, so frontend must not present it as live advice. Existing static `frontend/src/data/nflPlayers.js` remains the fallback when the source returns `503 player_search_source_unavailable`.
- **Local backend readiness gate:** `GET /api/ready` must be `ready` before authenticated route load testing. The 2026-06-05 local auth failures were caused by a malformed local `.env` and an invalid Supabase service key in the Docker container, not by the user access token or route contracts. After `.env` cleanup and container recreation, Supabase readiness returned `reachable`.
- **Authenticated local load gate completed:** `scripts/load-corvus-routes.js` passed a 10-iteration authenticated local run on 2026-06-05. Results: `POST /api/trade/compare` 10/10 `200`, p95 34ms ✓; `POST /api/omen/mvp-move` 10/10 `200`, p95 4999ms ⚠; `GET /api/dashboard/summary` 10/10 `200`, p95 633ms ✓. Sprint item closed as **completed with Omen latency concern** — route is functional and not a launch blocker. Omen p95 ~5s is a post-launch tech debt item (LLM call caching / streaming investigation). Dashboard is under the 750ms investor-demo threshold.
- **Tuesday scoring provider selected, cron still disabled:** First launch scoring should use `nflverse-data` weekly player stats, not the current unvalidated Sportradar cron path. Do not enable `CORVUS_CRON_SCORING_ENABLED=true` until backend implements a nflverse scoring adapter, persists scoreable Omen recommendation metadata, scores by each row's stored `season/week_num`, and validates with fixtures plus a dry-run before mutating real move outcomes.
- **Tuesday scoring nflverse adapter implemented locally:** `src/corvus_tuesday_cron.js` now exports an nflverse-backed `fetchNFLScores()` using weekly `player_stats_{season}.csv` rows and keeps the old Sportradar body isolated as `fetchSportradarScores()`. `src/services/matchupService.js` now exposes `getPlayerActualPoints(playerName, week, season)`. `REQUIRED_SCORING_ENV` now requires only `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`; `SPORTRADAR_API_KEY` is not required for nflverse scoring. `CORVUS_CRON_DRY_RUN=true` runs scoring without Supabase writes. Verified locally with fixture tests and full `npm test` 281/281. Cron remains disabled pending approved real-data dry-run and scoreable-metadata confirmation.

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

## Decisions Added 2026-06-06 (hosting + go-to-market pivot)

- **Production hosting = self-managed Hostinger KVM1** (1 vCPU/4GB), Corvus only. **Supersedes the DigitalOcean App Platform recommendation** and the Oracle production box. The existing **KVM2** becomes the narration-model + agent "AI office" (non-critical; math-only fallback covers downtime).
- **WS1 materials revised to the Hostinger path** (Docker Compose + Nginx + Certbot SSL + DNS + UFW). New Codex prep prompt `Blueprints/prompts/codex-ws1-hosting-hostinger-kvm1.md` and founder runbook `Blueprints/playbooks/hostinger-kvm1-deploy-runbook.md`. The DigitalOcean prompt is marked superseded.
- **Year 1: Corvus free for all platforms incl. draft assistant**; **Year 2: paid draft assistant (Sleeper-first)**. Billing web-only.
- Tradeoff accepted: lower cost + one provider in exchange for self-managing the VPS (with Codex + Hostinger AI assistant).

## Decisions Added 2026-06-07

- **WS1 Hostinger KVM1 prep artifacts drafted repo-side only:** `deploy/hostinger/docker-compose.prod.yml`, `nginx-corvus.conf`, `ENV-INVENTORY.md`, `DEPLOY-NOTES.md`, and a local deploy `.gitignore` were prepared for Justin's runbook. This did not purchase a box, SSH anywhere, enter secrets, change DNS, deploy, or modify existing Docker/compose/CI/env files.
- **Hostinger KVM1 launch confirmations:** public hostname is `slopssaloon.com` plus `www.slopssaloon.com`; Justin has handled the off-box secrets backup target; KVM1 launch env should keep `CORVUS_CRON_SCORING_ENABLED=false`; Justin needs guided help for GHCR PAT/docker login and Tailscale KVM1-to-KVM2 setup.

## Decisions Added 2026-06-08

- **Hostinger KVM1 cutover completed:** `slopssaloon.com` and `www.slopssaloon.com` now resolve to KVM1 (`2.25.182.1`), Certbot HTTPS is active, HTTP redirects to HTTPS, root and `www` `/api/health` return `status: ok`, root and `www` `/api/ready` return `status: ready`, and browser smoke passed in Chrome and Firefox.
- **Corvus monetization posture changed to free/non-monetized:** Justin decided Corvus should no longer be monetized because Yahoo and ESPN data cannot be monetized safely under current platform constraints. Existing Stripe/payment code was not changed as part of this decision; hiding, disabling, or removing paid surfaces is a separate follow-up task.
- **Stripe/paid-surface posture decided — keep the plumbing, guard the server:** Resolves the open "hide / disable / remove" question. Decision: **gate, do not remove.** Introduce one reversible kill-switch `CORVUS_BILLING_ENABLED` (default `false`). Backend refuses new `/api/stripe/checkout` and `/portal` sessions when off (`403 billing_disabled`), and `requireSubscription` becomes a pass-through so every authenticated user gets Pro depth free. The Stripe **webhook stays ungated** so cancellation events keep `users.is_subscribed` truthful. Frontend hides pricing/upgrade surfaces behind `VITE_BILLING_ENABLED`. No Stripe code is deleted — re-enabling later (Sleeper-first, per the 2026-06-06 Year-2 plan) is a flag flip. Codex (backend) and Claude Code (frontend) prompts drafted 2026-06-08.
- **Live subscriptions removed:** The only active subscription was Justin's own. Justin canceled it in the Stripe dashboard on 2026-06-08. Because the webhook is ungated, the cancellation reconciles `users.is_subscribed` to false. No other customers existed or were affected.
