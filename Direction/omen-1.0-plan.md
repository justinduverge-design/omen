# Omen 1.0 — Mobile Beta to Public Plan

Written 2026-08-05. Revised same day after two founder decisions.
Owner: Justin.

**Product shape:** Omen is a **mobile app** (iPhone SwiftUI + Android Kotlin/Compose)
that also has a web app. The web app is secondary and is not the beta.

This is the scope-and-sequence contract. `current_sprint.md` remains the active
queue; `release_readiness.md` remains the evidence record. Both answer to this.

### Founder decisions recorded 2026-08-05

1. **Draft Assistant is cut from 1.0.** Ships 2027 with a Slops-built ADP,
   developed over fall/winter. It is not a beta feature and not a launch gate.
2. **Both platforms carry the beta.** iOS and Android ship together, consistent
   with every M4 `Done when:` already requiring both.
3. **Apple Developer Program: already enrolled**, account transfer to Valor
   Ventures in progress. See R1 — this needs a check today.

---

## 0. The constraint that sets everything else

Omen is a fantasy football product. The season sets the deadline.

| Date | Event | Meaning |
|---|---|---|
| **2026-08-05** | today | ~5 weeks out |
| ~2026-09-10 | **NFL Week 1** | Start/Sit, Waiver, Trade all go live-or-broken at once. First real load. **This is the deadline.** |
| ~2026-09-15 | first Tuesday scoring | The core loop provable end to end |
| — | nflverse `player_stats_2026.csv` unpublished ([#263](https://github.com/justinduverge-design/omen/issues/263)) | A4 cannot validate against real data yet |

**Cutting Draft Assistant bought back three weeks.** The old plan had a hard
~Aug 15 wall because Draft Assistant is worthless after drafts. That wall is
gone. The deadline is now Week 1, and beta should open **~Aug 24** to get two
weeks of real feedback before it.

Still true: **A4 is a season gate, not a beta gate.** It's blocked on an external
data publish. Dry-run now, flip the flag in September.

---

## 1. Scope

### In — 1.0 is a mobile app

| Surface | State | Gate |
|---|---|---|
| Native iOS (79 Swift files, design system + auth) | building | M-lane + device QA |
| Native Android (88 Kotlin files, design system + auth) | building | M-lane + device QA |
| Yahoo / Sleeper / ESPN connect | live (backend) | real-account QA |
| Start/Sit — `POST /api/omen/mvp-move` | live | load + labeling |
| Waiver | ESPN pool merged (#265/#266) | real-account QA |
| Trade Analyzer | live, Sleeper candidates (#259) | real-account QA |
| Legal / privacy / account delete | shipped (#268–#270) | done — and Apple *requires* in-app account deletion, so this is already a gate you've passed |
| Web app | live | maintain only, no new work |

### Out

- **Draft Assistant** — 2027, with a Slops-built ADP. Remove from store metadata,
  onboarding copy, and marketing claims so 1.0 doesn't promise it.
- **A4 auto-enable** — dry-run only until nflverse publishes.
- Deferred backlog: G1–G10, M5 theme packs, IDP, live draft Lazy Sync.
- **New web page migrations** — already paused by the native pivot override.

> **Unblock E1/E2/E3.** The deferred backlog lists "E1 mobile scope decision" and
> "E2/E3 app-store closeout" as paused. Decision 2 above *is* the E1 decision.
> Promote E2/E3 into the active queue — they are now the critical path.

---

## 2. Workstreams

### R. Store and release — the new critical path

This did not exist in the old plan because the old plan shipped a web beta. It is
now **the longest pole**, and most of it is calendar time no agent can compress.

| # | Item | Owner | Urgency |
|---|---|---|---|
| **R1** | **Verify App Store Connect is operable during the Valor Ventures transfer** — can you create an app record and upload a build *right now*? Apple account transfers can restrict App Store Connect. | Justin | **today** |
| R2 | Create app records: App Store Connect + Google Play Console | Justin | week 1 |
| R3 | Signing: iOS distribution cert + provisioning profile; Android upload key + Play App Signing | Justin | week 1 |
| R4 | Apple privacy nutrition labels + Google Data Safety form | agent drafts, Justin submits | week 2 |
| R5 | **Age rating / gambling questionnaire** — fantasy sports triggers Apple's gambling review path. You already have `2026-07-12-store-metadata-privacy-gambling-copy-audit.md`. Use it. | Justin | week 2 |
| R6 | TestFlight external beta for the real-user iOS cohort (first build requires Beta App Review) + Play internal testing (≤100, no review) | agent + Justin | week 3 |
| R7 | Store metadata scrubbed of Draft Assistant claims | agent | week 3 |

**R1 is the single highest-risk unknown in this plan.** If the transfer locks
App Store Connect, the iOS beta slips and you need to know today, not in three
weeks. It's a ten-minute check.

**Use Play internal testing for Android and External TestFlight for the real-user iOS cohort.** Reserve Apple's internal testing for genuine App Store Connect team members. External TestFlight requires first-build Beta App Review but avoids granting console roles to ordinary testers. Play allows 100 internal testers
with no review. That covers a 10–20 person beta; Apple's first-build Beta App
Review remains the iOS cohort's external dependency.

### D. Development — finish the native lane

The M4 lane is **not** scope creep. It is the product. Reprioritized for beta:

| # | Item | Verdict |
|---|---|---|
| D1 | ~~Reconcile `current_sprint.md`~~ | **done 2026-08-05** — B2-D-E1, B2-D-E2, M4-CC-WaiverWatch closed against #265/#266/#271 |
| D2 | Update `release_readiness.md` (stale since 07-19, 13 PRs behind) | do next |
| D3 | M3A-QA native auth real-device QA | **beta blocker** — auth is the front door |
| D4 | M4-CC-PlatformsCompact | beta blocker — connect flow is the first screen that matters |
| D5 | M4-CC-LedgerPreview, M4-CC-LeaguePulse | ship if they fit; honest empty states are acceptable |
| D6 | M4-Help-Support-Implementation | needed for store review (support URL is required metadata) |
| D7 | M4-Auth-Providers-v1 (Discord OAuth) | **defer to 1.1** — not a beta blocker, and every new auth provider is new store-review surface |
| D8 | B2-D3-S Sleeper live trade (`READY_FOR_REVIEW`) | review + merge |
| D9 | Deploy the "Prepared Locally, Not Deployed" backend set | merge + deploy |
| D10 | **Feature freeze** | after D9 |

### S. Security

Closed: A3 production/Supabase review, F1 service-key scoping, Stripe removed,
legal shipped, 0 production vulns, GDPR module retired with a regression test.

| # | Item |
|---|---|
| S1 | Final production secrets + Supabase settings review (founder-only) |
| S2 | Rotate any credential exposed during local ESPN branch work (founder-only) |
| S3 | Rate limits on the three hot routes before public traffic |
| S4 | Confirm no provider credentials reachable in logs on error paths |
| S5 | **Mobile-specific:** no tokens in plaintext prefs/UserDefaults — Keychain (iOS) / EncryptedSharedPreferences (Android); certificate handling reviewed |

S5 is new and mobile-only. A leaked provider token on a stolen phone is a
different threat model than a web session.

### O. Ops

| # | Item | Why |
|---|---|---|
| **O1** | Observability: `self-hosted-observability-runbook` (Sentry + Umami + Vector) | **highest-value ops item.** On mobile it's worse than web — you can't read a user's console. Without crash reporting you are fully blind. |
| O2 | Named rollback owner + tested rollback path | A4's own done-when requires it |
| O3 | Post-deploy canary via `slops-canary` | automate "did the deploy break prod" |
| O4 | Load test the three hot routes (`scripts/load-omen-routes.js`) | exists, never run |
| O5 | Supabase backup/restore check | never verified |
| **O6** | **Mobile crash reporting on both platforms** | a native crash never reaches your API logs |
| O7 | Forced-update mechanism / minimum-version check | a bad mobile build can't be rolled back — users keep it until they update |

O6 and O7 are new. O7 matters because **mobile has no rollback.** Once a build is
on a phone it stays until the user updates. A minimum-version gate is the only
lever you have.

### Q. QA — the beta gate

| # | Item | Risk |
|---|---|---|
| Q1 | Real-account QA: **ESPN** (connect, recovery, waiver, drafted league) | **highest** — newest code, most fragile auth, and #265/#266 are merged but *not provider-proven* |
| Q2 | Real-account QA: Yahoo | medium |
| Q3 | Real-account QA: Sleeper — verify the explicit `week` param path (no auto week detection) | medium |
| Q4 | **Mock/live labeling sweep** | trust-critical |
| Q5 | Real-device matrix: iPhone SE (375×667) + a large iPhone + a Pixel-class Android | `mobile-first-qa-playbook` + `slops-mobile-smoke` |
| Q6 | Accessibility: VoiceOver / TalkBack, Dynamic Type / font scale | M4-Help-Support already requires it; Apple review checks it |
| Q7 | F5 ESPN connect walkthrough recording | doubles as onboarding + store preview asset |

Q1 and Q4 decide whether beta succeeds. Q5 is not optional on a phone-first product.

### K. Marketing — hold, then move fast

Nothing public until Q1–Q4 close.

| # | Item | Timing |
|---|---|---|
| K1 | Landing page + store copy honest about mock vs live; **no Draft Assistant claims** | before beta |
| K2 | 10–20 beta testers from real leagues, added to the approved tracks (TestFlight external + Google Play internal) | beta open |
| K3 | Feedback channel (Discord or in-app) | beta open |
| K4 | Omen of the Week / `slops-explainer-cut` | after Week 1 |
| K5 | Reddit / community push | after two stable weeks |

---

## 3. Sequence

### Phase 0 — Truth (done)
D1 complete. Truth Gate `sprint-git-drift` returns zero P0.
**Remaining:** D2.

### Phase 1 — Unblock the stores (this week) ⟵ *start here*
R1 today. Then R2, R3. Promote E2/E3 out of the deferred backlog.
**Gate:** you can create an app record and upload a build on both platforms.

### Phase 2 — Close the native lane (~week 2)
D3, D4, D6, D8, D9, then D10 freeze. D5 if it fits. D7 deferred.
**Gate:** feature freeze declared; nothing "prepared locally, not deployed."

### Phase 3 — Make it observable (~week 2, parallel)
O1, O2, O6, O7.
**Gate:** a deliberate native crash appears in Sentry within 60s, on both platforms.

### Phase 4 — Prove it (~week 3)
Q1–Q7, S1–S5, O3, O4. R4, R5, R7 in parallel.
**Gate:** three providers pass real-account QA; zero unlabeled mock output;
device matrix clean; store questionnaires submitted.

### Phase 5 — Beta open (~Aug 24)
R6, K1–K3. 10–20 real testers on the approved beta tracks, both platforms.
**Gate:** two weeks of real usage before Week 1.

### Phase 6 — Season hardening (Sept)
A4 dry-run → flag flip once nflverse publishes. Week 1 real load. First Tuesday scoring.
**Gate:** one clean Tuesday scoring run on real data.

### Phase 7 — Public 1.0 (late Sept / Oct)
Two stable weeks post-Week-1. Promote both apps to public store release.
Then K4, K5, D7 (Discord), and the M5/G-lane backlog.

### Winter track (Oct–Feb) — Draft Assistant 2027
Build the Slops ADP. Off the critical path, no season pressure. This is the
right use of the offseason and the right time to build a differentiated model
rather than wrapping someone else's ADP.

---

## 4. How to run this efficiently

1. **One active queue.** `current_sprint.md`. Not in it, not happening.
2. **OS layer frozen.** No new skills, agents, or audits until Phase 5.
3. **No new audits.** ~30 exist. Truth Gate replaces the doc-audit habit.
4. **Truth Gate in `pr-quality.yml`.** Make drift fail CI.
5. **Delete, don't banner.** A banner is still a file an agent must read.
6. **One gate per phase.** Don't start the next until it passes.
7. **Founder-gated items first each week.** R1–R3, S1, S2, A4 can't be done by
   an agent and have calendar lead time. Everything else can run in parallel;
   these can't. Do them Monday.

Rule 7 is the difference between a 5-week plan and an 8-week one.

---

## 5. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| **Valor Ventures transfer locks App Store Connect** | iOS beta slips indefinitely | **R1 today** |
| ESPN auth breaks under real accounts | beta dead on arrival | Q1 before anything else |
| Gambling classification rejection | store rejection, weeks lost | R5 early, use the existing audit |
| nflverse never publishes 2026 stats | Tuesday scoring dead all season | find a fallback source **in Phase 2**, not September |
| Bad mobile build with no rollback | users stuck on it | O7 forced-update gate |
| Dual-platform QA doubles the work | slip past Week 1 | strict internal-track testing; cut D5/D7 without hesitation |
| Ship blind, no crash reporting | silent churn | O1 + O6 hard gate |
| Mock data reads as live | permanent trust loss | Q4 + `demo-mode-pre-empty-state` |

---

## 6. Definition of done

**Beta (Phase 5):** both apps installable via internal tracks; three providers
pass real-account QA; zero unlabeled mock output; native crashes visible within
60s on both platforms; forced-update gate working; 10+ real testers in real leagues.

**Public 1.0 (Phase 7):** one clean Tuesday scoring run on real data; two stable
weeks after Week 1; load test passed; both apps approved for public release;
no P0 Truth Gate findings; support channel staffed.
