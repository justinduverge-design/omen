# Omen Release Readiness

Last updated: **2026-08-05** (mobile-primary reconciliation).
Previous update was 2026-07-19 — 14 merged PRs stale.

**Product shape:** Omen is a **mobile app** (iPhone SwiftUI + Android
Kotlin/Compose) that also has a web app. The web app is secondary and is **not**
the beta surface. Scope and sequence live in `Direction/omen-1.0-plan.md`.

**Founder decisions 2026-08-05:**
- **Draft Assistant is cut from 1.0.** Ships 2027 with a Slops-built ADP. It must
  be removed from store metadata, onboarding copy, and marketing claims.
- **Both platforms ship the beta together.**
- Apple Developer Program: enrolled; account transfer to Valor Ventures in progress.

**Omen is free indefinitely.** No billing or subscription gate. `POST /api/omen/mvp-move`
is the only canonical recommendation route; `POST /api/optimizer/mvp-move` remains retired.

---

## Status

Backend is deployed on KVM1 and healthy. The native apps are the gating surface.

Posture is **pre-beta**: backend feature work is essentially complete but
provider-unproven; native work is close but unverified on real devices; **store
provisioning has not started and is now the critical path.**

---

## Verified

### Infrastructure
- GitHub repo: `justinduverge-design/omen`
- Local path: `<active-git-root>/slops-saloon/omen/`
- KVM1 deploy path: `/opt/omen/deploy/hostinger`
- Containers: `omen_api`, `omen_cron`
- Health: `https://slopssaloon.com/api/health` (service `omen-api`); `/api/ready` distinguishes dependency readiness
- GHCR image: `ghcr.io/justinduverge-design/omen:main`

