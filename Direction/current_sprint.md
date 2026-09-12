# Omen Current Sprint

**Last updated:** 2026-09-07 (reconciliation pass against `git log` — 30 CLOSED tombstone stubs removed from the active queue; the duplicate `W1-CONSENT` merged; `W1-REVIEW`'s satisfied blockers annotated; 50 unrecorded commits filed; `R4`/`R5` raised as closed-without-evidence)
**Structure last revised:** 2026-08-05 (revamped around the 1.0 plan — added Store/Release, Security, and Ops lanes; every lane now maps to a phase gate)
**Purpose:** Active execution queue only — `READY`, `IN_PROGRESS`, `VERIFIED`, `BLOCKED`. Completed evidence belongs in `Direction/sprints_completed.md`, `Blueprints/done/LEDGER.md`, PRs, and dated handoffs.
**Scope and sequence:** `Direction/omen-1.0-plan.md`. **Evidence record:** `Direction/release_readiness.md`.

## How agents use this file

Task states, `Claim:` and `Evidence:` requirements, `Blocked by:` / `Unblock:` grammar, closure types, selection order, and WIP rules are defined in **`Direction/status-model.md`** — the operational mirror carried by this repo so it works in standalone clones and CI. L0 holds the shared canonical source; if both copies are available and disagree on `SCHEMA_VERSION` or operational content, that is a blocking Truth Gate failure — halt and report.

1. Read `Direction/agent_inbox.md` first. A pinned task there overrides this queue.
2. Select only `Status: READY`, agent-buildable work whose `Blocked by:` line is `None`, ordered by the selection rule.
3. Do not auto-pull **Founder / Ops**, **Store / Release**, **Verify**, **Decision**, database, deploy, or production-mutation work.
4. Keep implementation in small PRs. If an item needs more than about 80 words of implementation detail, write or use a spec and leave the sprint item as a pointer.
5. On completion set `Status: VERIFIED` with an `Evidence:` pointer. Move to `Status: CLOSED` with a `Closure:` value (`COMPLETED` needs evidence, `SUPERSEDED` needs a successor, `DESCOPED` needs a reason) once the result is placed in `Direction/sprints_completed.md` with the appropriate Done receipt; update the decision log only when a decision changed, and record actual skill use. `CLOSED` is terminal — a regression creates a new linked task rather than reopening.

## Reconciliation standing items

The 2026-09-07 pass reconciled this queue against `git log` and raised findings that are still
open. Its full reasoning moved to `Direction/reviews/2026-09-07-sprint-reconciliation.md` on
2026-09-12 — it was a briefing every session paid for before picking a task.

**Still standing, read the review before acting on any of them:**

- `READY_FOR_REVIEW` is **not a state in `Direction/status-model.md`**, and five items sit in it —
  `M9-BE-Switcher`, `M9-BE-WaiverAnalysis`, `M9-BE-StartSitDetail`, `M9-BE-LedgerDetail`,
  `B2-D3-S2`. **The inbox selector cannot see any of them.** Flagged three times; changing it is a
  status-model decision.
- **The store listings are not built.** Google Play is 6 of 11 on "Set up your app"; iOS 1.0 has no
  screenshots, description, keywords, support URL, build, or Primary Category. `W1-REVIEW` cannot
  pass against either store regardless of build quality, and **no item in this queue owns listing
  content**. Minting one is a founder call.
- **`M8-EspnAndroidHelper` was closed with no ledger row.** A cross-reference inside another item's
  prose is not a receipt.

## Product shape and the deadline

**Omen is a mobile app** (iPhone SwiftUI + Android Kotlin/Compose) that also has a web app. The web app is secondary and is **not** the beta surface.

The NFL season sets the deadline, not the backlog:

**Reconciled 2026-09-02.** The table below now records what happened, not only what was
planned. Dates in the past are marked; do not read a passed target as still pending.

| Date | Event | Status as of 2026-09-02 |
|---|---|---|
| ~2026-08-24 | **beta open target** | **PASSED.** A beta round did run — `agent_inbox.md` records two data points from it: Sleeper connect worked without a question, and **ESPN on iPhone had no phone path at all**, the only confirmed beta failure on record. That failure is now queued as `W1-A`. Whether this counts as "beta open" per `R6` is a founder call and is **not** recorded anywhere yet. |
| **2026-09-05** | **season floor clears** | **3 days out.** `facts-of-record.md` #10. Until it clears, the Omen-recommendation halves of `F6`/`F7`/`F8` cannot pass. `is_off_season` is the authority — never read `week` or `season_type` as evidence the season started. |
| ~2026-09-10 | **NFL Week 1** | **8 days out.** Start/Sit, Waiver, and Trade go live-or-broken at once. First real load. |
| ~2026-09-15 | first Tuesday scoring | 13 days out. The core loop provable end to end. Cron scoring is deliberately held with both flags `false` pending the `A6` persistence defect. |

**Phase 4 is the live gate and it is a three-provider gate, not an ESPN gate.** `F6` (ESPN)
is `BLOCKED` on founder-device execution; **`F7` (Yahoo) and `F8` (Sleeper) are `READY`
with no blocker** and their connect/session halves are runnable now, ahead of the season
floor. Both were unblocked before this reconciliation and neither has been pulled.

**Founder decisions 2026-08-05:**

- **Draft Assistant is cut from 1.0.** Ships 2027 on a Slops-built ADP developed over fall/winter. Remove it from store metadata, onboarding copy, and marketing claims. Cutting it removed the mid-August draft-season wall and bought back ~3 weeks.
- **Both platforms ship the beta together.** Consistent with every M4 `Done when:` already requiring both.
- **Apple Developer Program is enrolled**; account transfer to Valor Ventures in progress. See R1.

## Phase gates

Each phase has exactly one gate. Do not start the next until it passes.

| Phase | Lane | Gate |
|---|---|---|
| 1 — Unblock the stores | **R** | an app record can be created and a build uploaded on both platforms |
| 2 — Close the native lane | **M**, **B** | feature freeze declared; nothing "prepared locally, not deployed" |
| 3 — Close the observability gap | **O** | a deliberate **native crash** appears in the error backend within 60s on both platforms. *Infrastructure observability is already done — see O1.* |
| 4 — Prove it | **F**, **S** | three providers pass real-account QA; zero unlabeled mock output |
| 5 — Beta open | **R6**, marketing | 10+ real testers in real leagues, both platforms |
| 6 — Season hardening | **A4** | one clean Tuesday scoring run on real data |

## Skill activation contract

Every task plan must name the selected skills and explain why any normally required skill is N/A. Every closeout must record which skills helped, which were skipped or substituted, and what procedure should improve.

### Core bundles

- **Core docs:** `slops-repo-inspector`, `planning-pass`, `slops-context-markdown`, `slops-git-flow`
- **Core implementation:** `slops-repo-inspector`, `planning-pass`, `slops-git-flow`, `slops-tdd`, `slops-quality-baseline`, `slops-code-review`
- **UI / UX — web:** core implementation + `slops-taste`, `slops-ui-ux-audit`, `slops-mobile-smoke`; add `slops-ux-copy` when user-facing words change
- **UI / UX — native (iOS + Android):** core implementation + `slops-taste`, **`slops-canvas-to-code`** (before the build, whenever the screen has an artboard), **`slops-native-ui-audit`** (for the verdict), `slops-mobile-smoke`; add `slops-ux-copy` when user-facing words change. **Do not use `slops-ui-ux-audit` for native** — it audits a partially-superseded web spec in web units.
  - The two native skills answer **different questions and both are needed**: `slops-canvas-to-code` asks *does the screen match its artboard*; `slops-native-ui-audit` asks *is the screen any good*. Neither substitutes for the other.
  - **Added 2026-09-07.** Both skills existed and neither was routed anywhere, so the page-by-page canvas work was done by hand. `slops-canvas-to-code` was written for precisely that failure and quotes it: *"When I tried to build the pages with codex I ran out of rate limits because I didn't do the job exactly like the canvas presented it, forgot placements and icons. It was bad."*
- **Trust boundary:** core implementation + `security-privacy-evidence`, `rbac-risk-review`; add `slops-legal-spot-check` when provider claims, privacy, terms, attribution, or public data-use copy changes
- **Data / ingest:** core implementation + `pre-build-research`, `slops-data-ingest-plan`, `security-privacy-evidence`
- **AI path:** core implementation + `slops-ai-integration-review`, `security-privacy-evidence`; add `slops-financial-sketch` when cost scenarios matter
- **Release / production:** `slops-repo-inspector`, `slops-quality-baseline`, `slops-verify`, `slops-ship`, `slops-canary`; use `slops-investigate` on HOLD, regression, or unexplained behavior
- **Design contract:** `slops-repo-inspector`, `planning-pass`, `slops-context-markdown`, `design-md-author` when a `design.md` contract is required, `slops-design-system-pack`, `slops-ui-ux-audit`

## Native Mobile Pivot — active authority

**Authority:** `Blueprints/specs/mobile/omen-native-mobile-foundation-v1.md` and companion mobile contracts are active native-mobile direction.

### Operating override

- **Pause** all new web page migrations and new web-only primitive work.
- **Keep** the existing web app and safe backend work. The API, auth, demo, recommendation contract, platform safety, tests, and production maintenance are native foundations; do not rip them out or treat the web UI as a wrapper target.
- **Native targets:** iPhone uses SwiftUI; Android uses Kotlin + Jetpack Compose. Do not start React Native.
- **M0 contracts are approved.** Native implementation is allowed only inside the approved contracts and current gates.
- **Store work is now OPEN and founder-executed** — see lane R. *(Changed 2026-08-05. This line previously read "No app-store action yet." That was correct under a web-first plan and became the single biggest blocker once mobile became the primary surface: store provisioning is calendar time no agent can compress.)* Apple/Google accounts, signing, release configuration, provider flows, DNS/deploy, SQL, and secrets remain **founder-gated** — gated means Justin executes, not that the work is deferred.

### Agent tools and canvas

All native-agent work is governed by `Blueprints/specs/mobile/omen-native-agent-capabilities-canvas-v1.md`, `Blueprints/playbooks/native-mobile-design-delivery-workflow-v1.md`, and the official [Omen Native Design House](https://www.figma.com/design/mWjrAKPi4JSIP5lAmGAtB3). No agent may assume access to secrets, production, provider data, Figma library publishing, or store accounts.

## Current state

- Production is live on KVM1; `/api/health` and `/api/ready` healthy at the latest verified baseline.
- Omen is free indefinitely. Stripe application code and residual checkout references were removed on `main`. The production Supabase table/column cleanup remains a separately gated database action.
- Backend test baseline: **973/973** (`Direction/decision_log.md`, 2026-09-04; was 537/537 on 2026-08-15 and that stale number stood in this file for three weeks). PRs gated by `pr-quality.yml` (#253). The "Actions billing hold" was a misdiagnosis — two config bugs, fixed in #250.
- Native test baseline: iOS **425** (Xcode 26.6, iPhone 17 Pro sim, 2026-09-04). The Android connected-instrumentation count has not been restated since `M6-ContextualHelp` (#312) and is **not** carried forward here as current — it needs a fresh run, not an assumption.
- Native: Discord OAuth merged both platforms (#198). A signed-in native user can connect a Sleeper league and see real league state (#309, #310).
- **Queue reconciled 2026-08-16.** 23 finished items moved to `Direction/sprints_completed.md` → "Sprint-queue reconciliation — 2026-08-16". This file now carries active work only.
- **Provider proof — substantially cleared, updated 2026-09-07.** **Yahoo:** entitlement live, two founder leagues bound, metadata / `current_week` / team key / a 15-player roster returning on the deployed image (`P1-YahooReauth`, 2026-08-28); waiver system verified against two real leagues (2026-09-06). **ESPN: now proven.** The founder connected a real ESPN league from an Android device with his own MyDisney account on 2026-09-03 (`Blueprints/handoffs/2026-09-03-espn-in-app-connect-both-platforms.md`), and the ESPN waiver system was verified against **three** real leagues on 2026-09-06. ~~Sleeper and ESPN remain unproven~~ — **that line was stale from 2026-09-03 and is retracted.** **Sleeper is the remaining gap**, and `M11A` is still the item that closes it.
- **Store provisioning underway (2026-08-05).** iOS app record is **created** — `Omen — Fantasy Football Tool`, bundle `com.slopssaloon.omen`, "Prepare for Submission". Root cause of the earlier failure was agreements setup under the Valor Ventures entity, not the account transfer. `R2-Android` and `R3-BUILD-Android` are both `VERIFIED` and awaiting a `Closure:` value, so the "Android record still to be created" phrasing this bullet carried is retired. iOS signing (`R3-BUILD-iOS`) closed 2026-08-19; a Release archive at version `0.1.0` build `4` exists against production. **The live store gate is now `W1-REVIEW`, and its only remaining blocker is founder action.**
- **Shipped 2026-09-03 → 2026-09-07 and not previously reflected here (50 commits).** Command Center
  rebuilt to the founder's sketch (#397) with its screen contract (#396); the multi-league carousel
  and iOS team/league switcher with favourites (#398, #402, #406, #407, #408, #412); a league-aware
  waiver system, Phases 0–3, verified against real ESPN and Yahoo leagues; projections for ESPN and
  Sleeper plus Yahoo matchups and exact ESPN scoring (#409, #410, #418); ESPN in-app connect at
  parity on Android (`W1-A`); and platform disconnect in Account. **Two production outages were
  fixed in this window** — a carousel loop (#399) and an unbounded trade search that took production
  down for a day (#404, with the performance rewrite in #405) — plus two test failures that were
  blocking every deploy (#400, #401). Reasoning is in `Direction/decision_log.md` and seven dated
  handoffs. **None of this is claimed as closing any queue item**; see the reconciliation section.
- Tuesday scoring is on the founder-authorized A6 safety hold. The running `omen_cron` has both scoring flags `false`; re-enable only after the A6 persistence repair/new-row proof and O2.

## Execution plan — batches and order (founder decision 2026-08-28)

**Screens first, then paint.** Founder framing: *"build the walls, build the rooms, paint it."* The
lanes below the fold (`A.`, `R.`, `M.`, …) are a **filing structure, not an execution order**. This
section is the execution order. It is a founder call and **overrides bare priority numbers where the
two disagree**.

Items are grouped by **what they require**, not by lane, because the binding constraint is founder
attention, not task count. Five separate items needing one deploy approval is one sitting.

### The six ordering rules that actually matter

1. **`O3` before Batch 1.** The post-deploy canary should exist *before* the biggest deploy in the
   queue, not after it.
2. **`M11A` before ratification.** Provider evidence is an input to the approval, not a follow-up.
3. **`M12-BrandFonts` before `F11`.** `known_issues.md` names the font landing as the trigger for
   re-examining the Dynamic Type audit finding. Running the accessibility pass on system fallbacks
   means running it twice.
4. **`M5` slices F/G before `F10`/`F11` and before Batch 6.** Do not audit layout, accessibility, or
   real-device behaviour on placeholder screens.
5. **Batch 6 after Batch 5.** Otherwise the founder runs the full device matrix twice — once on
   placeholders in the wrong typefaces, once on the real thing.
6. **`M4-Auth-Passkeys-iOS-Onramp` before Batch 6.** It closes the remaining iOS passkey acceptance
   evidence, and `M3A-QA` in Batch 6 is the auth matrix. Running the matrix first means running the
   passkey half of it again.

### Batches

| # | Batch | Holder | Contents | Gate |
| :-- | :--- | :--- | :--- | :--- |
| 0 | **Canary first** | agent | `O3` | none |
| 1 | **One deploy sitting** — five built PRs, one approval, one deploy, then run the canary | founder | `B2-D3-S2` (P0), `M9-BE-Switcher`, `M9-BE-WaiverAnalysis`, `M9-BE-StartSitDetail`, `M9-BE-LedgerDetail` | Batch 0 |
| 2 | **Provider proof** | agent | `M11A` | none — standing read access confirmed |
| 3 | **One reading sitting** — decisions, no device | founder | `M1-Screen-Trade`, `M1-Screen-League` (informed by Batch 2), `S1` spend decision, `M9-NativeScreenBacklog` priority, `M1-QA-EvidenceGate` ratification | Batch 2 for the two screens |
| 4 | **Build the two real screens** | agent | `M5` slices F + G, then `M11B` | Batch 3 |
| 5 | **Paint, then polish — strictly in this order** | agent | `M12-BrandFonts`, then `F11`, then the `F10` automated sweep | Batch 4 |
| 6 | **One device session** — every real-account and real-device matrix at once | founder, agent-prepped | `M3A-QA`, `F6`, `F7`, `F8`, `F10` real-device confirmation | Batch 5; Omen-recommendation halves also need kickoff 2026-09-05 |
| 7 | **Machine-access chores** — independent, any time | founder | `S2` (Apple `.p8`, Windows machine), `S6` (KVM2 takedown) | none — parallel-safe |
| 8 | **Agent cleanup** — parallel-safe, no gate | agent | `M4-Auth-Passkeys-iOS-Onramp`, `S7`, `M10-DesignLaneStaleness`, and the drafting halves of `M1-QA-EvidenceGate` and `M9-NativeScreenBacklog` | none |
| 9 | **Closure paperwork** — done work missing only its evidence line | agent | `A7-OwnedFootballDataPipeline`, `S5`, `R2-Android`, `R3-BUILD-Android` | none |
| 10 | **Season-gated — nothing before 2026-09-05** | mixed | `A4`, `A6-MovesScoringFormat`, and the Omen halves of `F6`/`F7`/`F8` | kickoff |
| 11 | **Launch** | founder | `F5` walkthrough, promotional capture, `R6` invitations, `B-FREEZE` | Batches 5 + 6 |

### Notes on specific batches

- **Batch 1 is the highest-leverage founder sitting in the queue.** Five items are `READY_FOR_REVIEW`
  with `Blocked by: FOUNDER — PR merge and deploy`. They are built and tested; the only thing between
  them and done is one approval. **`READY_FOR_REVIEW` is not a state in `Direction/status-model.md`**
  (lifecycle is `READY → IN_PROGRESS → VERIFIED → CLOSED`), so the inbox selection mechanic — which
  selects on `Status: READY` — **cannot see these five at all.** Flagged, not silently rewritten:
  changing them is a status-model question, not a queue edit.
- **Batch 7 is deliberately unsequenced.** Neither item shares a file, a machine, or a dependency
  with anything else. They can be done in any gap and should not wait behind the main line.
- **`R6` invitations are not blocked by this table.** Apple approved iOS Build 1 and the external
  group is empty; the founder may invite whenever he chooses. Placing them in Batch 11 reflects his
  stated preference to launch with footage he can sell — a preference he can reverse without asking
  anyone, not a technical gate.
- **`O1c`** (product analytics) stays deferred to post-beta and is in no batch.
- **`X1-PlayerPhotoOmenOfWeek`** (player photo on the This Week's Omen lead card): its research half
  `X1-RESEARCH` is **READY** by founder instruction 2026-09-05. The build half stays deferred behind
  the licensing answer and the §4.2 amendment. See lane X.


# Active queue

## A. Founder / review gates — do not auto-pull

### A4 — Tuesday scoring production enablement

- **Staleness note (2026-08-31):** `check-sprint-staleness.js` reports A4 as STALE because PR #386
  merged. **#386 was the mechanical scoring-enablement gate checker, not A4 itself.** A4 remains a
  legitimate hold: `OMEN_CRON_SCORING_ENABLED=false` and `CORVUS_CRON_SCORING_ENABLED=false` are set
  in production under the founder's 2026-08-26 safety hold, pending the A6 repair proven on new rows
  and O2 evidenced. Do not close A4 on the strength of #386.
- **Status:** BLOCKED
- **Blocked by:** TASK-A6-MovesScoringFormat — deploy the fail-closed recommendation-persistence repair and prove newly generated production rows carry their contract-required/coverage metadata before scoring can be re-enabled.
- **Mechanical gate checker added 2026-08-27.** `node scripts/check-a4-scoring-gates.js` verifies enablement readiness against the live system: season actually open (read from `is_off_season`, never the clamped week), O2 drill evidence, a real post-repair `moves` row for this season, that row's metadata being complete rather than `pending`, and the flag's current state. `--json` for alerting; exit 0 only when every gate passes.
  - **It automates the check, not the decision.** A date-triggered flip would enable scoring whether or not the evidence existed. The gate is not "is it September" — it is "did a real recommendation land with correct scoring metadata", and those came apart three times this week. The script prints the exact enable command and **never edits production env or recreates a container itself**; a test asserts it has no `child_process` or write calls.
  - **A gate it cannot observe is `UNKNOWN`, never a pass.** Run inside the production container there is no repo checkout, so the drill-evidence gate reports `UNKNOWN` rather than falsely claiming the drill did not happen.
  - **Current real state (run against production 2026-08-27):** 3 FAIL, 1 UNKNOWN. Season not open (`raw_week=-1`), no post-repair row yet. Earliest honest green is **2026-09-05** plus one real recommendation.

- **Gate 6 of 6 satisfied 2026-08-27.** "Completed O2 rollback exercise with Justin as owner" — the exercise was executed against real production (`Direction/reviews/2026-08-27-o2-rollback-drill.md`, 3s recovery both directions) and the owner is declared standing in facts-of-record #15. **The other five gates are untouched and each still needs its own evidence**; this does not authorize flipping `OMEN_CRON_SCORING_ENABLED`.
- **Unblock:** 2026-08-22 CLEARED — founder conditionally approved persistent Tuesday scoring enablement once all six evidence gates pass: two historical-week replays; independent three-format comparison; A6 staging validation; real-row/no-write production rehearsal; proven monitoring/failure behavior; and completed O2 rollback exercise with Justin as owner. The flag remains `false` until every condition is evidenced; no production action is authorized before then.
- **Unblock:** 2026-08-22 REASSESSED — `A5` is complete: founder rejected a paid fallback and selected a Slops-owned Omen football-data pipeline. The obsolete missing-`player_stats_2026.csv` premise and `TASK-A5` blocker are replaced by the actual implementation/evidence dependency, `A7-OwnedFootballDataPipeline`; the production flag remains evidence-gated.
- **Unblock:** 2026-08-26 CLEARED — A7B implementation, immutable source/acceptance evidence, staging failure behavior, KVM1 recovery, Command Center witness, live monitoring, and A4's real-row/no-write three-format rehearsal all passed. The additive scoring-contract columns are present in production.
- **Unblock:** 2026-08-28 CLEARED — the `TASK-O2` blocker is retired as satisfied. The founder-approved rollback exercise was executed against real production on 2026-08-27 (`Direction/reviews/2026-08-27-o2-rollback-drill.md`, 3s recovery both directions) with the owner declared standing in facts-of-record #15 — recorded in this item's own gate-6 note since that date while the blocker line was left standing. **`TASK-A6` remains, and the other five evidence gates are untouched.** This retires a stale line; it does not authorize flipping `OMEN_CRON_SCORING_ENABLED`.
- **Unblock:** 2026-08-26 REASSESSED — enablement outran O2 and exposed A6's missing recommendation persistence. With founder authorization, production was placed on a cron-only safety hold: both scoring flags are now `false`, the root env has backup `.env.production.bak-20260826-a6-scoring-hold`, and `omen_cron` was recreated healthy. The API and database were untouched by the hold.
- **Priority:** P0
- **Cost:** small
- **Phase:** 6 — **season gate, not a beta gate.** Do not count this against beta. Scoring remains held until A6 production-row proof and O2 are complete.
- **Agent-buildable:** verification and record reconciliation only; production env cleanup and the rollback exercise are founder-executed
- **Done when:** dry-run validates real rows without writes; production flag is explicitly approved and changed; readiness and cron health pass; rollback owner is named; and the founder-approved O2 rollback exercise is executed and evidenced.
- **Do not touch:** the production flag before approval; never log provider credentials or raw user data.

### A6-MovesScoringFormat — Persist league scoring format on recommendations

- **Status:** BLOCKED
- **Claim:** 2026-08-24 Codex — replacing the insufficient three-format premise with the founder-approved, full-league Scoring Contract on `codex/full-league-scoring-contract`.
- **Claim:** 2026-08-26 Codex — fail-closed recommendation-persistence containment, merged as PR #372.
- **Claim:** 2026-08-26 Claude — provider rule derivation and reconciliation on `feat/m9-backend-gap-closure` (PR #371, open).
- **Evidence (Codex, #372, on `main`):** the server persists every issued live recommendation (`persistLiveRecommendation`, `src/routes/omen.js:130`), marks feedback-only rows `scoring_contract_required=true`, refuses to issue a recommendation when persistence fails, and leaves uncaptured live scoring format `null` instead of inventing PPR. Focused 56/56, backend 713/713.
- **Evidence (Claude, #371, not merged):** `src/services/scoringRuleSnapshot.js` (provider-neutral derivation + order-independent hashing), `src/services/scoringReconciliation.js` (all seven states, failing closed), `scoreMove` wired to grade a contract-required row **by its contract** instead of throwing, `test/scoringRuleSnapshot.test.js` (23). `npm test` 812/812 pre-rebase.
- **The two halves fit together, and neither is complete alone.** #372 built the **write path** and persists `scoring_contract: null` with the metadata beside it. #371 builds the **derivation** that produces the contract body that column wants. Wiring `deriveScoringSnapshot()` into `scoringPersistenceMetadata()` is the next concrete step and is agent-resolvable.
- **Premise correction 2026-08-26 (Claude):** this item's `What is wrong:` line — "`fetchPendingMoves` selects without `scoring`, so **every** move is graded as PPR" — was **already false on `main`** when read. `src/omen_tuesday_cron.js:194` selects `scoring`. The real remaining defect was narrower: **the contract engine was orphaned** — `calculateContractScore` had no production caller and `scoreMove` *threw* on a contract row rather than evaluating it. Grep `main` before trusting a Scope line, including one asserting a defect still exists.
- **Retracted 2026-08-26:** an earlier line on this branch listed the capture path as `AGENT_RESOLVABLE — nothing writes scoring_contract at recommendation time`. That was true when written and was closed by #372 hours later. Verified against `main` before retracting, not taken from the PR description.
- **Step 2 done 2026-08-27 (Claude) — the two halves are joined.** `src/services/scoringSnapshotResolver.js` sits between #372's write path and #371's derivation: `scoringPersistenceMetadata()` now derives the league's real contract instead of hardcoding `contract_version`, `contract_hash`, and `provider_rule_snapshot_hash` to `null`. `test/scoringSnapshotResolver.test.js` (11). `npm test` **825/825**.
  - **A real defect fixed en route.** #372's write path persisted `scoring: "PPR"` for a **Yahoo** league whose rules have never been read — Yahoo's API is refused at the entitlement level. The label came from the envelope's own default, not from the league. That is the exact A6 defect (a fabricated scoring format) surviving one layer down in the code written to contain it. It is now `null`, and `test/omenMvpLiveRoute.test.js` asserts the corrected payload rather than being loosened.
  - **Two properties this seam must keep, both tested.** (1) It **never throws** — #372 refuses to issue a recommendation when persistence fails, so an exception here would cost the user their recommendation rather than some metadata; every failure path returns a `pending` snapshot. (2) The derived fields **do not widen the public API** — `publicScoringView()` freezes the envelope to the seven fields #372 defined, so the rule body can never leave the server through `recommendation.scoring`.
  - **⚠️ Rights decision deliberately NOT made by the agent.** A6's EXTERNAL blocker covers capturing **and retaining** a provider's complete private rule snapshot, and Sleeper's written commercial-use permission is still pending. So `RETAIN_RULE_BODY` is **`false` for all three providers** and `moves.scoring_contract` stays `null`; only derived metadata (coverage state, version, hashes) is persisted, which is what #372 already persisted. Deriving a snapshot in memory to compute a hash is not the same act as retaining a provider's rules in our database — this does the first and refuses the second. **Founder call:** whether reading a user's own Sleeper league settings, through a connection they authorized, falls under the pending commercial-use request at all. If it does not, flipping `sleeper: true` is a one-line change and nothing else moves.

- **Coverage matrix done 2026-08-27 (Claude).** `Blueprints/specs/a6-scoring-coverage-matrix.md` — one of the two remaining partials. **Generated from the code, not hand-written**, by `scripts/generate-scoring-coverage-matrix.js`, with `test/scoringCoverageMatrix.test.js` failing if the committed file drifts. A hand-written table would be wrong the first time someone added a Sleeper key and nothing would say so — which is this repo's recurring failure, not a hypothetical. The drift guard is proven by mutation, not asserted. Result: Sleeper maps **32 of 37** canonical events; the five gaps are named and explained (three are unreachable by design, two are genuinely unmapped tiered defense rules that correctly force `ambiguous`).

- **Completion audit 2026-08-27 (Claude) — every agent-resolvable clause is now met.** Clause-by-clause walk of this item's own `Done when:`: `Direction/reviews/2026-08-27-a6-completion-audit.md`. Clauses 3, 4, 5, 6 and 7 are **MET**; clause 2's engine is done and replay-proven but data-blocked; clause 1 is partial on two founder decisions, not on code. `npm test` **862/862**.
  - **Replay matrix delivered** — the last named engineering item. `test/scoringReplayMatrix.test.js` + `test/fixtures/a6-replay-weeks.json`: four scoring periods (2025 W1/W7/W14/W17, matching A7B's weeks so the two can be compared) × two archetypes × three league shapes, all reconciling `exact`, plus the negative case — a standard league graded against PPR's provider total is a `mismatch`. The thesis is asserted directly: nine receptions is a **9-point spread** between standard and PPR, which is exactly what grading everything as PPR was silently awarding.
  - **⚠️ Defect found and fixed: banded field goals were modelled wrong while reporting `supported`.** The derivation mapped Sleeper's `fgm_*` bands onto `field_goals_made` with a `range_event` operator, treating the fact as *the yardage of one kick*. A kicker who made **two** field goals supplied `field_goals_made: 2`, which fell in the 0–19 band and scored as a two-yard kick — 3 points instead of 6, with coverage still reading `supported`. That is a confident wrong number claiming league-exact capability: precisely what A6 exists to remove, living inside A6's own engine. Bands now map to canonical count-per-band keys, and two sub-bands that disagree inside one canonical band make the league `ambiguous` rather than picking a value. **Found by building the replay matrix, not by review** — the unit tests passed throughout.
  - **Also recorded:** the matrix caught my own fixture arithmetic (`-1.14` where `-1.54` was correct). The engine was right and the fixture was wrong.
  - **Remaining, none agent-resolvable:** (1) Sleeper retention rights — founder judgement, one line once decided; (2) the acceptance amendment — founder ratification, no code; (3) lawful per-event facts — `A7B`, plus ESPN's and Yahoo's provider paths. **A6 stays BLOCKED** rather than closing on an engine with no facts to run on.

- **Engineering-status reconciliation 2026-08-27.** The parallel session's A6 read lists six engineering-ready items. Checked against code rather than against either session's description — **three are already built, two are partial, one is deploy-blocked:**

| Item | State | Where |
|---|---|---|
| Canonical contract serialization + hashing | **DONE** | `scoringRuleSnapshot.js` `canonicalize`/`hashOf`, order-independent, tested (PR #371, open) |
| Lawful event-fact evaluator | **DONE, and predates both sessions** | `calculateContractScore` in `scoringContract.js`, landed `bdb8fdc` 2026-08-24. It was **orphaned** — no production caller — until #371 wired it through reconciliation |
| Reconciliation states | **DONE** | `scoringReconciliation.js`, all seven, with a test asserting every one is reachable (PR #371, open) |
| Rule coverage matrix | **PARTIAL** | the *mechanism* exists (`EVENT_KEYS`, `SLEEPER_EVENT_MAP`, unmapped-non-zero → `ambiguous`); the **written per-provider matrix does not** |
| Fixture / replay matrix | **PARTIAL** | 23 fixture tests including three-format divergence; **no multi-week replay matrix** |
| Production new-row proof | **BLOCKED** | needs a working deploy — see the deploy break |

  **Consequence for sequencing:** "implement the provider-neutral contract/evaluator core" is not a build step any more. It is a **merge** step, and it is cheaper and earlier than the parallel session's sequence places it.

- **✅ DATA blocker substantially cleared 2026-08-27 — the facts already existed.** `src/services/footballDataFacts.js` maps A7B's published fact rows onto A6's canonical event vocabulary. **A7B was already collecting what A6 needed** — including `receptions`, the column the entire PPR question turns on, plus kicker distance bands and team-defence rows. The gap was never data acquisition; it was two names for the same thing.
  - **Proven end to end:** a real A7B-shaped row scores **16.4 / 20.9 / 25.4** under standard / half-PPR / PPR and reconciles `exact` against its own league's total.
  - **Coverage: 25 of 37 canonical events.** The 12 gaps are named with reasons — `defense_points_allowed` (derivable from A7B's schedule scores, not yet wired), `defense_yards_allowed` and the ten IDP events (not collected). A league scoring any of them cannot reach `exact` and is told which fact is missing.
  - **Three safety rules, all tested:** an absent column is missing rather than zero; a summed fact is unknown if *any* component is unknown; a key A7B cannot supply is never guessed at.
  - **A7B untouched** — the dependency points one way, and `git diff` against `src/services/footballData/` and `ops/` is empty.
  - **The DATA blocker below is superseded for ordinary offensive and kicker leagues.** It still stands for IDP and points/yards-allowed leagues, and A7B's own production gates are unchanged.

- **Blocked by:** DATA — the current Tuesday source (nflverse `player_stats`) publishes aggregate fantasy points, not the per-event facts a contract prices, so a contract row reconciles to `unsupported` with its missing facts named. This is the seam `A7B` plugs into and is deliberately **not** worked around by scoring a missing fact as zero.
- **Blocked by:** EXTERNAL — each provider needs an affirmative rights/entitlement path before Omen may capture and retain its complete private rule snapshot or final outcome; ESPN is provider-restricted unless it grants express permission.
- **Unblock:** 2026-08-26 CLEARED for existing columns only — after explicit founder authorization and rollback preflight, the exact additive compatibility migration was applied to production with no row rewrite. This does not authorize any future SQL.
- **Priority:** P1 — correctness defect in the grading loop
- **Cost:** small
- **Source:** 2026-08-15 A5 research.
- **What is wrong:** `fetchPendingMoves` selects without `scoring`, carrying the in-source note "`scoring` is not present in the deployed moves schema. scoreMove already defaults an absent format to PPR." So **every** move is graded as PPR. A standard or half-PPR league's recommendation is graded against points its league does not award. `nflverseScoresFromCsv` already computes `rec_std`, `rec_half`, and `rec_ppr` — all three are produced and two are discarded.
- **Why it belongs to the vendor-agnostic ask:** this is the one genuinely *per-league* dimension of scoring. It is not fixed by adding data sources, and it affects Sleeper, ESPN, and Yahoo users identically.
- **✅ Sleeper retention resolved 2026-08-27 — the gate was on the wrong axis.** `Direction/reviews/2026-08-27-sleeper-retention-rights.md`. Read from `docs.sleeper.com` directly rather than this repo's paraphrase: **Sleeper does not restrict storage, it instructs it** — "You should save this information on your own servers", and "if you are storing information, you'll want to hold onto the user_id". The single gate Sleeper publishes is **commercial vs non-commercial**, which does not distinguish reading from retaining. `RETAIN_RULE_BODY.sleeper` is now `true`; ESPN and Yahoo stay `false` on real, untouched grounds.
  - **This does not resolve the commercial question, and that question is bigger than it looked.** If Omen is commercial to Sleeper, the free tier does not cover what **thirteen source files already do in production** on the serving path — not merely the unbuilt retention. Withholding one column never reduced that exposure; it only degraded the product. Founder/counsel call. The 2026-08-22 licensing request is still outstanding, and its existence implies the commercial reading was already the working assumption.
  - **Correction, not a decision.** I wrote that gate, gave it a confident rationale and tested it, without reading the provider's own terms. One fetch of the primary source falsified it — the same failure shape as the stale sprint lines: a plausible secondhand claim acted on without checking the source.

- **✅ ACCEPTANCE AMENDED 2026-08-27 — founder-ratified.** The first `Done when:` clause previously required *every* recommendation to name a provider-rule snapshot. **That was unsatisfiable for a legally restricted provider**, and an item whose acceptance can never be met pressures whoever holds it toward fabricating a snapshot to satisfy the sentence. The clause now accepts an immutable hashed **restriction attestation** as the alternative. No code changed: `deriveScoringSnapshot({platform:"espn"})` already returns `coverage_state: "provider_restricted"`, an explicit reason, `rules: []` and a hash, and `reconcileMoveScoring` already refuses `exact` for it. The sentence was the only part out of step.
- **Done when:** every recommendation names either (a) an immutable provider-rule snapshot and versioned canonical Scoring Contract, or (b) an immutable, hashed **restriction attestation** naming the provider, its coverage state, and the reason no lawful snapshot exists — never a fabricated or partial snapshot presented as complete; Omen calculates every supported material rule from lawful event facts; coverage is explicit for every rule; provider-final reconciliation distinguishes `exact`, `provider_adjusted`, `provider_restricted`, `unsupported`, `ambiguous`, `mismatch`, and `pending`; a league-exact result fails closed when any material rule or adjustment cannot be reproduced; historical rows without the new contract preserve the PPR fallback; the additive schema and its application evidence are recorded.
- **Do not touch:** any additional staging/production SQL without a new exact founder authorization; silently treating the reception-only format as a full scoring contract; expanding ESPN extraction or reconciliation without a lawful provider path.

### A7-OwnedFootballDataPipeline — Design the automated Slops-owned football-data pipeline

- **Status:** VERIFIED
- **Detail:** `Direction/sprint-verified-detail.md` § `A7-OwnedFootballDataPipeline` — evidence, claims, and correction history.

### R2-Android — Google Play Console account + app record

- **Status:** **VERIFIED — 2026-08-18.** Founder-reported and screenshot-evidenced (Play Console "Create app" flow, package name field), not independently browser-v
- **Detail:** `Direction/sprint-verified-detail.md` § `R2-Android` — evidence, claims, and correction history.

### R3-BUILD-Android — Fix the release build config and add signing

- **Status:** **VERIFIED — 2026-08-18 (build config VERIFIED 2026-08-05; signing completed and independently confirmed 2026-08-18).**
- **Detail:** `Direction/sprint-verified-detail.md` § `R3-BUILD-Android` — evidence, claims, and correction history.

### R6 — Internal testing tracks

- **Status:** READY
- **Blocked by:** FOUNDER — iOS external testing is approved and has **zero** testers and no public link; inviting the cohort (or creating the public link) is a founder console action.
- **Blocked by:** EXTERNAL — 10+ qualified testers from real fantasy leagues must accept beta access; at least one allowlisted tester with a compatible Android device must complete the Google Play opt-in and installation proof.
- **Unblock:** 2026-08-28 CLEARED — **Apple Beta App Review APPROVED.** The `Waiting for Review` blocker is retired. Verified live in App Store Connect with the founder present: iOS Build 1 of version 0.1.0 reports status **`Approved`**, expiring in 81 days, attached to both `Omen Internal Beta` and `Omen External Beta`. Apple no longer holds anything here. **What is left is not Apple.** `Omen External Beta` shows **0 testers** and no public link created; invites, installs, sessions and crashes are all `–`. The approved recruitment copy (2026-08-23) can go out now. Do not read the empty metrics as a review problem.
- **Unblock:** 2026-08-11 ROUTED — split from a single untyped comma list into typed, machine-readable lines per `Direction/status-model.md`. No dependency was added or removed.
- **Unblock:** 2026-08-22 CLEARED — the founder conditionally approved opening the private internal testing tracks as soon as `R3`, `R4`, and `R5` are complete. This removes the repeat founder gate only; it does not satisfy those tasks, invite anyone early, authorize external testing, or authorize public release.
- **Unblock:** 2026-08-22 CLEARED — `R3` completed when Google Play accepted Android version code 1 and confirmed Play App Signing; only `R4` and `R5` remain before tester selection and internal publication.
- **Unblock:** 2026-08-23 CLEARED — `R4` and `R5` closed after the founder submitted and verified both stores' privacy and age declarations. The 2026-08-22 conditional founder approval is now operative: private internal tester selection and internal-track publication may proceed, but external/public release remains prohibited.
- **Unblock:** 2026-08-23 REASSESSED — Build 1 is Ready to Test and attached to `Omen Internal Beta`, but the eligible tester picker is empty. Apple limits internal testers to App Store Connect users with qualifying roles; granting console access to ordinary beta users merely to avoid Beta App Review is not authorized. Evidence: `Direction/reviews/2026-08-23-r6-testflight-tester-model.md`.
- **Unblock:** 2026-08-23 CLEARED — the founder approved External TestFlight for the real-user iOS cohort so friends and fantasy-league participants can be invited without App Store Connect roles. The first-build Beta App Review is accepted as part of that route. This authorizes external beta setup and invitations only; it does not authorize public App Store release.
- **Unblock:** 2026-08-23 ESCALATED — `Omen External Beta` was created, Test Information and Build 1's `What to Test` were saved, and the founder submitted iOS version 0.1.0 (Build 1) to Beta App Review. App Store Connect now reports `Waiting for Review`, with the build attached to both the internal and external groups. No external tester has been invited yet.
- **Unblock:** 2026-08-23 CLEARED — Android version 0.1.0 (version code 1) was published to the Google Play internal track. Play Console reports the track `Active` and the release `Available to internal testers`; one founder-controlled Google account is allowlisted and the private opt-in link is enabled. The release remains unreviewed under Google's temporary package-name label, and installation has not yet been proven.
- **Unblock:** 2026-08-23 REASSESSED — store-side setup is complete as far as it can proceed without outside outcomes: Apple is awaiting Beta App Review and Android is active for allowlisted testers. The founder does not own Android hardware, so Android installation evidence must come from a qualified external tester; the proposed no-subscription recruitment route is documented at `Direction/reviews/2026-08-23-r6-beta-cohort-recruitment-plan.md`. No outreach has been sent and no anonymous install-exchange user counts toward the real-league threshold merely by installing.
- **Unblock:** 2026-08-23 CLEARED — the founder approved the prepared direct-contact message, waitlist email, moderator-permission request, tester feedback prompt, iPhone installation note, and Android recruitment/installation notes as launch-ready. This clears copy review only: Apple approval and the 10+ qualified-tester outcome remain external blockers, and no message, invitation, public link, or tester-list change has been sent or made under this approval.
- **Priority:** P0
- **Cost:** small
- **Phase:** 5 — this is beta open
- **Agent-buildable:** no
- **Source:** use Google Play internal testing for Android. Reserve TestFlight Internal Testing for genuine App Store Connect team members; use External TestFlight, including first-build Beta App Review, for the real-user iOS cohort.
- **Done when:** both apps are installable by invited testers on their approved beta tracks and 10+ real testers in real leagues have access.
- **Do not touch:** public store release or production tracks before Phase 6.

## M. Native mobile execution lane

**Phase 2.** D7-equivalent scope (new auth providers) is deferred — every new provider is new store-review surface during the tightest five weeks.

### ✅ M13-PrimitiveDebt — DONE 2026-09-05 — auth/connect primitives moved into `DesignSystem/`

**Founder decision 2026-09-05: queue this as a sprint item rather than fix it inline.**

`PrimitiveEnforcementTests.testAppSourcesUseOmenPrimitivesInsteadOfRawSwiftUIOrColorLiterals`
**fails on `main`** and has since `5936142`. Six violations in two files:

| File | What it is |
|---|---|
| `App/Auth/SignInView.swift` | `CanvasAuthPrimaryButton`, `CanvasAuthIconTile`, `CanvasTextAction` |
| `App/Connect/ConnectView.swift` | `ConnectProviderCard`, `CanvasTextAction` (**duplicated** from SignInView) |
| `App/Auth/SignInView.swift:310` | an **invisible** `TextField` — see below |

**The work is a move, not a refactor.** These are primitive-layer components sitting in feature
folders; `DesignSystem/` is explicitly allowed to touch raw SwiftUI because it *is* the primitive
layer. Relocating them is architecturally correct and **changes no pixels**. It needs
`project.pbxproj` edits — the iOS project does **not** use file-system synchronized groups, so
files cannot simply be `git mv`d. `CanvasTextAction` being defined `private` in both files is its
own small argument for the move.

**Do NOT convert these to `OmenButton`.** It has no icon + loading-state variant today, so that
path means extending a shared primitive and re-reviewing sign-in — a much larger change than the
enforcement failure justifies.

**`SignInView.swift:310` must be allowlisted permanently, not moved.** It is a deliberately
invisible `TextField` (`.foregroundStyle(.clear)`, `.tint(.clear)`, `.opacity(0.02)`) that captures
one-time-code input behind the custom-drawn OTP digit boxes. Converting it to `OmenTextField`
**breaks the OTP screen**. This is a correct exception, not debt, and its allowlist entry should
say so.

**Until this lands, `main` ships a red suite.** That is the real cost: a permanently-failing test
trains everyone to ignore failures and stops CI gating anything. If this cannot be scheduled soon,
the interim move is an allowlist entry naming this item as the retirement plan — which the test's
own comment says is **a design-steward decision, not a build fix**, and therefore the founder's.

### M5-Native-API-Client — Wire native screens to the existing Omen API

- **Status:** **VERIFIED (slices A + B + C + D + E, both platforms).** A+B+C 2026-08-15; **D 2026-08-16**; **E 2026-08-17**. The beta-minimum client (A+B+C+D) plus 
- **Detail:** `Direction/sprint-verified-detail.md` § `M5-Native-API-Client` — evidence, claims, and correction history.

### M1-QA-EvidenceGate — Close the M1 screen-contract pass acceptance gate

- **Status:** READY
- **Blocked by:** None
- **Priority:** P2 — no beta feature depends on it, but §4 is the gate that makes every M1 screen contract citable as approved design authority rather than a drawing someone made.
- **Cost:** medium
- **Agent-buildable:** yes, in full (proposal); founder ratifies.
- **Source:** the 2026-08-16 `M1-Screen-Trade` / `M1-Screen-League` pass. That session found all eight low-fidelity flows and all three golden pairs already drawn on both platforms, but pages **`01 — Principles & References`** and **`06 — QA & Evidence`** were **empty**, and `m1-figma-screen-contract-pass-v1.md` §4 requires both. It wrote them for two flows only: references board `86:2` (scoped to Trade + League) and QA records `87:2` / `88:2`.
- **Scope:** the remaining **six** flows — Command Center, Omen lead + Start/Sit detail, Waiver Analysis, team/league switcher sheet, Account → Connected Leagues, and Welcome/provider connection. For each: a `06` QA record in the shape already established (frames + contract links + states + intentional platform differences + open questions + approval status), and its reference influence annotated on `01`. Audit each flow against shipped backend truth the way the Trade and League records did — that audit is what surfaced the verdict-enum and activity-feed gaps.
- **Done when:** `06 — QA & Evidence` holds a record for all eight flows; `01 — Principles & References` annotates every source that influenced any of them; every visible element in the six audited flows maps to an approved component or an explicit proposal; and any conflict found is recorded as an open question rather than resolved inside a screen (§1).
- **Do not touch:** do not redraw the existing frames — they are the M1-P pass's approved work. Do not mark anything approved; ratification is founder-only. No new tokens, no unapproved production component, no competitor artifact.

### M9-NativeScreenBacklog — Mint delivery items for the four approved-but-unbuilt screens

- **Status:** READY
- **Backend dependency answered 2026-08-26:** `Direction/reviews/2026-08-26-m9-screen-backend-dependency-audit.md` audited all four against the live API. **All four had a real backend gap; none needed zero work.** All four backends are now built on `feat/m9-backend-gap-closure` (see `M9-BE-Switcher`, `M9-BE-WaiverAnalysis`, `M9-BE-StartSitDetail`, `M9-BE-LedgerDetail` below). Minting the four *screen* delivery items remains this item's own scope and is still a planning act.
- **Blocked by:** None
- **Priority:** P2 — planning, not build. It exists because the gap is currently invisible: these screens are designed, approved, and nowhere in the queue.
- **Cost:** small
- **Agent-buildable:** yes (planning-pass shape); founder ratifies priority.
- **Source:** the 2026-08-16 screen-contract audit. Native ships four surfaces — Command Center, Omen, Connect, Help. `M5-Native-API-Client` covers slices A–G and stops. **Four approved screen contracts have no delivery item anywhere:** Waiver Analysis (visual briefs §6), Start/Sit detail (§5), the Ledger **detail** screen (§7 — slice E wired only the Command Center *preview*), and the team/league switcher sheet (§10.2). The switcher is the load-bearing one: `M5` slice C fills the context strip, and §10.1 makes that strip the control that switches every personalized surface — today it has nothing to open.
- **Done when:** each of the four carries a canonical task record with key, priority, `Done when:`, `Blocked by:`, and a stated backend dependency (or none), ordered against the beta-minimum; and any that is deliberately post-1.0 says so with a reason rather than being left unqueued.
- **Do not touch:** no implementation. This is a planning act.

### M9-BE-Switcher — Backend for the team/league switcher sheet

- **Status:** READY_FOR_REVIEW
- **Claim:** 2026-08-26 Claude — `feat/m9-backend-gap-closure`.
- **Blocked by:** FOUNDER — PR merge and deploy.
- **Priority:** P1 — §10.1 makes the context strip the control for every personalized surface, and `M5` slice C already ships the strip with nothing to open.
- **Cost:** small
- **Evidence:** `GET /api/leagues` → `league-directory.v1`, `POST /api/leagues/active` → `league-active-selection.v1`, `src/services/activeSelection.js`, `test/leaguesDirectoryRoute.test.js` (21). Contracts in `Blueprints/api-routes.md`.
- **Finding:** before this, three surfaces resolved "which league is active" three different ways — `omen.js` sleeper→espn→yahoo, `league.js` espn→sleeper→yahoo, `optimizer.js` Yahoo-only by `updated_at` — and none of them was the user's choice. All now use one resolver; behavior is unchanged for a user who has not chosen.
- **Done when:** merged and deployed; a real switch is observed changing the surface a personalized route returns.
- **Do not touch:** applying `sql/2026-08-26_league_selection_review.sql` — gated founder sequence.

### M9-BE-WaiverAnalysis — Backend for Waiver Analysis (§6)

- **Status:** READY_FOR_REVIEW
- **Claim:** 2026-08-26 Claude — `feat/m9-backend-gap-closure`.
- **Blocked by:** FOUNDER — PR merge and deploy.
- **Priority:** P1
- **Cost:** small
- **Evidence:** `GET /api/waivers/analysis` → `waiver-analysis.v1`, `src/services/waiverAnalysis.js`, `test/waiverAnalysisRoute.test.js` (22), proven separately against each provider's own adapter.
- **Finding:** `GET /api/optimizer/waivers` and `/waiver` are **Yahoo-only** — both call `getAuthenticatedYahooClient()` unconditionally — and Yahoo is entitlement-refused (facts-of-record #11). `fetchEspnWaiverPool` was reachable only through `POST /api/omen/mvp-move`, as one MVP move. Sleeper the same. No provider could serve §6.
- **Done when:** merged and deployed; proven once against a real drafted league per provider.
- **Do not touch:** FAAB, waiver priority, or claim probability — forbidden by §6.2 until the league's waiver system is verified.

### M9-BE-StartSitDetail — Backend for Start/Sit detail (§5)

- **Status:** READY_FOR_REVIEW
- **Claim:** 2026-08-26 Claude — `feat/m9-backend-gap-closure`.
- **Blocked by:** FOUNDER — PR merge and deploy.
- **Priority:** P1
- **Cost:** small
- **Evidence:** `GET /api/start-sit/detail` → `start-sit-detail.v1`, `src/services/startSitDetail.js`, `test/startSitDetailRoute.test.js` (19).
- **Finding:** `POST /api/start-sit` exists and works, but is a stateless, **unauthenticated**, caller-supplied two-player comparator that never touches a provider. It is a different feature from §5, not an incomplete one — it cannot reach league context, kickoff times, scoring format, or the user's roster for any provider.
- **Done when:** merged and deployed; proven once against a real roster.
- **Do not touch:** the public `POST /api/start-sit` comparator; the detail route is a separate router so that one stays loadable without Supabase config.

### M9-BE-LedgerDetail — Backend for the Ledger detail screen (§7)

- **Status:** READY_FOR_REVIEW
- **Claim:** 2026-08-26 Claude — `feat/m9-backend-gap-closure`.
- **Blocked by:** FOUNDER — PR merge and deploy.
- **Priority:** P2 — the Command Center preview (`M5` slice E) already ships; this is the drill-in.
- **Cost:** small
- **Evidence:** `GET /api/moves/:id` → `move-detail.v1`, `test/moveDetailRoute.test.js` (12).
- **Finding:** `GET /api/moves` is a list and `normalizeMove()` projects ten fields; there was no per-move route at all. The stored `outcome` column literally holds `win`/`loss`, which §7.3 forbids surfacing — it is now translated into measured language and a test greps the response for the raw values.
- **Open, and larger than this item:** §7 calls the snapshot **immutable**, but `moves` rows are only ever created by the feedback upsert (`src/routes/omen.js:339`) — the recommendation is never persisted at issue time. Until a recommendation-write path exists, the "snapshot" is assembled from whatever the feedback row happens to carry. Shared with `A6`'s capture-path blocker.
- **Done when:** merged and deployed; a real Ledger row renders every §7.5 state the data can reach.
- **Do not touch:** inventing a `superseded` state from a single row.

### M12-BrandFonts — Ship the locked Omen typefaces in both native apps

- **Status:** READY — **needs re-scoping, 2026-09-07.** The one-typeface decision shipped
  **Alegreya Sans** (Regular / Medium / Bold, SIL OFL 1.1, licence intact) on both platforms, with
  a test on each asserting the roles resolve to the real family rather than a system stand-in. The
  other two locked families are **moot under that decision** — Alegreya and DM Mono are no longer
  in the design. So this item as written can never be completed, and what remains of it is a
  closeout plus its two live consequences: the promotional-footage gate is now open, and this
  item's own note makes landing real fonts the trigger to **re-raise the Dynamic Type finding** in
  `known_issues.md`, which has not been done. **Founder call** — not re-scoped by an agent.
- **Blocked by:** None as of 2026-08-29. ~~TASK-M5-Native-API-Client — specifically slices F and G, which are not built.~~ **Slices F and G shipped and merged to `main` on 2026-08-29** (`e603a08`), so the founder's "build the walls, build the rooms, paint it" sequencing is satisfied and this is the paint pass. Cleared during debt-preflight Stage 0.3; found by reading the blocker against `main` rather than by the staleness script, which matches PR titles and cannot see a sequencing blocker. **This item now gates `F11` — do not run the accessibility pass on system fallbacks.**
- **Priority:** P1 — **a prerequisite for any promotional footage.** Raised from invisible: until 2026-08-28 this defect existed only in `Direction/known_issues.md` and issue [#338](https://github.com/justinduverge-design/omen/issues/338) and was in **no** queue, which is exactly the failure `M10` exists to catch.
- **Cost:** small
- **Agent-buildable:** yes, in full. Both families are SIL Open Font License, so this is download-and-commit, not a purchase. The founder authorized acquisition on 2026-08-28, which satisfies the "separately approved asset/source decision" the M2 build brief §7 deferred this to.
- **What is wrong:** `Alegreya Sans`, `Alegreya` and `DM Mono` are the locked brand families and **there are no font files in this repo** — no `.ttf`, `.otf`, or `.woff*` anywhere. Both platforms silently resolve to system stand-ins: iOS `.default`/`.serif`/`.monospaced` (SF Pro / **New York** / SF Mono), Android `SansSerif`/`Serif`/`Monospace`. The sans-heading / serif-body contrast visible in the product is the intended *shape* of the three-role system rendered in the wrong typefaces.
- **Why it is P1 now:** the founder intends to record promotional video of the UI for social media and beta recruitment. Every frame shot before this lands is off-brand and has to be reshot. That is what moved this from a deferred nicety to a gate on the marketing work.
- **The swap seam already exists:** `OmenFontDesign` (iOS) and `OmenFontFamilies` (Android) are the only places a family is named. Do not widen that seam.
- **Done when:** the three families are committed under an OFL-compliant path with their licence files intact; both platforms register and resolve them (iOS via the app bundle, Android via resource fonts); `OmenFontDesign` / `OmenFontFamilies` resolve to the real families with the existing system stack retained as fallback; a test on each platform asserts the resolved family is **not** the system default; and a screenshot on each platform evidences the change.
- **Do not touch:** do not rename or add type roles; do not alter the type scale; do not widen the naming seam beyond the two existing files. **Landing this is the stated trigger for revisiting the Dynamic Type audit finding** in `known_issues.md` — re-raise it, do not silently fold it in here.

### M13-LeagueTeamIdentity — Name the league and team on the Omen recommendation

- **Status:** READY
- **Blocked by:** None
- **Priority:** P1 — **founder-flagged 2026-08-28**, found while proving the engine against real leagues.
- **Cost:** small
- **Agent-buildable:** yes, in full — but **the wording is a founder call**, per his note that this is "something I can weigh in on".
- **What is wrong:** the live Omen envelope returns a complete, correct recommendation with `league.name: null` and `team.name: null`. Measured against a real drafted Sleeper league: the user is told to start Terry McLaurin over Luther Burden without being told **which league or which team** that applies to. For a user with three connected leagues — the founder has Yahoo, Sleeper and ESPN — that is genuinely ambiguous, not merely unpolished.
- **Also null in the same envelope:** `scoring_format` (that is the `A6-MovesScoringFormat` defect surfacing at the contract edge, not a separate bug — do not "fix" it here) and `opponent_team` (no 2026 schedule published yet; expect it to populate at kickoff).
- **Done when:** the envelope carries the provider's own league name and the user's own team name wherever the provider supplies them; a provider that genuinely does not supply one degrades to a named, honest fallback rather than an invented string; and the founder has approved how it reads on screen.
- **Do not touch:** do not synthesize a league or team name from an id; do not widen the contract to carry a third identity field without a contract change.

### M10-DesignLaneStaleness — Extend the staleness check to design work

- **Status:** READY
- **Blocked by:** None
- **Priority:** P2
- **Cost:** small
- **Agent-buildable:** yes, in full
- **Source:** `scripts/check-sprint-staleness.js` matches sprint keys against merged **PR titles**, so it can only ever see the code lane. On 2026-08-16 the queue offered `M1-Screen-Trade` and `M1-Screen-League` as work to be done when every frame they asked for already existed in Figma — the **eighth** recorded instance of this pattern and the first the script structurally could not catch, on the same day the script was written to end it.
- **Scope:** for any sprint item whose evidence is a Figma node rather than a PR, assert the named frames are **absent** before the item is presented as pullable. The node ids are already recorded in each item's `Evidence:` line, so the check can read them from `current_sprint.md` and query the file. Keep the existing signal-quality discipline: report a hit as a finding only when it is unambiguous, and exit 0 with an explicit "this is NOT an all-clear" when Figma access is unavailable.
- **⚠️ Amended 2026-08-24 — the obvious way to check absence returns a FALSE POSITIVE.** Figma pages load lazily, and two separate reads lie about it before a page is loaded: `get_metadata` with no `nodeId` returned **one** page for a file that has **seven**, and `page.children.length` reported **0** for pages holding **27** frames. A checker that infers "this frame does not exist" from either would confidently report existing, approved work as missing — the exact false finding this item exists to prevent, inverted. **Absence may only be concluded from a direct probe of the specific node id** (`get_metadata` with that `nodeId`, or `getNodeByIdAsync` after `setCurrentPageAsync`). Evidence: during the 2026-08-24 `M1-Screen-League`/`M1-Screen-Trade` revision, the page listing supported a confident conclusion that node `86:2` was never written; probing `86:2` directly returned a fully populated references board.
- **Done when:** the check flags a design item whose frames exist while its `Status:` is not `CLOSED`; **concludes absence only from a direct per-node probe, never from a page listing or a `children.length` read**, and carries a test or fixture proving it does not report a lazily-unloaded page as empty; is proven against the real 2026-08-16 case; stays quiet on genuinely-unstarted items; and edits nothing — closing an item stays a human judgement.
- **Do not touch:** do not auto-close anything; do not write to Figma.

### M11A-ProviderShapeProof — Prove the provider claims against real connected leagues

- **Status:** READY
- **Blocked by:** None
- **Unblock:** 2026-08-28 REASSESSED — **split out of `M11`, whose single FOUNDER blocker conflated two different questions.** Claims 1-4 ask whether a provider *returns a field at all*. That is a fact about the provider: it does not change if a screen contract is rejected and redrawn, so the "risks proving the wrong thing" argument never applied to it. The founder confirmed standing read access to his own connected Omen accounts, so no per-session credential handover is required — reads run through the authenticated Omen API against his existing `platform_connections`, never against raw provider credentials.
- **Priority:** P1. ~~An input to the ratification the founder is holding.~~ **That framing is historical:** both M1 contracts were ratified on 2026-08-29 without this proof, and `M5` slices F and G shipped to production the same day. **Deferred until after the audit by founder decision 2026-08-29** and carried as a named liability — `Direction/decision_log.md` and `Blueprints/playbooks/debt-preflight-v1.md` register #1/#3. **Deferral, not waiver:** it must clear before beta invitations. It is `READY`, unblocked, read-only, and needs no founder hour, so nothing but the deferral is holding it. Every capability claim in both M1 contracts is fixture-proven only today, and `Blueprints/specs/mobile/m1-league-screen-data-plan-v1.md` §1 marks four rows ⚠️ unverified on purpose.
- **Cost:** small
- **Agent-buildable:** yes, in full. Read-only, through the Omen API.
- **Source:** the 2026-08-24 contract revision ([#364](https://github.com/justinduverge-design/omen/pull/364)). Both halves were deliberately shipped with their unproven edges named rather than smoothed over.
- **Scope — exactly four claims, no more:**
  1. **ESPN per-side projection shape** — the data plan asserts ESPN returns projected totals in the same `mMatchup` view. Inferred from surrounding usage, never parsed anywhere in `src/`.
  2. **Sleeper deadline field** — trade deadline / playoff start on the league settings object.
  3. **ESPN deadline field** — same, on ESPN league settings.
  4. **Trade personalization inputs against a real Sleeper league** — `src/services/tradeLeagueContext.js` currently resolves real settings only in tests. Confirm `roster_positions`, `scoring_settings.rec`, and `total_rosters` arrive in the expected shape from a live league.
- **Yahoo is in scope as a bonus provider** where a claim has a Yahoo analogue — its entitlement is live and two founder leagues are bound (`P1-YahooReauth`). It does **not** substitute for the ESPN or Sleeper proof.
- **Done when:** each of the four carries a live, sanitized evidence line (shape confirmed **or corrected**, dated, provider named); a claim that fails is reported as a finding against the contract rather than quietly worked around; and no league name, roster, manager identity, cookie, or token value appears in the evidence.
- **Do not touch:** no ESPN cookie or Yahoo token value in any artifact (facts-of-record #6); no write to any provider; no production action; **no edit to `m1-league-screen-data-plan-v1.md` — that reconciliation is `M11B` and waits for ratification.**

### M11B-M1ContractReconciliation — Reconcile the proof into the ratified M1 contracts

- **Status:** BLOCKED
- **Blocked by:** TASK-M1-Screen-League — **founder ratification, which `VERIFIED` does not represent.** That item is `VERIFIED` as a *proposal*; the gate is approval, and it is not `CLOSED`. Do not read its status as satisfying this blocker.
- **Blocked by:** TASK-M1-Screen-Trade — same, and ratification here is explicitly **not** pre-authorized.
- **Blocked by:** TASK-M11A-ProviderShapeProof — there is nothing to reconcile until the shape evidence exists.
- **Unblock:** 2026-08-28 REASSESSED — split out of `M11`. **The original reasoning holds for this half and is unchanged:** claim 5 and every reconciliation back into the data plan depend on which contract wins, so running them before ratification risks proving the wrong thing.
- **Priority:** P2 — nothing in beta depends on it.
- **Cost:** small
- **Agent-buildable:** yes once the contracts are ratified and `M11A` has landed.
- **Scope:**
  5. **The neutral-vs-personalized difference on real data** — the verdict flip is proven on deterministic fixtures; observe it once on a real roster, as presented by the ratified contract.
- **Done when:** `m1-league-screen-data-plan-v1.md` §1 has no remaining ⚠️ row that is merely inferred; **any claim that failed in `M11A` is degraded in the contract to the section it affects rather than the screen** (§2.5 gate 5 — no global parity claim from one provider); and no league name, roster, manager identity, cookie, or token value appears in the evidence.
- **Do not touch:** no provider credential value in any artifact; no write to any provider; no production action.

### M3A-QA — Native auth interactive real-device QA

- **Status:** READY
- **Blocked by:** EXTERNAL — interactive human device/inbox access and a genuinely disposable account are required for the remaining Android matrix and destructive deletion proof; no founder identity may be used as the deletion fixture
- **Unblock:** 2026-08-12 REASSESSED — the founder supplied the physical iPhone interaction needed for one successful native Sign in with Apple ceremony: the Apple sheet appeared, authorization completed, and Omen reached authenticated state. That is valid partial evidence, not the full matrix. Email OTP, return/cancel/background/termination cases, session restore, account deletion, log safety, and the Android half remain open.
- **Unblock:** 2026-08-13 PARTIALLY CLEARED — physical-iPhone evidence now covers Sign in with Apple, Face ID passkey registration/sign-in, Discord OAuth with PKCE return to Omen, six-digit email OTP, and persisted-session restore after force-close/reopen. Supabase custom SMTP was repaired with a Resend sending-only key scoped to `slopssaloon.com`; both signup and returning-user templates now emit `{{ .Token }}`, and Email OTP length is six digits. Xcode 26.6 passes **121 tests / 0 failures** after the callback and OTP-normalization fixes. **Status stays `READY`:** destructive account deletion was not run against a founder account, and Android email OTP/session restore/account deletion/log-safety interactive evidence remains open.
- **Unblock:** 2026-08-22 CLEARED — the founder's mandatory-security doctrine removes the approval classification. Auth, log-safety, session, and deletion testing are required operating evidence; founder-only device/inbox access identifies the human executor, not discretion to skip the controls.
- **Priority:** **P0 — auth is the front door**
- **Cost:** small, human-gated
- **Agent-buildable:** implementation and sanitized evidence preparation; credential/inbox/device interactions remain human-only, and destructive proof must use a disposable account
- **Done when:** Android Play-services AVD or real device proves Google sign-in, email OTP, session restore, account deletion, and log safety; iOS real device proves Sign in with Apple, email OTP, session restore, account deletion, and log safety.
- **Evidence:** sanitized QA matrix; no screenshots or logs containing credentials or tokens.
- **Do not touch:** real credentials in agent logs or screenshots.

### M4-Auth-Passkeys-iOS-Onramp — Complete native iOS passkey authorization

- **Status:** READY
- **Blocked by:** AGENT_RESOLVABLE — reconcile the founder-observed Face ID ceremony against the exact remaining acceptance steps and capture any missing fresh-install plus Account list/remove evidence without credential material
- **Unblock:** 2026-08-22 CLEARED — both founder blockers were stale. The reviewed passkey work merged as `81878d0`; the public AASA URL now serves HTTP 200 JSON without redirect for exactly `6RWR5G9894.com.slopssaloon.omen`; and `Blueprints/handoffs/2026-08-13-native-auth-completion.md` records the founder-observed physical-iPhone Face ID passkey and sign-out ceremonies. This is evidence reconciliation, not a new approval. The item remains open because the record does not explicitly prove every exact Done-when step (fresh install and Account list/remove).
- **Priority:** **P1 — founder pin 2026-08-12.** This supersedes the earlier P2 deferral for the iOS half only.
- **Cost:** small — implementation, public association, and the founder-observed Face ID path are complete; exact acceptance-evidence reconciliation remains
- **Current state:** merge `81878d0` implements the native `AuthenticationServices` provider, official Supabase first-factor passkey endpoints, account add/list/remove, one-time pairing offer, the `webcredentials:slopssaloon.com` entitlement, and the AASA artifact/explicit Express route. Xcode 26.6 (`17F113`) passes **121 tests / 0 failures**; Automatic Signing under team `6RWR5G9894` builds and installs the app on the registered iPhone with both Apple Sign In and Associated Domains in the signed entitlements. On 2026-08-22 the public AASA URL returned HTTP 200, `Content-Type: application/json`, no redirect, and exactly `6RWR5G9894.com.slopssaloon.omen`; the 2026-08-13 handoff records the founder-observed Face ID passkey and sign-out ceremonies.
- **Done when:** `https://slopssaloon.com/.well-known/apple-app-site-association` serves the exact team/bundle association as JSON without redirect; a fresh physical-device install can add a passkey, list/remove it in Account, sign out, and sign back in with Face ID; sanitized evidence records the ceremony without credential material.
- **Evidence:** merge `81878d0`; `Blueprints/handoffs/2026-08-12-m3a-ios-authorization-passkeys.md`; `Blueprints/handoffs/2026-08-13-native-auth-completion.md`; public `https://slopssaloon.com/.well-known/apple-app-site-association` read-only check 2026-08-22; `/private/tmp/omen-m3a-full-simulator-final.log`; `/private/tmp/omen-m3a-device-build-final.log` (local-only command logs, no credentials).
- **Do not touch:** Android passkeys, Xcode Cloud, archive/TestFlight, production deployment, provider secrets, UI redesign, or Figma in this item.

## B. Backend / recommendation lane

**Phase 2.** Backend feature work is essentially complete. What remains is merging what is built and then freezing.

### B2-D3-S2 — Merge and deploy the prepared-not-deployed set

- **Staleness note (2026-08-31):** `check-sprint-staleness.js` reports this STALE — status
  READY_FOR_REVIEW while PR #371 is merged. **Whether every `Done when:` clause was met is a founder
  judgement, not an agent one**, and the deploy action in this item is founder-gated by its own
  Blocked-by line. Left open deliberately, flagged for the founder to close or annotate. Do not
  auto-close.
- **Status:** READY_FOR_REVIEW
- **Claim:** 2026-08-26 Claude — agent half complete on `feat/m9-backend-gap-closure`; the deploy action remains founder-gated and was not performed.
- **Evidence:** `Direction/release_readiness.md` §"Not Deployed / Not Merged" is now **empty**, with per-item commit evidence. **Every item was already on `main`, most since 2026-06-03/04** — the section was stale by roughly twelve weeks, not the work outstanding. `GET https://slopssaloon.com/api/version` answered live from production on 2026-08-26, so one of the six was demonstrably deployed, not merely merged. B2-D3-S closed 2026-08-02 (PR #259). Zero PRs open. Founder deploy note: `Direction/reviews/2026-08-26-b2d3s2-deploy-note.md`.
- **Correction arising:** this item's own Scope line asserted six pieces of work were undeployed when `main` said otherwise, and `B-FREEZE` was blocked on it the entire time. Same failure mode the agent inbox records repeatedly, in the same direction: a status line trusted over `main`.
- **Blocked by:** FOUNDER — the deploy action and the PR merge. The original deploy step has nothing to carry; what is waiting is this session's new backend work.
- **Priority:** P0
- **Cost:** small
- **Agent-buildable:** merge preparation yes; the deploy action is founder-gated
- **Scope:** land the work sitting in "Prepared Locally, Not Deployed" — ESPN connect input normalization for pasted cookie fragments and full ESPN league URLs, the SPA `index.html` cache header fix, `GET /api/version`, Tier 2 smoke cleanup mode, the API route reference, and League Standings error-envelope polish. Also review and merge B2-D3-S if it is still open.
- **Skills:** `slops-code-review`, `slops-quality-baseline`, `slops-git-flow`, `slops-ship`
- **Done when:** `Direction/release_readiness.md` §"Not Deployed / Not Merged" is empty; `npm test` green; deploy approved and executed by Justin; post-deploy canary passes.
- **Do not touch:** ESPN cookie values in logs or echoes; production flags; SQL.

### B-FREEZE — Declare feature freeze

- **Status:** BLOCKED
- **Blocked by:** TASK-B2-D3-S2
- **Blocked by:** TASK-M3A-QA
- **Unblock:** 2026-08-22 CLEARED — `TASK-M4-CC-PlatformsCompact` CLOSED (Android render + assembly/scanner/connected-test evidence, handoff for `6466a4c`).
- **Unblock:** 2026-08-22 CLEARED — `TASK-M4-Help-Support-Implementation` CLOSED (TalkBack, font-scale, compact/large-phone, and iOS accessibility-audit evidence).
- **Unblock:** 2026-08-28 CLEARED — `TASK-M4-Auth-Providers-v1` retired as satisfied; that task is `CLOSED`. Discord OAuth shipped on both platforms (#198). `TASK-B2-D3-S2` and `TASK-M3A-QA` remain.
- **Unblock:** 2026-08-11 ROUTED — split from a single untyped comma list into typed, machine-readable lines per `Direction/status-model.md`. No dependency was added or removed.
- **Priority:** P0
- **Cost:** trivial
- **Phase:** 2 gate
- **Agent-buildable:** no — founder declaration
- **Source:** the discipline that makes the rest of the plan possible. After freeze: bug fixes only, until beta feedback justifies new work.
- **Done when:** freeze is declared in `Direction/decision_log.md`; every remaining non-bug item is moved to the deferred backlog; agents are instructed to reject new feature scope.
- **Do not touch:** new features after this lands.

## S. Security lane

**Phase 4.** Most of this is already closed — A3 verified, F1 verified, Stripe removed, legal shipped, 0 production vulns, GDPR module retired with a regression test. What remains is the last mile plus one mobile-specific threat model.

### S1 — Final production secrets and Supabase settings review

- **Status:** READY
- **Unblock:** 2026-08-22 CLEARED — founder established that required security controls are mandatory operating practice, not optional approval gates. Founder-only dashboard access identifies the executor; it does not make leaked-password protection or secret-scope verification discretionary.
- **Priority:** P0
- **Cost:** small
- **Agent-buildable:** checklist preparation only
- **Scope:** final pre-beta pass over production secrets and Supabase settings. Includes the A3 carry-over: **leaked-password protection is disabled in Supabase Auth** (one-toggle fix). **New finding 2026-08-24:** enabling it requires the Supabase **Pro** plan — it is not available on the current plan tier.
- **Unblock:** 2026-08-11 REASSESSED — founder reports partial progress: additional authentication providers enrolled and further Supabase configuration completed. **Recorded, not credited.** The named acceptance criterion here is leaked-password protection plus a per-secret presence-and-scope pass, and neither has been evidenced. Confirm the specific toggle and produce the secret inventory before this moves.
- **Unblock:** 2026-08-24 PARTIAL PROGRESS — Claude-prepared checklist walked with the founder. Git secret-hygiene check done and clean (`git ls-files | grep ^\.env` shows only `.env.example`; nothing else tracked). Two real findings along the way: (1) `README.md`'s "Secrets: Infisical" description is stale — production secrets actually live in a hand-managed `deploy/hostinger/.env.production` on KVM1, confirmed by reading `deploy.yml` directly; Infisical is the founder's separately maintained secrets mirror, not the live path. (2) `INFISICAL_TOKEN` is still present in GitHub Actions secrets and unused by any current workflow — flagged for the founder to delete. Both corrections logged in `Direction/decision_log.md` (2026-08-24 entries).
- **Blocked by:** FOUNDER_APPROVAL — leaked-password protection requires upgrading the Supabase plan (Pro); founder has not decided whether to upgrade.
- **Unblock:** 2026-08-24 DEFERRED — the per-secret presence-and-scope pass (the KVM1 `.env.production` check) could not be completed this session: the founder's Hostinger browser-terminal did not open. No SSH-key setup exists yet as a fallback. Resume via either (a) retry the Hostinger panel's browser terminal, or (b) set up a normal SSH client connection to KVM1 if the browser terminal keeps failing. Not blocking anything else in the sprint.
- **Skills:** `security-privacy-evidence`
- **Done when:** every production secret is confirmed present, correctly scoped, and unexposed; leaked-password protection is enabled; findings are recorded without values.
- **Do not touch:** secret values in logs, agent output, or evidence files.

### S2 — Rotate credentials exposed during local branch work

- **Status:** READY
- **Blocked by:** None
- **Unblock:** 2026-08-22 CLEARED — credential containment and required rotation are mandatory release controls. Founder-only credential access is an execution boundary, not a decision about whether the control applies.
- **Unblock:** 2026-08-22 REASSESSED — founder confirmed Yahoo access is not restored and the Apple `.p8` key has probably not been moved. ESPN cookies do not satisfy rotation merely by aging: `espn_s2` is an expiring session cookie with no Omen refresh flow, while `SWID` can remain stable; a fresh validated reconnect overwrites the existing Vault secrets, but invalidation of the old ESPN session or evidence that it was never exposed is still required.
- **Priority:** P1
- **Cost:** small
- **Agent-buildable:** no
- **Source:** ESPN adapter work ran against local branches with provider access. Rotate anything that could have been captured in a local log, shell history, or branch artifact before real testers arrive.
- **Unblock:** 2026-08-11 REASSESSED — no rotation evidence exists on `main`. Founder-reported Supabase configuration work is **not** rotation and does not satisfy this item. **Newly in scope:** P1-YahooReauth will mint a fresh Yahoo token, which discharges the Yahoo portion of this item if the old `token_secret_id` is retired rather than left orphaned — sequence S2's Yahoo half after that item and record it.
- **Unblock:** 2026-08-24 PARTIAL — **ESPN half done.** Founder ran a fresh validated ESPN reconnect, overwriting the prior Vault-stored `espn_s2`/`SWID` values. **Apple `.p8` half deferred, not done:** the key still sits under `C:\Users\JDuve\dev` (Windows), inheriting `CodexSandboxUsers:(I)(RX)` read access. Moving it requires the founder to be physically at that Windows machine — Claude's device bridge this session only reaches the founder's Mac, not Windows, so this step could not be walked through live. Exact relocation steps (find the `*.p8` file, cut, paste into a password manager's file storage or any folder never shared with an agent tool, confirm the old path is empty) were given to the founder in-session and are simple enough to re-request whenever he's next on that machine. **Yahoo half still blocked** — entitlement not restored (facts-of-record #11).
- **Unblock:** 2026-08-28 REASSESSED — **the Yahoo half is now dischargeable.** The 2026-08-24 entry above recorded it blocked on an entitlement that was not restored; Yahoo granted access on 2026-08-28 and a fresh token was minted and accepted mid-call (`P1-YahooReauth`). Per the 2026-08-11 entry, that discharges the Yahoo portion **only if the old `token_secret_id` is retired rather than left orphaned** — that retirement is not yet evidenced and is the remaining Yahoo work. **The Apple `.p8` half is unchanged and still needs the founder at the Windows machine.**
- **Done when:** any credential that touched local branch work is rotated or explicitly cleared as never-exposed, with the decision recorded.
- **Do not touch:** credential values in any written record.

### S6 — KVM2 public Nginx exposure (`openclaw.slopssaloon.com`)

- **Status:** READY
- **Blocked by:** None
- **Unblock:** 2026-08-11 CLEARED — founder decision: **`openclaw` is no longer wanted. Retire it.** The item is *not* closed, because the decision half is what got answered; the public surface described below is still live. Scope below is narrowed from "investigate and decide" to "execute the retirement."
- **Priority:** **P1 — public attack surface on a host designated private**
- **Cost:** small
- **Agent-buildable:** investigation and a written takedown plan only; **any change to KVM2 is founder-executed** and needs its own action-level approval
- **Source:** surfaced by the Raspberry Pi live VPS discovery (2026-08-07/08), still open. KVM2 (`srv1647690` / `100.67.187.57`) is documented as the **private** Ollama/Gemma AI host — Ollama is correctly bound to its Tailscale address only. But Nginx on that same host listens **publicly on 80/443** (IPv4 and IPv6), Certbot-managed, serving `openclaw.slopssaloon.com` → `127.0.0.1:3200`.
- **Why it matters:** a host whose stated role is "private AI, reachable only over Tailscale" is accepting connections from the public internet, on the same box as the model endpoint. That is not automatically a vulnerability, but it is an unowned public surface on a machine the architecture treats as private, and nobody has confirmed the upstream on `:3200` is alive, patched, or still wanted.
- **Skills:** `security-privacy-evidence`, `rbac-risk-review`
- **Done when:** the `openclaw.slopssaloon.com` vhost no longer serves publicly, its Certbot renewal is removed so no cert renews for a dead name, the `127.0.0.1:3200` upstream is confirmed stopped, DNS for the subdomain is retired, and KVM2's remaining public 80/443 listeners are inventoried and shown to be either intended or also removed. Record before/after listener state.
- **Do not touch:** do not disable Nginx wholesale or alter other KVM2 configuration as part of Omen work — the Pi tracker explicitly warns against this. Retire this one vhost, not the web server. Agents investigate read-only and produce the plan; the founder runs it.

### S7 — Retire stale cloud-AI runtime dependencies (OpenAI **and Anthropic**)

- **Status:** READY
- **Blocked by:** None
- **Priority:** P2
- **Cost:** small
- **Agent-buildable:** yes
- **Source:** open audit item from the Pi deployment tracker. Live `/api/ready` reports `provider=local, model=gemma3:4b, transport=openai_compatible_chat_completions, private_route_required=true`. **`openai_compatible_chat_completions` describes the wire protocol, not the vendor** — the proven route points at private KVM2/Ollama. But the naming is readable as "Omen sends data to OpenAI," which contradicts the Privacy Notice statement that Omen does not send user or fantasy-platform data to a cloud AI provider.
- **Scope widened 2026-08-11 — `@anthropic-ai/sdk` is the same defect.** Found while triaging Dependabot #287 (`0.115.0 → 0.116.0`). It is declared in root `package.json:15` as a **production** dependency and **imported nowhere in the codebase** — the only non-package matches are in gitignored `graphify-out/` artifacts. Residue remains at `src/config/index.js:64-65` (`anthropicApiKey: process.env.ANTHROPIC_API_KEY`) and a stale comment at `src/omen_prompt_loader.js:7` referring to "the Anthropic API." Same risk shape as the OpenAI naming above: a cloud-AI vendor SDK shipping in the production dependency tree contradicts the Privacy Notice claim that Omen sends no user or fantasy-platform data to a cloud AI provider. It also means Dependabot will keep opening bumps for a package nothing calls.
- **Done when:** source and configuration are searched for stale OpenAI- **and Anthropic**-specific dependencies, keys, fallback paths, or environment variables; `@anthropic-ai/sdk` is removed from `package.json` or its live use is documented; the `ANTHROPIC_API_KEY` config slot and the `omen_prompt_loader.js` comment are removed or corrected; production config is confirmed to require no cloud-AI credential of any vendor; intentionally-generic protocol naming is documented so it cannot be misread as vendor use.
- **Do not touch:** the working private Ollama route; secret values.

### S5 — Mobile token storage review

- **Status:** **VERIFIED 2026-08-18.**
- **Detail:** `Direction/sprint-verified-detail.md` § `S5` — evidence, claims, and correction history.

### O1c — Product analytics (Umami) — deferred

- **Status:** DEFERRED to post-beta
- **Detail:** `Direction/sprint-verified-detail.md` § `O1c` — evidence, claims, and correction history.

### O3 — Post-deploy canary

- **Status:** READY
- **Blocked by:** None
- **Priority:** P1
- **Cost:** small
- **Agent-buildable:** yes
- **Skills:** `slops-canary`
- **Done when:** after a deploy, health/ready endpoints, key routes, error rate, and p95 latency are checked against a known-good baseline, producing a pass/hold/rollback recommendation.
- **Do not touch:** executing a rollback automatically — recommend only.

## P. Launch-blocking defects — discovered 2026-08-11

All four were found by reading live production state against the code, not by reading the queue.
None of them existed as sprint items before this pass, and three of them sit directly on the
Section K launch gate. Evidence for each is a live authenticated call against `slopssaloon.com`
recorded the same day.

**Why this section exists:** the queue's picture of Yahoo was wrong in both directions — it was
typed as a founder-credentials gate when the account was already connected, and separately assumed
to need re-integration when the real fault is a stale token. Grouping these keeps the discovery
event traceable.

### P1-YahooReauth — Re-authorize Yahoo under the re-approved API app

- **Status:** ✅ **DONE — UNBLOCKED AND SHIPPED 2026-08-28.** Yahoo granted the entitlement for app `ZcZJXm8V`. A read-only probe from inside `omen_api` returned **2
- **Detail:** `Direction/sprint-verified-detail.md` § `P1-YahooReauth` — evidence, claims, and correction history.

### F6 — Real-account QA: ESPN

- **Status:** BLOCKED
- **Blocked by:** FOUNDER_DEVICE — execute the sanitized real-account ESPN matrix on both iOS and Android without exposing cookie names or values. Credentials and device execution are the remaining gate for the non-Omen flows; the Omen-recommendation flows are additionally season-gated until 2026-09-05.
- **Unblock:** 2026-08-26 CLEARED — ~~production reports the 2026 regular season open at Week 1. The former season floor is stale; the full ESPN matrix is now runnable.~~ **WITHDRAWN — see below. Do not act on this entry.**
- **Unblock:** 2026-08-28 REASSESSED — the 2026-08-26 entry above is **false and is withdrawn**. It read a clamped week as a fact about the world: `getCurrentNflWeekContext()` floors `week` at 1 and derives `season_type` from the same clamp, so it reported `week: 1, season_type: "regular"` while `raw_week` was `-1` and `isOffSeason()` was `true` the whole time. `facts-of-record.md` #10 withdrew the identical claim on 2026-08-27; this item's copy was missed. Re-verified live 2026-08-28: `GET /api/system/current-week` returns `is_off_season: true`, `raw_week: -1`. **The season floor stands and clears 2026-09-05.** `is_off_season` is the authority; never read `week` or `season_type` as evidence the season started.
- **Corrected 2026-08-19.** This line previously read `Blocked by: None`, which made a season-floored P0 read as immediately pullable — and it was surfaced as a candidate by the staleness sweep for exactly that reason. The connect/recovery/waiver/drafted-league halves *are* workable now and can be matrixed ahead of time; only the Omen-recommendation half is floored. Split the evidence and state which half was proven, per facts-of-record #10.
- **Unblock:** 2026-08-11 CLEARED — real ESPN account connected and drafted; league *Las Vegas Pro Head to Head Points PPR*. `GET /api/platforms` confirms `espn: connected, 1 league` (verified live, 2026-08-11). Credentials are no longer the gate.
- **Priority:** **P0 — highest risk item in the plan**
- **Cost:** medium
- **Agent-buildable:** preparation and matrix only
- **Source:** #265/#266/#267 are merged but **not provider-proven** beyond a read-only aggregate proof. ESPN is the newest code and the most fragile auth path.
- **Scope:** connect, recovery/reauth, waiver pool, drafted-league behavior, and Omen recommendations end to end on a real ESPN account, on both native apps.
- **Done when:** every flow passes on a real account on iOS and Android, with a sanitized matrix and no cookie name or value in any log, screenshot, or payload.
- **Do not touch:** ESPN cookie values anywhere; real credentials in agent output.

### F7 — Real-account QA: Yahoo

- **Status:** READY
- **Blocked by:** None
- **Unblock:** 2026-08-28 CLEARED — `TASK-P1-YahooReauth` is done. Yahoo granted the Fantasy Sports API entitlement for app `ZcZJXm8V`; `YAHOO_ENABLED=true` on `omen_api` and `omen_cron`, `YAHOO_CONNECTIONS_ENABLED = true` in the frontend, both founder leagues bound (`470.l.1255365`, `470.l.1358570`) with metadata, `current_week`, team key and a 15-player roster returning on the deployed image. Evidence: `Blueprints/handoffs/2026-08-28-yahoo-entitlement-live-and-league-binding-fix.md`. **The Omen-recommendation half of this matrix still cannot pass before kickoff 2026-09-05** (facts-of-record #10); the connect/session/standings halves are runnable now.
- **Unblock:** 2026-08-11 REASSESSED — the old `FOUNDER_APPROVAL — real account credentials` typing was wrong in both directions. A real Yahoo account with a drafted league exists, and `GET /api/platforms` reports `yahoo: connected, 1 league`. But `/api/dashboard/summary` returns `waiver_wire: "needs_platform"`, which is only reachable when `hasUsableYahooToken()` fails — so the connection row is live while the **OAuth token is expired or its `token_secret_id` is missing**. This is a token problem, not a credentials problem and not a re-integration. Retyped to depend on P1-YahooReauth.
- **Priority:** P0
- **Cost:** medium
- **Agent-buildable:** preparation and matrix only
- **Done when:** connect, session restore, Omen recommendations, and League Standings pass on a real Yahoo account on both platforms, with a sanitized matrix.
- **Do not touch:** provider credentials in logs or screenshots.

### F8 — Real-account QA: Sleeper

- **Status:** READY
- **Blocked by:** None
- **Unblock:** 2026-08-11 CLEARED — real Sleeper account connected and drafted; league **Omen App Data** (confirmed by founder, 2026-08-11). `GET /api/platforms` confirms `sleeper: connected, 1 league` (verified live, 2026-08-11). Omen-half acceptance still waits on season start.
- **Priority:** P0
- **Cost:** medium
- **Agent-buildable:** preparation and matrix only
- **Scope:** includes the known gap — `GET /api/sleeper/roster` requires an explicit `week` param and there is no auto week detection. Verify the app always supplies it correctly, including at week boundaries.
- **Done when:** connect, Omen recommendations, trade candidates, and the explicit-`week` path all pass on a real Sleeper account on both platforms.
- **Do not touch:** provider credentials in logs or screenshots.

### F10 — Real-device matrix

- **Status:** READY
- **Blocked by:** None
- **Priority:** P1
- **Cost:** medium
- **Agent-buildable:** automated sweep yes; real-device confirmation human
- **Scope:** iPhone SE (375×667), a large iPhone, and a Pixel-class Android. Most fantasy traffic is phone traffic.
- **Skills:** `mobile-first-qa-playbook`, `slops-mobile-smoke`
- **Done when:** no horizontal overflow, no touch target under 44px, safe-area insets correct on fixed elements, no input under 16px, and no JS errors — across the matrix, with severity-ranked findings resolved or explicitly accepted.
- **Do not touch:** treating the automated sweep as a substitute for real-device QA.

### F11 — Accessibility pass

- **Status:** READY
- **Blocked by:** None
- **Priority:** P1
- **Cost:** medium
- **Agent-buildable:** yes
- **Source:** Apple review checks this, and M4-Help-Support already requires it. Doing it once, app-wide, is cheaper than per-item.
- **Skills:** `slops-ui-ux-audit`
- **Done when:** VoiceOver and TalkBack traverse every primary flow; Dynamic Type and font-scale hold to the largest supported setting without clipping; WCAG AA contrast passes on both themes.
- **Do not touch:** shipping a screen that traps focus or strands a screen-reader user.

### F5 — ESPN connect walkthrough recording

- **Status:** READY
- **Blocked by:** None
- **Priority:** P2 — doubles as an onboarding and store-preview asset
- **Cost:** small–medium
- **Source:** production `/espn-connect` still shows the placeholder "A mock 90-second Chrome/Edge walkthrough is coming here."
- **Scope:** record the ~90-second walkthrough using mock/demo data only — no real ESPN account or credentials. Embed on `EspnConnectGuide.jsx`, replacing the placeholder.
- **Done when:** the asset exists, renders on desktop and mobile, and contains no real ESPN credentials, cookies, or account data.
- **Do not touch:** real ESPN account/credentials in the recording; any live cookie values.

## K. Marketing — hold until Phase 4 closes

Nothing public ships until F6–F9 pass. There is no value in driving signups into unproven provider auth. Fantasy is seasonal and word-of-mouth: **ten engaged testers in real leagues during the season beat a thousand cold signups in November.**

- **K1** — landing page and store copy honest about mock vs live; **no Draft Assistant claims** (pairs with R7). Before beta.
- **K2** — recruit 10–20 beta testers from existing leagues. At beta open.
- **K3** — feedback channel, Discord or in-app. At beta open.
- **K4** — Omen of the Week / `slops-explainer-cut` content. After Week 1.
- **K5** — Reddit and community push. After two stable weeks.

## Deferred / paused backlog — not selectable

These are real but are **not** active tasks and carry no status. They must not displace P0/P1 beta work, and they are not eligible for selection until `planning-pass` promotes them.

- **Draft Assistant 2027** — cut from 1.0 on 2026-08-05. Winter track: build the Slops ADP Oct–Feb, off the critical path.
- **M4-Auth-Passkeys-Android-Onramp** (P2) — Android remains deferred; the founder promoted only the iOS half on 2026-08-12.
- **M8-EdgeAndroid-PostBeta** — after beta, test Omen's existing Chromium extension on a real Android device and pursue Microsoft Edge mobile-extension eligibility first. The experiment must prove HttpOnly-cookie access and one-shot in-memory handoff before any submission; mobile curation is external and no publication is pre-approved. Firefox direct-message port remains the fallback if Edge is not technically viable or not admitted.
- E1 mobile scope decision — **resolved 2026-08-05** by the both-platforms decision. E2/E3 app-store closeout is superseded by lane R.
- G1 win-streak reward ladder UI waits on a backend win-streak contract.
- G2 ESPN live draft Lazy Sync and G3 Yahoo live draft Lazy Sync wait on a stable provider contract and season timing.
- G4 IDP support remains P3 and needs an explicit supported-league/data scope.
- G5 skeleton narration states should fold into the relevant native composition.
- G6 Umami integration — **unblocked by O1** once that lands; promote then.
- G8 baked-black PNG fallback deletion waits on a clean production soak.
- G9 code TODOs must be split into separate tasks.
- **Platforms strip status dot (post-beta polish)** — founder decision 2026-08-14: **not for beta, revisit before launch.** Add a status indicator dot to `OmenPlatformCompactRow` on both platforms. Two constraints are not optional when it is picked up: (1) use the existing **verdigris / crimson** semantic tokens, **not raw green/red** — red/green is the worst pair for the most common colorblindness (~8% of men); (2) give the dot a **non-color differentiator** (filled = connected, hollow ring = disconnected), because the design house forbids status that color alone carries. **Bonus the dot unlocks:** a dot is far narrower than the word "Connected", so the row can drop the redundant platform-name text at large Dynamic Type and stop truncating to `Co…` at XXXL on iPhone SE. The founder accepted that truncation on 2026-08-14 (`#304`), so this is polish, not a defect fix — but the two land naturally together.
- G10 post-live learning waits on Release Done, seven stable days, and `slops-product-pulse`.
- M5 theme packs / skins deferred behind M4 — core Omen themes and accessibility first.

## Required kickoff output

Before implementation, the agent must print:

1. task ID and exact scope;
2. priority, cost, blockers, and done-when;
3. selected skills and N/A reasons;
4. files expected to change;
5. test/evidence plan;
6. do-not-touch boundaries;
7. branch name and serialization/hot-file check.

If the pulled item's done-when cites CI, state the local-evidence substitute you will record instead.

## Required closeout output

The handoff must include:

- actual files changed;
- intended RED, GREEN, broader tests/build/audit results as applicable;
- UI/security/legal/AI evidence as applicable;
- actual skills used, skipped, substituted, or weak;
- one concrete skill improvement or an explicit "no correction needed" verdict;
- branch/commit/PR/deploy status without implying local work is live.

## Guardrails

- Do not recreate an `Omen/` nested directory.
- Do not touch `.env`, secret values, DNS, SSL/TLS, Nginx, production infrastructure, Supabase migrations/schema, Apple credentials, or production flags without explicit approval.
- **Store items are founder-executed:** Apple/Google accounts, signing certificates, provisioning profiles, release configuration, and metadata submission. Agents may prepare artifacts; they may not act on store accounts.
- Do not deploy unless Justin explicitly approves the deploy action.
- Docs/doctrine-only pushes must not restart KVM1.
- ESPN cookie values must never appear in logs, UI, screenshots, URLs, analytics, share payloads, or stored app state outside the approved backend secret flow.
- Mock/demo/stale/offline data must be visibly labeled and never represented as live fantasy advice.
- Account deletion copy and exact confirmation phrase `DELETE MY OMEN DATA` require fresh approval before change.
- Team-based runtime theming is removed. Do not revive team skins without a new approved theme-pack plan.
- No paid dependency, cloud model spend, or external service commitment without explicit approval.
- **Draft Assistant is not a 1.0 feature.** Do not advertise it, build against it as a launch dependency, or let it back into scope without a new founder decision.

---

## Lane: Beta Rework — Wave 1 (added 2026-08-31)

Source: `Blueprints/specs/mobile/omen-app-pages-workshop-v1.md`.
Contract: `Blueprints/specs/mobile/omen-wave1-contract-v1.md`.
Waves 2–5 get their own contracts and are **not** queued here yet — they are listed in
`Direction/roadmap.md` so the sequence is visible without inviting a premature pull.

### W1-ANDROID-CI — Nothing runs Android unit tests

- **Status:** READY
- **Blocked by:** None
- **Priority:** P1 — a design-system guard is red today and nothing is reporting it
- **Cost:** small
- **Agent-buildable:** yes
- **Source:** found 2026-09-03 during the W1-A Android port. `deploy.yml` runs backend tests,
  `ios-ci.yml` runs iOS, `ui-quality.yml` watches `frontend/src/**`, and the **only** workflow
  naming `gradlew` is `native-visual-evidence.yml`. Nothing runs `./gradlew testDebugUnitTest`.
- **What it has already cost:** `core:designsystem`'s `PrimitiveEnforcementTest` fails today on
  pre-existing raw `TextButton` / `Color(0x…)` in `app/auth/OmenAuthFlow.kt` and
  `app/feature/connect/ConnectScreen.kt` — byte-identical to `main`. Red, unreported, for an
  unknown length of time.
- **Same class as the `WelcomeView` scaffold failure** on the same day: a check that only runs
  when someone remembers is a check that does not exist. That one at least sat in a suite CI ran;
  this one is not run at all.
- **Scope:** an Android job mirroring `ios-ci.yml` — `./gradlew testDebugUnitTest` on PRs touching
  `mobile/android/**`. Then decide the `PrimitiveEnforcementTest` violations **separately**:
  either fix the two files, or allowlist them with a written reason and retirement plan, which the
  test's own doctrine requires and which is a design-steward call, not a build fix.
- **Done when:** an Android PR touching `mobile/android/**` runs its unit tests in CI and fails
  correctly on an injected violation.
- **Do not touch:** the enforcement test itself. Making the suite green by weakening the guard is
  the one wrong fix.

### W1-A — ESPN in-app connect sheet (iOS + Android)

- **Status:** VERIFIED — 2026-09-03. All acceptance clauses met; one residual noted below.
- **Detail:** `Direction/sprint-verified-detail.md` § `W1-A` — evidence, claims, and correction history.

### W1-B — In-app report and beta feedback pill

- **Status:** READY
- **Blocked by:** None
- **Priority:** P0 — without it the next beta round teaches us nothing
- **Cost:** medium
- **Agent-buildable:** yes
- **Scope:** floating report pill compiled into **beta builds only** (build flag, not a runtime
  toggle); report payload of message, screen enum, version/build/OS/device, a screenshot the user
  reviews and may redact or drop, connection state as provider+status only, and scrubbed recent
  error codes. New `beta_reports` table with **RLS in the first migration**, not added after.
- **Done when:** a report with a screenshot round-trips and is readable in the digest; emitted bytes
  contain no league name, roster entry, token, or cookie; the pill is absent from a
  release-configuration binary, proved by inspecting the build.
- **Do not touch:** email as a user identifier in the payload; league or roster content of any kind.

### W1-C — Founder Digest and alerts

- **Status:** READY
- **Blocked by:** None
- **Priority:** P0
- **Cost:** medium
- **Agent-buildable:** yes (backend lane)
- **Scope:** daily digest over Resend (already wired), **silent on a day with no reports and no
  incidents**. Four sections: what users said (themed, with every raw report reproduced beneath),
  what's broken or shaky in plain sentences, what needs money or attention soon, and how many people
  used it. Summarization is **local Ollama only**. In-house analytics events into Supabase. Alerts
  limited to the two founder-interrupting categories per facts-of-record #18.
- **Done when:** a digest generates from seeded data and reads start to finish for a non-technical
  reader with no follow-up questions; with the local model stopped the digest still sends, complete,
  saying summarization was unavailable; a forced backup failure raises the alert; nothing outside
  the two alert categories fires.
- **Open gap that blocks completion:** **email is not a paging mechanism.** "The app is down" must
  reach the founder when he is not reading email. The channel is undecided; W1-C is not complete on
  email alone.
- **Do not touch:** the `AI_PROVIDER=cloud` fail-closed branch or the public-host guard in
  `src/services/llm.js`. Relaxing either is a founder decision, not part of this item.

### W2-Typography — Retire DM Mono across both native platforms

- **Status:** SUPERSEDED 2026-09-07 by the one-typeface founder decision, which retired DM Mono
- **Detail:** `Direction/sprint-verified-detail.md` § `W2-Typography` — evidence, claims, and correction history.

### W1-CONSENT — Plain consent line on the live ESPN connection

- **Status:** VERIFIED
- **Detail:** `Direction/sprint-verified-detail.md` § `W1-CONSENT` — evidence, claims, and correction history.

### W1-REVIEW — First Beta App Review submission, with the existing ESPN path

- **Status:** BLOCKED
- **Blocked by:** ~~TASK-W1-CONSENT~~ — **satisfied 2026-09-01**, `VERIFIED`. Not struck from the
  list until it carries a `Closure:` value; the work itself is done and is not what holds this item.
- **Blocked by:** ~~TASK-W1-DEMO-NAMES~~ — **satisfied**, `VERIFIED`. Same caveat.
- **Blocked by:** FOUNDER — build upload and App Store Connect submission are founder actions.
  **This is now the only live blocker.** Both task blockers were met before 2026-09-02 and this item
  has read as multi-blocked ever since, which understated how close it is. Reconciled 2026-09-07.
- **Runbook:** `Blueprints/playbooks/first-app-review-submission-runbook.md` — every agent-verifiable
  fact is verified there. **The Release archive builds** (`ARCHIVE SUCCEEDED`, team `6RWR5G9894`),
  version `0.1.0` build `4`, and the archive carries the **production** API base URL
  `https://slopssaloon.com`, not the `example.invalid` committed default. `release_readiness.md`
  listed build upload as untested; the archive half is now proven, the upload half still needs the
  founder's account.
- **Carry into the submission:** the Safari-extension paste block must **not** be included — no
  extension target exists in `project.pbxproj` and no `PlugIns` directory is produced. And
  `OMEN_IOS_APP_STORE_URL` is empty in the archive, so `ForcedUpdateView`'s button has nothing to
  open — acceptable for a first submission (the URL cannot exist before the listing does), but
  `min-version` must never be raised against a build whose store URL is blank.
- **Verified 2026-09-01:** the reviewer path was walked end to end on an iPhone 17 simulator. Try
  Demo reaches a populated, correctly labelled Command Center, and the Omen destination renders a
  full decision brief. **The path described in the reviewer notes works today** — which is precisely
  why facts-of-record #19 now defers the demo-mode cut until after approval.
- **Known and accepted in this build, not blockers:** light-mode contrast (#340) and Dynamic Type
  (#338) are Wave 2; confidence still renders as the numeric `72` with a gradient bar, since bands
  are a payload-contract change.
- **Priority:** P0 — this is the gate that answers the ESPN question, and it is on the critical path
  regardless (`omen-1.0-plan.md` R6)
- **Cost:** medium
- **Agent-buildable:** build preparation yes; submission is founder-gated
- **Scope:** get a build carrying the **existing** ESPN connect path through Apple's first Beta App
  Review. **Apple has never reviewed this app** — `Direction/release_readiness.md` records build
  upload as untested and no Beta App Review performed — so the guideline 5.2.2 question about ESPN
  has never actually been put to the only party that enforces it.
- **Sequencing rationale:** `W1-A` is the largest build in Wave 1 and rests entirely on ESPN
  surviving review. Submitting first costs nothing extra, because this review is required before
  external TestFlight either way, and it converts an untested assumption into an answer **before**
  the money is spent. If review passes, `W1-A` proceeds knowing ESPN survives. If it is rejected,
  that is learned at the cost of a submission rather than a feature.
- **Done when:** a build is submitted and Apple returns a decision; the outcome — approval, or the
  exact rejection text — is recorded in `Direction/decision_log.md` and `W1-A` is unblocked or
  rescoped accordingly.
- **Carry into the submission:** the prepared App Review answer in
  `Blueprints/specs/mobile/omen-wave1-contract-v1.md` §W1-A, ready to send if a reviewer asks.

### W1-DEMO-NAMES — Generic demo fixtures, so the app matches the reviewer notes

- **Status:** VERIFIED
- **Detail:** `Direction/sprint-verified-detail.md` § `W1-DEMO-NAMES` — evidence, claims, and correction history.

### W1-TABBAR — Tab bar uses the Omen accent, not iOS system blue

- **Status:** VERIFIED
- **Detail:** `Direction/sprint-verified-detail.md` § `W1-TABBAR` — evidence, claims, and correction history.

### X1-RESEARCH — Is there a lawfully usable NFL player photo source?

- **Status:** READY
- **Pulled from deferral by founder instruction 2026-09-05.** The founder asked for the photo
  work to be queued. This is the half that can be queued: the licensing question is the stated
  blocker on the design stage, so answering it is the only work that moves the item.
- **Intent:** `Direction/intents/2026-09-05-player-photo-in-omen-of-the-week.md`
- **Decision:** `Direction/decision_log.md` 2026-09-05 (later), amended 2026-09-05 (founder queue)
- **Skill:** `pre-build-research`
- **Priority:** P2 — below every Week 1 item. Queued, not prioritized over the season gate.
- **Cost:** small
- **Agent-buildable:** yes, in full
- **Scope:** answer whether a free, lawfully usable NFL player headshot source exists at Omen's
  commercial posture. Record the licence terms, the attribution requirement if any, the
  identifier the source keys on, and whether that identifier maps to the player ids Omen already
  holds. If no free source qualifies, price the paid options rather than returning empty-handed.
- **Done when:** a dated research artifact states a verified answer with its licence evidence,
  and either names a usable source or records that none exists at this posture.
- **Do not:** write the spec, choose a card layout, or touch §4. This item answers one question.
- **Do not touch:** the headshot prohibitions in §1.2, §5.1, and §8.2.

### X1-PlayerPhotoOmenOfWeek — Player photo on the This Week's Omen lead card

- **Status:** DEFERRED — build half only; see `X1-RESEARCH` above
- **Detail:** `Direction/sprint-verified-detail.md` § `X1-PlayerPhotoOmenOfWeek` — evidence, claims, and correction history.

### X2-PulseToLeague — Move League Pulse off Command Center and onto the League page

- **Status:** QUEUED — not started
- **Decision:** founder, 2026-09-11, during the colourway session: "we need to notate that we
  want to move pulse into the league page, at a later date."
- **Priority:** none yet — explicitly "a later date", after the beta going out 2026-09-11
- **Cost:** unknown — not estimable until the League screen contract is read
- **Agent-buildable:** the move is; the resulting League composition is not, see the gate
- **Scope:** League Pulse leaves Command Center and lands on the League page. Command Center
  loses the Pulse segment from its Waiver / Ledger / Pulse control, which becomes two.
- **Why now-ish:** Command Center is close to done in the founder's read. Matchup carousel and
  the Waiver/Ledger popovers are where he wants them; Pulse is the remaining structural
  misplacement rather than a visual one.
- **Blocked by:** FOUNDER_APPROVAL / design authority — this is **cross-screen product
  structure, not visual design**, and the standing native design grant explicitly reserves
  "moving a feature between screens (e.g. League Pulse off Command Center)" to the founder.
  The decision above authorizes the *intent*; the League-side composition still needs a
  contract or a Figma pass before code.
- **Watch for:** League Pulse already carries real wiring history — see `decision_log.md`
  2026-08-xx, where `leaguePulse(for:)` derived from `dashboard-summary.v1` tool status and
  discarded the `league-standings.v1` rank/wins/losses it needed. Moving the surface must not
  re-strand that data path. Read those entries before planning.
- **Done when:** League Pulse renders on the League page against the same honest-state rules it
  follows today, Command Center's segmented control reads Waiver / Ledger with no dead third
  segment, and no state is invented on either side.
- **Do not touch:** the honest-state contract — Pulse says when it has nothing, on either page.

## Founder's stated order of work after the 2026-09-11 beta

Recorded from the founder verbatim so the next session does not re-derive it. This is a
running order, not a commitment with dates:

1. **Matchup carousel touch-up** — "we almost had the matchup carousel the way I like it."
   The founder has a screenshot he intends to mark up; it was mentioned but **not yet
   provided**, so do not start this from a guess about what he wants changed. Ask for it.
2. **X2-PulseToLeague**, above.
3. **Omen page**, or **the Account page** — founder undecided between them: "then we'll move on
   to omen as the page that needs work. Or maybe I'll do the account page because that needs
   work too." Both are named as needing work; which comes first is his call, not a coin flip.

**Open and tabled: the colourway.** The founder likes black-and-gold and notes it is the
logo's colourway, but finds it "kinda boring" and "lacking colour" — while also allowing
"maybe it's supposed to be boring." His own half-idea on the table: **"maybe we only use the
green and the red for the score."** That is a real proposal and it fits the standing rule from
the 2026-09-11 registry note — crimson and verdigris are fills, not ink, and score is the one
place in the product where a two-pole colour scale carries actual meaning. **Tabled by the
founder, not resolved.** Do not spend the colourway on decoration before he rules on it.

### X3-VersionTagging — Give releases real numbers, starting at 1.7

- **Status:** QUEUED — founder named it "1.7's first task", 2026-09-11
- **Priority:** none for the 2026-09-11 beta; first thing in the 1.7 cycle
- **Cost:** small for the going-forward half; unknown for the backfill
- **Agent-buildable:** the tagging and the release doc are; the historical mapping is not
  without the founder's dates
- **Source:** found while trying to answer "what changed between 1.6 and 1.4" for the beta
  testers and discovering the question could not be answered from this repo at all.

**The finding.** There are **no git tags in this repository** — none. `MARKETING_VERSION` has
been `0.1.0` since the app shell was scaffolded on 2026-07-19 and has never moved;
`CURRENT_PROJECT_VERSION` reached 5 with no commit trail explaining when or why. So the
version numbers the founder sees in TestFlight have **no counterpart in version control**, and
no build that ever reached a tester can be traced to the code it was cut from. Founder,
2026-09-11: "that was an oversight."

This is not cosmetic. It means no release can be diffed, no regression can be bisected to a
build, and no tester report can be tied to the code they were actually running.

- **Scope, going forward:** every build that goes to a tester gets an annotated git tag, and
  the tag carries the build number the tester sees. Marketing version starts moving. A short
  release record per build — what changed, what was verified, what was not.
- **Scope, backfill:** reconstruct 1.1 through 1.6 retroactively. **Blocked on the founder's
  dates** — he offered them ("if you need dates, I can give you dates") and they are the only
  way to map a TestFlight build onto a commit, since nothing in-repo records it. Do not guess
  a mapping; a wrong tag is worse than a missing one because it will be trusted later.
- **Open question, founder:** what are 1.1–1.6 numbered against? `MARKETING_VERSION` has
  always been `0.1.0`, so those numbers come from outside the repo. Reconcile the scheme
  before tagging anything, or the tags will encode the confusion permanently.
- **Done when:** every tester-facing build from 1.7 on is tagged at the commit it was cut
  from, the scheme is written down somewhere a future session will read, and the 1.1–1.6
  backfill is either complete or explicitly abandoned on the record.
- **Do not touch:** do not invent a historical tag to make the sequence look tidy.

**Founder's stated intent for 1.7 beyond tagging:** "with 1.7 I wanna start working on it
differently" — more structured, page by page. The `slops-native-sim-drive` skill was authored
2026-09-11 in service of that. See the note on skill reach below.

### X4-SkillReach — The Slops skills are documents, not skills the tooling can reach

- **Status:** VERIFIED — 2026-09-12. Delivery landed; recording and rollout follow.
- **Detail:** `Direction/sprint-verified-detail.md` § `X4-SkillReach` — evidence, claims, and correction history.
