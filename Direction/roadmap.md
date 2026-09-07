# Omen Roadmap

Last updated: **2026-09-07** (reconciliation against `git log` — see `Direction/sprints_completed.md` § "Reconciliation — 2026-09-07"). The 2026-08-31 revision stood while 50 commits landed, so several lines below are corrections rather than additions.

**Omen is a mobile app** (iPhone SwiftUI + Android Kotlin/Compose) that also has
a web app. Scope and sequence live in `Direction/omen-1.0-plan.md`; evidence
lives in `Direction/release_readiness.md`. This file is the feature-level view.

## Native Mobile — the primary surface

- iOS: **156** Swift files — design system, Core, App, XCTest target (79 on 2026-08-31; the count roughly doubled in a week).
- Android: **157** Kotlin files — designsystem, auth, session, app (88 on 2026-08-31).
- Discord OAuth merged on both platforms (#198). Supabase providers enabled:
  Email, Google, Apple, Discord, Passkeys.
- Native Waiver Watch composition merged (#271).
- **Signing and first upload are done, not pending.** iOS reached TestFlight (`0.1.0` build 1; a
  build 4 Release archive against production exists); Android version code 1 was accepted into
  Play internal testing with Play App Signing active.
- **Not yet:** real-device QA matrix, and the first Beta App Review submission (`W1-REVIEW`) —
  whose only remaining blocker is founder action. **That submission, not provisioning, is now the
  critical path.** ⚠️ `R4` (privacy/data-safety forms) and `R5` (age rating / gambling
  questionnaire) are marked closed with **no evidence recorded** and both gate rollout — see the
  open question in `sprints_completed.md`.
- Native targets are SwiftUI and Kotlin/Compose. Do not introduce React Native.

## What Is Live (backend + web)

- Trade Analyzer, including live Sleeper trade candidates.
- ~~Draft Assistant.~~ **Cut from 1.0 on 2026-08-05** — ships 2027 on a
  Slops-built ADP, developed over fall/winter. Remove it from store metadata,
  onboarding copy, and marketing claims.
- Omen of the Week / MVP Move through `POST /api/omen/mvp-move`.
- Start/Sit inside Omen.
- Waiver logic inside Omen.
- **League-aware waiver system** (2026-09-06) — canonical waiver-system model with FAAB bid support,
  failing closed on unknown settings; verified against three real ESPN and two real Yahoo leagues.
- **Projections for ESPN and Sleeper, Yahoo matchups, and exact ESPN scoring** (#409, #410, #418).
- Yahoo, Sleeper, and ESPN platform adapters.
- ESPN recovery Account page.
- Matchup DvP through nflverse-data.
- LLM reasoning through Gemma/Ollama when configured.
- Supabase auth and Vault encryption.
- Omen free-access posture; Stripe surfaces are removed from this product.
- `GET /api/system/current-week`.
- `POST /api/omen/feedback`. Auth required; records HITL feedback into `moves`. Live Supabase `moves` repair applied and idempotence-smoked. Frontend: `OmenFeedback.jsx` wired.
- `GET /api/moves`. Auth required; returns `moves-history.v1` with user move history, W/L/pending summary, and effectiveness aggregation. Frontend: `MoveHistory.jsx` wired.
- `GET /api/league/standings`. Auth required; returns `league-standings.v1` for Yahoo, Sleeper, and ESPN connected leagues. Frontend: `LeagueStandings.jsx` wired.
- `PATCH /api/account/preferences`. Auth required; records `favorite_team` into `profiles`; the backing Supabase column is applied and verified. Frontend: `TeamTheme.jsx` wired.
- `GET /api/dashboard/summary.user.favorite_team`, returning the saved favorite team or `null` when the user has not chosen one. Frontend: `App.jsx` hydrates on sign-in.
- Explicit `410 legacy_route_retired` responses for retired compat routes.
- Oracle deploy lane for `omen-api`.

## Current Infrastructure Route

- GitHub: `https://github.com/justinduverge-design/omen`
- Local: `<active-git-root>/slops-saloon/omen/`
- Hostinger KVM1 deploy path: `/opt/omen/deploy/hostinger`
- GHCR API image: `ghcr.io/justinduverge-design/omen:main`
- GHCR cron image: `ghcr.io/justinduverge-design/omen-cron:main`

## Prepared Locally, Not Deployed

- ESPN connect input normalization for copied cookie fragments and full ESPN league URLs. No frontend contract change; ESPN cookies still must never be logged or echoed.
- SPA `index.html` cache header fix so deploys do not leave browsers on a stale shell.
- `GET /api/version`, `OMEN_TIER2_CLEANUP=1` smoke cleanup mode, `Blueprints/api-routes.md`, and standardized League Standings error envelopes.

## Now

- Keep context, handoffs, route docs, and `Direction/agent_inbox.md` aligned with the current free Omen contract.
- Keep current API contracts stable.
- `sql/omen_rls_security.sql` is applied and verified in Supabase as migration `20260531160851_apply_omen_rls_security_full_setup`.
- `POST /api/omen/mvp-move` is the only canonical Omen/MVP Move path.
- `GET /api/moves` is the canonical Move History path.
- `GET /api/league/standings` is the canonical League Standings path. The old retired `410` handler for this route has been removed.
- `PATCH /api/account/preferences` is deployed, database-ready, and production-smoked.
- Trade Analyzer Projection and Status are Omen-owned analysis signals, not user-entered Phase 1 fields.
- Tier 2 frontend is **built and deployed** (PR #22, run `26833528435`): Account pricing display, Omen feedback hardening, team theme hydration, Move History/Hall of Records, and League Standings are all live.
- Tier 2 authenticated production smoke passed 13/13 on 2026-06-04.
- Current posture is launch-QA and ops validation, not broad feature build.

## Next — beta gates

Ordered. Full detail in `Direction/omen-1.0-plan.md`.

1. ~~**Store provisioning**~~ — **accounts, signing and compliance forms are done; the listings are
   not.** App records exist on both stores, signing is complete on both, iOS reached TestFlight and
   Android was accepted into internal testing. The privacy/data-safety forms (`R4`) and
   age-rating/gambling questionnaire (`R5`) were **verified complete in both consoles on 2026-09-07**.
   🔴 **But neither store listing is built.** Google Play is **6 of 11** on "Set up your app" —
   missing app category and contact details, the store listing, and the Government apps / Financial
   features / Health declarations; the app is `Draft` and testers see `com.slopssaloon.omen
   (unreviewed)`. iOS 1.0 has **no screenshots, no description, no keywords, no support URL, no build
   attached, and no Primary Category**. **`W1-REVIEW` cannot succeed until that is built**, and no
   sprint item currently owns it.
2. **Real-account QA** — **Yahoo and ESPN are now proven against real connected accounts**
   (ESPN from a phone, founder's own league, 2026-09-03; waiver systems verified against five real
   leagues across both providers, 2026-09-06). **Sleeper is the remaining gap** — the reversal of
   the original risk ordering, which had ESPN as highest risk and Sleeper as the easy one.
3. **Observability** — Sentry, Umami, and Vector per
   `self-hosted-observability-runbook`, plus native crash reporting on both
   platforms. Without it a beta crash is invisible.
4. **Forced-update / minimum-version gate** — mobile has no rollback.
5. **Mock/live labeling sweep** — trust-critical.
6. **Real-device matrix** — iPhone SE (375×667), a large iPhone, a Pixel-class
   Android; VoiceOver/TalkBack and Dynamic Type/font-scale checks.
7. ~~**Load-test evidence**~~ — **done 2026-08-22** (`O4`): 0% error rate and 0 rate-limited at
   20 and 200 concurrent, worst p95 107 ms. Its own recorded limits still stand — no provider
   fan-out, no real LLM call, loopback on one host — so the honest reading is *nothing in Omen's
   own code is a bottleneck at beta scale*, not *Omen is fast*. **Week 1 Sunday is the real test**,
   and two unrelated production outages in the week since (#399, #404) are the better evidence of
   where the actual risk sits.
8. **Security close-out** — rate limits (`S3`) and log containment (`S4`) closed 2026-08-22;
   mobile token storage (`S5`) is `VERIFIED` awaiting closure. **Still open:** production secrets
   review (`S1`), credential rotation (`S2` — including credentials exposed during local branch
   work), and the KVM2 public Nginx exposure (`S6`). A committed keystore password was removed and
   secrets moved out of the repo on 2026-09-02, which is what `S2` is cleaning up after.

## Season gates — not beta gates

- **Tuesday scoring (A4)** — production is on a cron-only safety hold with both
  scoring flags `false`. Re-enable only after the A6 persistence repair is
  deployed/proven on new rows and O2's rollback drill is complete.
- **Owned scoring data source** — A7B is CLOSED/COMPLETED with the nflverse
  pipeline installed, immutable snapshots, witness, monitoring, and
  backup/recovery. Its correction proof is a permanently labeled controlled
  fixture, not an observed upstream correction.
- NFL Week 1 (~2026-09-10) is the real load test.

## Later

- Delete retired compat route handlers after one release/log window if no callers hit the `410` responses.
- Polish The Ledger after the first Move History surface has real usage data.
- Add recovery analytics after B2/B4 stabilize state names and real-account QA verifies safe payloads.
- `GET /api/players/search`, route-level off-season defense if B2 confirms it is needed.
- Passkeys onramp (`M4-Auth-Passkeys-Onramp`, P2).
- M5 theme packs / skins — behind core themes and accessibility.

## Winter track — Draft Assistant 2027

Build the Slops ADP over Oct–Feb. Off the critical path, no season pressure —
the right window to build a differentiated model rather than wrapping someone
else's ADP.

## Guardrails

- **Omen's weekly call is one move of any type** — start/sit, pickup, drop, or trade. Waiver has
  its own section inside League. (Revised 2026-08-31; this line previously said to keep Start/Sit
  and waiver logic inside Omen. The founder identified that as a misunderstanding carried over from
  backend work.)
- Keep ESPN recovery user-safe and explicit.
- Prefer plain-English reasoning over visible heavy math.
- Do not deploy, apply Supabase SQL, touch secrets, auth providers, package files, or production config without explicit Justin approval.

## Beta rework waves — 2026-08-31

Driven by the app-wide page workshop. Beta feedback was two data points pointing opposite ways:
Sleeper connect worked without a question, and **ESPN on iPhone had no phone path at all.**

Ordered by what unblocks the most for the least. Analytics events land **with each wave**, never as
a separate project.

1. **ESPN in-app connect sheet · in-app report pill · Founder Digest.** Repairs the only confirmed
   beta failure and builds the instrument that makes the next beta round informative. Contracted in
   `Blueprints/specs/mobile/omen-wave1-contract-v1.md`. **The ESPN sheet needs no new backend** —
   `POST /api/platforms/espn/connect` already validates and stores. ~~Blocked on an ESPN terms review
   and a prepared App Review answer.~~ **Both cleared** (`W1-GATE`, 2026-08-31 — founder accepted the
   risk explicitly and chose to ship with a consent line).
   **Status 2026-09-07: the sheet is done on both platforms** (`W1-A` `VERIFIED` 2026-09-03; the
   founder connected a real ESPN league from an Android device with his own account), and so are
   `W1-CONSENT`, `W1-DEMO-NAMES` and `W1-TABBAR`. **Still open: the report pill (`W1-B`) and the
   Founder Digest (`W1-C`)** — both `READY`, both P0, and both are the half of this wave that makes
   the *next* beta round informative rather than anecdotal.
2. **Accessibility (#340 contrast, #338 Dynamic Type, #341 Android status bar) · honest-state
   consolidation · demo-mode deletion.** Mechanical, no design dependency, safely parallel.
3. **Command Center as the Small Council · the Ledger screen · the persistent context strip.**
   ⚠️ **Built ahead of this order, 2026-09-04 → 2026-09-07.** Command Center was rebuilt to the
   founder's sketch (#397) against a screen contract (#396), and the persistent context strip's
   control now exists — the multi-league carousel and the iOS team/league switcher with favourites
   (#398, #402, #406, #407, #408, #412), plus a game-week headline and PROJ/SCORE columns. The
   Command Center preview of the Ledger shipped earlier as `M5` slice E; **the Ledger *detail*
   screen (§7) is still unbuilt** and is tracked as `M9-BE-LedgerDetail`.
   **This wave was executed out of sequence and the roadmap did not record it for three days.** The
   sequence above is kept as written rather than renumbered, because what actually happened is the
   more useful fact: the ordering was a plan, and the plan was overtaken.
4. **League, with the ranked Waiver section inside it.**
   ⚠️ **The backend half is largely built, 2026-09-05 → 2026-09-06.** A canonical, league-aware
   waiver system (`src/services/waiverSystem.js`, `waiverBid.js`, `waiverAnalysis.js`,
   `src/routes/waivers.js`), failing closed on unknown league settings, **verified against three
   real ESPN leagues and two real Yahoo leagues**, with Omen of the Week's waiver language now
   league-aware. Spec: `Blueprints/specs/league-aware-waiver-system-v1.md`. The bid constants are
   recorded as **unratified**. The League *screen* itself is still Wave 4 work.
5. **Trade rebuild** to the Trade workshop contract — roster-based building, two- and three-team
   shapes, share output, counters. Today's native screen is two text fields and a Compare button.

**Work split:** Codex owns backend (analytics events, digest job, alert signals, waiver ranking,
Ledger follow-through reads). Claude owns native UI, iOS and Android moving together screen by
screen. Backend contracts are written before either starts, and the two must not be editing the
same Swift files in the same week.

**Not in these waves:** team theming (postponed, fact #19), Draft Assistant (2027), web page
migrations (paused; a separate session owns web).