### Quality gates
- **Backend tests: 506/506 green** (`npm test`, 2026-08-02, recorded in PR #272), plus focused B2-D 84/84. Was 391/391 on 2026-07-19.
- PRs gated by `pr-quality.yml` (#253)
- The "Actions billing hold" was a **misdiagnosis** — two config bugs, both fixed in #250 (2026-08-01). `ios-ci.yml` runs on PRs targeting `main` again.
- `npm audit --omit=dev --audit-level=moderate`: **0 production vulnerabilities**
- Accepted risk: dev-only `promptfoo → @huggingface/transformers → onnxruntime-node → adm-zip` high advisory. Not a production path; needs a breaking dev-tool update. **Does not block release.**

### Shipped since 2026-07-19

| PR | What |
|---|---|
| #198 | M4-Auth-Providers-v1 — Discord OAuth, Android + iOS (43 files, +1911/−33) |
| #259 | Live Sleeper trade candidates |
| #260–#262 | Tuesday move scoring from nflverse; cron schema tolerance and field scoping |
| #264 | nflverse scoring verification closed (B3) |
| #265 | ESPN waiver pool normalization (B2-D-E1) |
| #266 | ESPN waiver candidates wired into canonical Omen (B2-D-E2) |
| #267 | ESPN drafted-league waiver proof recorded |
| #268 | Valor Ventures identified as Omen operator |
| #269 | Omen public contract finalized (LEGAL-V1) |
| #270 | LEGAL-V1 deployment recorded |
| #271 | Native Waiver Watch composition (M4-CC-WaiverWatch) |

### Product surface
- Trade Analyzer live; Sleeper live trade candidates
- Omen / MVP Move canonical at `POST /api/omen/mvp-move`
- Start/Sit and waiver logic inside Omen
- Yahoo, Sleeper, ESPN in scope; ESPN recovery Account page
- Matchup DvP backed by nflverse-data
- LLM reasoning via Gemma/Ollama when configured
- Supabase auth and Vault encryption
- Legal, privacy routes under `/api/user`, and **in-app account deletion** — the last is an Apple App Store requirement, already satisfied
- Stripe fully removed (code, routes, middleware, table, column)
- Explicit `410 legacy_route_retired` for retired compat routes

### Native
- iOS: 79 Swift files — design system, Core, App, XCTest target
- Android: 88 Kotlin files — designsystem, auth, session, app
- Supabase auth providers confirmed enabled (project `xyudxfhqejbwvjngiwhw`, 2026-07-23): Email, Google, Apple, Discord, Passkeys. All others disabled.
- Discord OAuth merged on both platforms (#198)

---

## Not Deployed / Not Merged

- ESPN connect input normalization for pasted cookie fragments and full ESPN league URLs (no cookies logged or echoed)
- SPA cache header fix for `index.html`
- `GET /api/version`, Tier 2 smoke cleanup mode, API route reference, League Standings error envelope polish
- B2-D3-S Sleeper live trade — `READY_FOR_REVIEW`

---

## Required Before Beta

### Store and release — **critical path, not started**

1. **Verify App Store Connect is operable during the Valor Ventures account transfer.** Can an app record be created and a build uploaded right now? Transfers can restrict App Store Connect. **Check this first.**
2. App records: App Store Connect + Google Play Console
3. Signing: iOS distribution cert + provisioning profile; Android upload key + Play App Signing
4. Apple privacy nutrition labels + Google Data Safety form
5. **Age rating / gambling questionnaire** — fantasy sports triggers Apple's gambling review path. Use `Direction/reviews/2026-07-12-store-metadata-privacy-gambling-copy-audit.md`.
6. TestFlight internal + Play internal testing tracks (≤100 testers each, **no review required** — keeps Beta App Review off the critical path)
7. Store metadata scrubbed of **Draft Assistant** claims

### QA

8. **Real-account QA: ESPN** — highest risk. #265/#266/#267 are merged but **not provider-proven** beyond the 2026-08-02 read-only aggregate proof.
9. Real-account QA: Yahoo
10. Real-account QA: Sleeper — verify the explicit `week` param path
11. **Mock/live labeling sweep** — trust-critical
12. Real-device matrix: iPhone SE (375×667), a large iPhone, a Pixel-class Android
13. Accessibility: VoiceOver / TalkBack, Dynamic Type / font scale
14. M3A-QA native auth interactive real-device QA
15. M4-Auth-Providers-v1 **verification evidence** — code merged (#198), `Done when:` criteria not yet evidenced

### Security

16. Final production secrets + Supabase settings review
17. Rotate any credential exposed during local ESPN branch work
18. Rate limits on `POST /api/omen/mvp-move`, `POST /api/trade/compare`, `GET /api/dashboard/summary`
19. Confirm no provider credentials reachable in logs on error paths
20. **Mobile token storage** — Keychain (iOS) / EncryptedSharedPreferences (Android), no plaintext prefs

### Ops

21. **Observability** — Sentry + Umami + Vector per `self-hosted-observability-runbook`. Without it a beta crash is invisible.
22. **Mobile crash reporting on both platforms** — a native crash never reaches the API logs
23. **Forced-update / minimum-version gate** — mobile has no rollback; once a build is on a phone it stays until the user updates
24. Named rollback owner + tested rollback path
25. Load test the three hot routes (`scripts/load-omen-routes.js` — exists, never run)
26. Supabase backup/restore verification

---

## Season Gates (not beta gates)

- **A4 Tuesday scoring** — `OMEN_CRON_SCORING_ENABLED` stays `false`. Blocked on founder approval **and** on nflverse publishing `player_stats_2026.csv` ([#263](https://github.com/justinduverge-design/omen/issues/263)). Dry-run now; flip in September.
- **Fallback data source for Tuesday scoring** — if nflverse does not publish, the feature that closes Omen's loop has no data. Identify a fallback before September.
- NFL Week 1 (~2026-09-10) is the real load test.

---

## Known Gaps (post-launch)

- **Sleeper auto week detection** — `GET /api/sleeper/roster` requires an explicit `week` param
- **Optimizer waiver projections** — Yahoo `/players;status=A` returns no projections; VORP delta for waiver candidates uses 0 as baseline
- **Draft Assistant** — cut to 2027; rebuilt on a Slops ADP rather than shipped as-is
- Production Supabase table/column cleanup after Stripe removal remains a separately gated database action

---

## Deployment Boundary

The deploy lane works, but deploys still require Justin's approval when the task
is not explicitly a deploy task. Provider client secrets stay in Supabase Studio.
Apple/Google store accounts, signing, and release configuration remain founder-gated.
