# Omen Roadmap

Last updated: **2026-08-05** (mobile-primary reconciliation).

**Omen is a mobile app** (iPhone SwiftUI + Android Kotlin/Compose) that also has
a web app. Scope and sequence live in `Direction/omen-1.0-plan.md`; evidence
lives in `Direction/release_readiness.md`. This file is the feature-level view.

## Native Mobile — the primary surface

- iOS: 79 Swift files — design system, Core, App, XCTest target.
- Android: 88 Kotlin files — designsystem, auth, session, app.
- Discord OAuth merged on both platforms (#198). Supabase providers enabled:
  Email, Google, Apple, Discord, Passkeys.
- Native Waiver Watch composition merged (#271).
- **Not yet:** real-device QA, store provisioning, signing, TestFlight / Play
  internal tracks. Store provisioning is the current critical path.
- Native targets are SwiftUI and Kotlin/Compose. Do not introduce React Native.

## What Is Live (backend + web)

- Trade Analyzer, including live Sleeper trade candidates.
- ~~Draft Assistant.~~ **Cut from 1.0 on 2026-08-05** — ships 2027 on a
  Slops-built ADP, developed over fall/winter. Remove it from store metadata,
  onboarding copy, and marketing claims.
- Omen of the Week / MVP Move through `POST /api/omen/mvp-move`.
- Start/Sit inside Omen.
- Waiver logic inside Omen.
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

1. **Store provisioning** — verify App Store Connect is operable during the Valor
   Ventures account transfer, then app records, signing, privacy/data-safety
   forms, and the age-rating/gambling questionnaire. Critical path, not started.
2. **Real-account QA** for Yahoo, Sleeper, and ESPN — ESPN first and highest
   risk; verify reconnect behavior without logging cookie values.
3. **Observability** — Sentry, Umami, and Vector per
   `self-hosted-observability-runbook`, plus native crash reporting on both
   platforms. Without it a beta crash is invisible.
4. **Forced-update / minimum-version gate** — mobile has no rollback.
5. **Mock/live labeling sweep** — trust-critical.
6. **Real-device matrix** — iPhone SE (375×667), a large iPhone, a Pixel-class
   Android; VoiceOver/TalkBack and Dynamic Type/font-scale checks.
7. **Load-test evidence** — run `scripts/load-omen-routes.js` against the three
   hot routes.
8. **Security close-out** — production secrets review, credential rotation, rate
   limits, and mobile token storage in Keychain / EncryptedSharedPreferences.

## Season gates — not beta gates

- **Tuesday scoring (A4)** — `OMEN_CRON_SCORING_ENABLED` stays `false`, blocked
  on founder approval and on nflverse publishing `player_stats_2026.csv` ([#263](https://github.com/justinduverge-design/omen/issues/263)).
  Dry-run now; flip in September.
- **Fallback scoring data source** — decide before September. If nflverse does
  not publish, the feature that closes Omen's loop has no data.
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

- Keep Start/Sit and waiver logic inside Omen / MVP Move unless Justin separates them.
- Keep ESPN recovery user-safe and explicit.
- Prefer plain-English reasoning over visible heavy math.
- Do not deploy, apply Supabase SQL, touch secrets, auth providers, package files, or production config without explicit Justin approval.
