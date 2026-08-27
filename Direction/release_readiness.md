# Omen Release Readiness

Last updated: **2026-08-26** (§"Not Deployed / Not Merged" reconciled to empty).
Previous update was 2026-08-12 (first local Mac/Xcode signed-device bring-up).
Previous full reconciliation was 2026-08-05.

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
provider-unproven. The iOS app record and local development-signing path now
exist, and the existing app has launched on one registered physical iPhone.
Distribution/archive/TestFlight, native auth/capability proof, broader device
QA, and the Android store path remain open.

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
- **Backend tests: 813/813 green** on `feat/m9-backend-gap-closure` (`npm test`, 2026-08-27, rebased onto `main` after PR #372). `main` itself is 713/713. Was 712/712 at the start of that session, 506/506 on 2026-08-02 (PR #272), 391/391 on 2026-07-19.
- PRs gated by `pr-quality.yml` (#253)
- The "Actions billing hold" was a **misdiagnosis** — two config bugs, both fixed in #250 (2026-08-01). **Superseded 2026-08-11:** `ios-ci.yml` no longer runs per-PR by choice, not by failure — it triggers on `release/**` and manual dispatch only, with routine iOS verification moved to the founder's local Mac. See `Blueprints/definition-of-done.md` → "Local substitutes".
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
- **Local iOS development path verified 2026-08-12:** Mac mini with Xcode 26.6 (`17F113`); existing `OmenIOS.xcodeproj`; Automatic Signing under team `6RWR5G9894`; bundle ID unchanged at `com.slopssaloon.omen`; registered `iPhone15,4`; physical-device build, install, and launch succeeded. The iPhone 16 simulator suite passed **108/108** with command-line signing disabled. Xcode 26.6 does not match the Definition-of-Done row's Xcode 16.2 pin, so this is local regression evidence, not exact CI-toolchain equivalence.
- Local client configuration is supplied through git-ignored `Config/Local.xcconfig`; no value is recorded here. No entitlement/capability, archive, distribution upload, TestFlight, or native-auth success is implied.

---

## ✅ Deploy pipeline — BROKEN 2026-08-26, FIXED 2026-08-27

**`main` has not reached production since 2026-08-25 22:23.** The last two pushes
to `main` both failed to deploy with the identical error:

```
open /opt/omen/deploy/hostinger/.env.production: permission denied
```

- run `33024028806` (2026-08-26 23:37, `docs(football-data): record phase4 activation`) — FAILED
- run `33027042406` (2026-08-27 00:30, `fix: hold unsafe grading and close A7B evidence` #372) — FAILED

**Production itself is UP and healthy** — `/api/health`, `/api/ready`,
`/api/version` all 200, `status: "ready"`. The old container is still serving. So
this is not an outage; it is a **silent staleness**: every merge since 2026-08-25
is on `main` and is *not* running.

**Cause is on the host, not in the code.** The `docker compose pull` step
succeeds, so the self-hosted runner can read the directory and the compose file.
Only `.env.production` is unreadable to it, which is what a tightened
`chmod`/`chown` on that one file looks like. The break window
(2026-08-25 22:23 → 2026-08-26 23:37) is exactly the A7B Phase 3/4 host-hardening
window — `9e780b0 fix(football-data): bound backup service privileges`,
`c8597e0 docs(football-data): record kvm1 identity provisioning`,
`319723f docs(football-data): record witness root provisioning`. **Not proven** —
no agent in this session has host access, and confirming it requires reading the
file's mode and owner on KVM1.

**RESOLVED 2026-08-27 by PR #373** (`fix(deploy): read protected production env on
recreate`). Deploy run `33028395352` succeeded, API and cron are on the new
images, health/readiness and public-route canaries pass. The fix kept the file
protected rather than widening its permissions.

**The residual gap this exposed is still open:** `GET /api/version` returns
`git_sha: null`, so there is still no way to ask production which commit it is
serving. Two deploys failed silently for ~25 hours and the only way to establish
what was actually running was archaeology through Actions logs. Populating
`git_sha` turns that into one query. Not yet queued.

---

## Not Deployed / Not Merged

**Empty as of 2026-08-26 (`B2-D3-S2`) — but see the deploy break above:
"merged" and "running in production" have been different things since
2026-08-25.**

Every item this section listed was already on `main`, most of it since early
June. The list was stale, not the work. Verified item by item against `main`
rather than trusted from this file:

| Item | Where it is on `main` | Landed |
|---|---|---|
| ESPN connect input normalization (cookie fragments + full league URLs) | `normalizeSwidCookie` / `normalizeEspnLeagueId` in `src/routes/platforms.js` | `2520fff`, 2026-06-04 |
| SPA `index.html` cache header fix | `src/middleware/spaCache.js` | `ab80d7f`, 2026-06-03 |
| `GET /api/version` | `src/routes/system.js:73`, contract `system-version.v1` | `ab80d7f`, 2026-06-03 |
| Tier 2 smoke cleanup mode | `OMEN_TIER2_CLEANUP` in `scripts/smoke-tier2-endpoints.js` | `ab80d7f`, 2026-06-03 |
| API route reference | `Blueprints/api-routes.md` | present, updated 2026-08-26 |
| League Standings error envelope polish | `league-standings-error.v1` in `src/routes/league.js` | `ab80d7f`, 2026-06-03 |
| B2-D3-S Sleeper live trade | closed 2026-08-02, PR #259 `521268b` | see `Direction/sprints_completed.md` |

`git merge-base --is-ancestor` confirms both anchor commits are on `main`. Zero
PRs are open.

**Deployed, not merely merged.** `deploy.yml` runs on push to `main`, and a live
`GET https://slopssaloon.com/api/version` on 2026-08-26 returned
`{"contract_version":"system-version.v1","service":"omen-api","node_env":"production"}`
— one of the six items answering from production. Nothing in this list needs a
deploy.

**This section was wrong for roughly twelve weeks**, and `B-FREEZE` was blocked
on it the whole time. It is the same failure the agent inbox records repeatedly:
a status line asserting work does not exist when `main` says otherwise.

---

## Required Before Beta

### Store and release — **critical path, underway**

1. **App Store Connect operability:** app-record creation is verified; build upload remains untested.
2. App records: iOS exists; Google Play organization verification/app record remain open.
3. Signing: local iOS Apple Development signing and device provisioning work; iOS distribution/archive/upload and Android upload key + Play App Signing remain open.
4. Apple privacy nutrition labels + Google Data Safety form
5. **Age rating / gambling questionnaire** — fantasy sports triggers Apple's gambling review path. Use `Direction/reviews/2026-07-12-store-metadata-privacy-gambling-copy-audit.md`.
6. TestFlight external beta for the real-user iOS cohort (first build requires Beta App Review) + Play internal testing; reserve TestFlight internal access for genuine App Store Connect team members
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
16. M4-Auth-Passkeys-iOS-Onramp — local code, 121-test simulator suite, signed device build/install, and entitlements are proven; AASA production publication plus pair/sign-out/sign-in Face ID proof remain open

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

- **A4 Tuesday scoring** — production is on a founder-authorized safety hold with both scoring flags `false`. The A7B real-row/no-write rehearsal passed, but re-enablement is blocked by A6's undeployed recommendation-persistence repair/new-row proof and the skipped O2 rollback drill.
- **Owned scoring data source** — A7B is CLOSED/COMPLETED: lawful immutable nflverse pipeline, canonical facts, independent witness, failure behavior, backup/recovery, and the real-row/no-write rehearsal are evidenced. The correction fixture is permanently labeled `controlled_fixture_not_upstream`; no authentic changed-subject upstream correction has been observed.
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
