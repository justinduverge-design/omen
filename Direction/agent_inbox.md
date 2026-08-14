# Omen Agent Inbox

**Refreshed:** 2026-08-13 — native authorization is merged and the first native UI parity pass is locally verified. Reconciled against the approved Figma Command Center contract, both simulators, and the paired physical iPhone. Handoffs are pointers, not standalone proof.
**Authority:** `Direction/current_sprint.md` is the active queue. `Direction/status-model.md` defines states, `Claim:`/`Evidence:` requirements, blocker grammar, and the selection rule. This file selects or recommends the next pull.

## Historical founder pin — 2026-08-12 native iOS authorization closeout (superseded 2026-08-13)

The iOS passkey half is promoted from the deferred backlog as `M4-Auth-Passkeys-iOS-Onramp`. Local implementation is complete on `feat/m3a-ios-apple-auth`: native AuthenticationServices ceremonies, official Supabase first-factor passkey transport, account add/list/remove, pairing offer, Sign in with Apple entitlement/tests, Associated Domains entitlement, and the exact AASA artifact/route. Xcode 26.6 passes 121 tests with 0 failures; Automatic Signing builds and installs on the paired iPhone under team `6RWR5G9894`.

At the time of this pin, the remaining boundary was external: the public AASA URL returned 404 pending review/deploy, followed by the founder's Face ID ceremony. That description is historical, not current—the authorization PR later merged and the founder subsequently proved Face ID passkey entry. `M3A-QA` still owns the deliberately unperformed destructive/account-deletion and remaining Android interactive matrix; the native UI parity pass below superseded this pin for the current session.

## ✅ Resolved 2026-08-13 — first native UI parity pass

The approved Command Center contract now renders full-screen on current iOS, exposes the contextual Account control on both native shells, uses a distinct Android League glyph, and replaces the Ledger and League Pulse placeholders with approved, honest-state compositions. `M4-CC-LedgerPreview` and `M4-CC-LeaguePulse` are VERIFIED with evidence in `Blueprints/handoffs/2026-08-13-native-ui-parity-command-center.md`.

This does **not** complete the native UI program. `M4-CC-PlatformsCompact` remains the next named beta-blocking Command Center item. The permanent Trade and League destinations still contain explicit placeholders and need their own approved screen slices; do not describe this pass as web/native feature parity.

## ✅ Resolved 2026-08-01 — CI works; the "billing hold" diagnosis was wrong

**Retracted:** this section previously said the Actions allotment was exhausted and no workflow could run. That was incorrect. Actions was executing the whole time. The red was two real config bugs, both fixed in PR #250:

1. `deploy.yml` → `quality`: `package-lock.json` had drifted out of sync with `package.json`, so `npm ci` exited 1 on every push to `main` from ~2026-07-23. The job never reached the tests.
2. `ios-ci.yml`: a duplicate `branches:` key made the workflow YAML invalid, so it failed instantly with **0 jobs executed** from ~2026-07-29.

**Cost of the wrong diagnosis:** because the guidance said not to retry, the real bugs stayed hidden ~9 days, and everything merged in that window went in ungated. Fixing `ios-ci.yml` immediately surfaced a genuine `PrimitiveEnforcementTests` regression that had been invisible that entire time.

### Current state

- **All gates run and pass on `main`.** Backend 481/481, iOS 84/84, prod audit clean, frontend + client builds clean.
- **Pull requests are now gated.** `pr-quality.yml` (#253) adds backend tests/audit, frontend + client builds, and a server boot-with-SPA smoke. Before it, `src/**` had **no** PR CI at all — `deploy.yml` is `on: push: branches: [main]`.
- **Green CI is necessary, not sufficient.** #206 (`express` 4→5) passed 481/481 and would still have crash-looped production: the bare-`*` SPA fallback throws under path-to-regexp 8, and it sits behind `HAS_SPA`, which is false in CI and true in the production image. Fixed in #251; the `boot-smoke` job now covers that class.
- **Branch protection is still unavailable** on the current GitHub plan (`/branches/main/protection` → 403). Merges are not mechanically blocked by a red check — but treat red as a stop, not as cosmetic. Two dependency PRs reached "green" and would have broken production; the checks are the only thing standing in for branch protection.
- **Local `npm test` remains good fast proof for backend work.** `node --test`, ~7s, no build step. Record the count.
- **Native iOS — superseded 2026-08-11.** `ios-ci.yml` no longer runs per-PR; it triggers on `release/**` and manual dispatch only. Routine iOS verification moved to the founder's Mac. Use the `SUBSTITUTED` `xcodebuild test` command in `Blueprints/definition-of-done.md` → "Local substitutes" and record `xcodebuild -version` beside the result. "iOS CI green" is not a citable evidence line outside a release branch.
## ✅ RETRACTED 2026-08-01 — the "GitHub Actions billing hold" never existed

This section previously stated the Actions allotment was exhausted, that no workflow could run, and that **"failing checks are cosmetic."** All three were wrong. Actions executed throughout. Two config bugs produced the red, both fixed in PR #250:

1. `deploy.yml` → `quality`: `package-lock.json` drifted out of sync with `package.json`, so `npm ci` exited 1 on every push to `main` from ~2026-07-23. The job never reached the tests.
2. `ios-ci.yml`: a duplicate `branches:` key made the workflow YAML invalid — it failed instantly with **0 jobs executed** from ~2026-07-29.

**What the wrong diagnosis cost.** Because this file said not to retry, the real bugs stayed hidden ~9 days and everything merged in that window went in ungated. Repairing `ios-ci.yml` immediately surfaced a genuine `PrimitiveEnforcementTests` regression invisible that whole time. PR #198 sat frozen ~8 days on a blocker that did not exist.

### Current CI reality

- **All gates run and pass on `main`:** backend **481/481**, iOS **84/84**, prod audit clean, frontend + client builds clean.
- **Pull requests are gated now.** `pr-quality.yml` (#253) runs backend tests/audit, frontend + client builds, and a server boot-with-SPA smoke. Before it, `src/**` had **no** PR CI at all — `deploy.yml` is `on: push: branches: [main]`.
- **Green is necessary, not sufficient.** #206 (`express` 4→5) passed 481/481 and would still have crash-looped production: path-to-regexp 8 rejects the bare-`*` SPA fallback at registration, and that route sits behind `HAS_SPA` — false in CI, true in the production image. Fixed in #251; `boot-smoke` now covers that class.
- **Branch protection is still unavailable** on this plan (`/branches/main/protection` → 403), so a red check does not mechanically block a merge. **Treat red as a stop anyway.** With no branch protection, the checks are the only gate there is — "cosmetic" is the word that let two production-breaking dependency PRs reach green.
- **Local `npm test` remains good fast proof** for backend work. `node --test`, ~7s. Record the count.
- **Native iOS — superseded 2026-08-11.** See the note above: per-PR iOS CI is retired; verify locally on the Mac and cite that instead.

## How to verify before pulling

Handoffs in this repo have repeatedly said "implemented locally; not pushed, merged, deployed" for work that was already on `main`. **`main` is the proof.** Before pulling anything, `grep` for the symbol on `main` and check `gh pr list`.

## Selected Queue — 2026-08-11 (superseded for this session by the founder pin above)

**5 items**, selected from `Status: READY` in `Direction/current_sprint.md` and ordered by the selection rule (founder pin → actionable `IN_PROGRESS` → effective priority → downstream unblock reach → direct unblock count → progress-now → file order). This historical selection had no founder pin; the 2026-08-12 pin above now overrides it.

> **What changed today.** A live-production verification pass against `slopssaloon.com` found four defects that existed in the product but not in this queue. They are now the top of it. Unlike the 2026-07-30 selection — where every item was founder- or externally-blocked — **the first four items below are unblocked agent work that can start immediately.** The founder is waiting only on Google Play organization review (`R2-Android`, `EXTERNAL`).

> **Provider truth as of 2026-08-11, verified live:** ESPN connected (1 league), Sleeper connected (1 league, *Omen App Data*), Yahoo connected with a **live token** after new credentials were installed on KVM1. `waiver_wire` still reports `needs_platform` and `omen_of_the_week` reports `off_season` — the first is item 1 below, the second is correct August behavior.

> **⚠️ Staleness correction — 2026-08-14.** Items 1, 2, and 3 below are **DONE and VERIFIED** and must not be pulled. They were fixed by PRs [#292](https://github.com/justinduverge-design/omen/pull/292), [#293](https://github.com/justinduverge-design/omen/pull/293), and the waiver-gate change, then left sitting at `READY` in this file. Re-verified against `main` on 2026-08-14 with the full suite passing **530/530** (not the 481/481 quoted higher up in this file). **The only live items in this list are 4 and 5.** This is the second time this queue has described already-merged work as pullable — check `main` first, as the section above this one says.

### 1. P1-YahooLeagueBinding — Yahoo can never reach `ready`

- **Status:** ✅ **VERIFIED 2026-08-14 — do not pull.** PR #293 shipped `GET /api/yahoo/leagues`, `POST /api/yahoo/league`, and the `ConnectLeague.jsx` picker. Its one open condition was "tests hand-traced, never executed"; `npm test` has now run and passes. Live Yahoo round-trip still waits on Yahoo's entitlement, which is not this item.
- **Historical framing below, kept for provenance:** · **Claim:** unclaimed · **Blocked by:** None
- **Why first:** **P0, root cause, and provably reproducible.** `src/services/yahooAuth.js:71` writes `league_id: "yahoo"` when no league is supplied; `hasUsableLeagueId()` rejects any row where `league_id === platform`. The writer stores a value the reader is guaranteed to refuse. No caller ever supplies a league, and there is no leagues endpoint or picker to repair it. This — not the token, not the buttons — is why Yahoo has never worked. Blocks F7, which blocks Section K.
- **Boundary:** fix the writer, not `hasUsableLeagueId()`. Loosening the predicate to accept `"yahoo"` would make an unusable connection report ready.

### 2. P1-WaiverGateMultiProvider — waiver readiness is hardcoded to Yahoo

- **Status:** ✅ **VERIFIED 2026-08-14 — do not pull.** `buildWaiverTool()` uses `isOmenReadyConnection` across any active row; tests prove `waiver_wire: "ready"` for Sleeper-only and ESPN-only users.
- **Historical framing below, kept for provenance:** · **Claim:** unclaimed · **Blocked by:** None
- **Why next:** P0 and *it buries shipped work*. `src/routes/dashboard.js:213-226` computes waiver availability from `usableYahoo` alone, so the merged-and-VERIFIED ESPN (#266) and Sleeper (#259) waiver paths are unreachable from the dashboard. Highest ratio of value recovered to lines changed in the queue.
- **Boundary:** `isOmenReadyConnection()` is already correct and already used by `omen_of_the_week`. This is a gate bug, not a predicate bug.

### 3. P1-YahooConnectButtons — two dead Connect buttons + a lossy error path

- **Status:** ✅ **VERIFIED 2026-08-14 — do not pull.** PR #292. Both `window.location.href` call sites are gone; `frontend/src/lib/yahooAuth.js:5` is now the only `/api/yahoo/auth` reference in the frontend. `providerError` is logged before the state row is deleted.
- **Historical framing below, kept for provenance:** · **Claim:** unclaimed · **Blocked by:** None
- **Why next:** P0. `PlatformConnections.jsx:369` and `WaiverWire.jsx:60` navigate to an auth-required GET, which cannot carry a bearer token — the founder reproduced this by hand. `startYahooOAuth()` is the working reference implementation; point both at it. Also log Yahoo's `providerError` before `yahoo.js:118` discards it: today that swallowed an `invalid redirect uri` and cost an hour of misdiagnosis.
- **Also in scope:** `/api/platforms` and `/api/dashboard/summary` currently give contradictory answers about the same connection.

### 4. P1-DraftAssistantSideline — remove Draft Assistant from the 1.0 surface

- **Status:** **READY — genuinely open, re-confirmed 2026-08-14.** A case-insensitive grep for "draft assistant" across `frontend/src/` still returns **16 hits**, including the primary nav (`components/layout/Header.jsx:26`), the help drawer (`components/help/HelpButton.jsx`, 5 hits), and the Football tab strip (`pages/Football.jsx:27`). It is still shipping to every visitor, 9 days after the founder cut it. **This is now the top live item in this queue.**
- **Claim:** unclaimed · **Blocked by:** None
- **Why next:** P1, founder-decided 2026-08-11, and it is currently shipping to every visitor. Legal copy in `Privacy.jsx` and `Terms.jsx` describes a feature that will not exist in 1.0.
- **Boundary:** **preserve the implementation.** 2027 ships it on a Slops-built ADP; `adp.js`, `sleeperDraft.js`, and `sleeperDraftAccess.js` are that head start. Remove the reachable surface only.

### 5. A4 — Tuesday scoring production enablement

- **Status:** BLOCKED · **Claim:** unclaimed
- **Blocked by:** FOUNDER_APPROVAL — production-change pin for the environment flip
- **Blocked by:** EXTERNAL — nflverse issue #263
- **Blocked by:** TASK-A5 — fallback source decision
- **Why listed:** P0 and season-relevant, but see the note below — **the fix may already be written.**

> **Check `codex/a4-preseason-deferral` before starting A4.** That branch holds unmerged *code* (`src/omen_tuesday_cron.js` +48/−11, plus two tests) adding a `NFLVERSE_SEASON_UNAVAILABLE` path that defers on a 404 for a current-season file instead of recording a failed move. `origin/main` has no such handling, and the condition is live right now. Verified 2026-08-11 across a full 177-branch patch-id triage: this was the **only** branch holding unmerged work that matters.

## Planning intake — pending planning-pass

**Not selectable. Not canonical tasks. Not counted in any status total.**

These two surfaced during the 2026-07-30 reconciliation. They are real work, but minting a task key, priority, and `Done when:` is a planning act, not a migration act. They stay here until `planning-pass` creates and ratifies full task records.

### ESPN waiver-pool implementation — RATCHETED 2026-08-02

Planning pass split the former proposed `B2-D-E1` intake into canonical `B2-D-E1` adapter, `B2-D-E2` canonical-wiring, and `B2-D-E3` drafted-league-proof items in `Direction/current_sprint.md`. Contract: `Blueprints/specs/b2d-espn-e1-waiver-pool-v1.md`.

E1 and E2 are merged on `main` as PRs #265/#266. E3 was provider-proven on 2026-08-02 against the founder's newly connected drafted league using sanitized aggregate evidence only: 10 populated teams, 160 distinct rostered players, and 0 rostered-player leaks in the 500-entry filtered pool. Deployment and production-route proof remain separate.

### ~~Actions-restoration sweep~~ — RESOLVED 2026-08-01, do not mint a task

- **Status:** void. The premise (an external billing event) never existed; see the retraction at the top of this file. CI was repaired in #250 and the sweep was carried out the same day.
- **What the sweep found:** repairing `ios-ci.yml` surfaced a real `PrimitiveEnforcementTests` regression (fixed in #250); re-running the open dependency PRs surfaced two that would have broken production — #206 (`express` 4→5 boot crash, fixed via #251) and #252/#207 (Tailwind v4 build break, closed with the safe subset landed as #254).
- **Outcome:** 10 PRs merged, 2 closed, PR queue cleared to #198 only. `pr-quality.yml` (#253) added so this class of failure is CI-visible rather than needing a manual sweep.
- **Scope note for planning-pass:** re-run open-PR and DEFERRED-CI workflows and record real results; do not treat the hold as code failure.

## Verified truth — on `main` (done, ledgered)

| Work | Evidence |
|---|---|
| M0-BE-1 safe provider-state API | merged PR #189 `c9009e1`, `src/routes/platforms.js` |
| M0-BE-2 native Sleeper connect idempotency | merged PR #190 `9f8a7c9` |
| M0-BE-3 Yahoo verified native OAuth return | merged PR #191 `66e39c3`; `GET /api/yahoo/callback` tests on `main` |
| M4-Auth primitive retirement | merged PR #193; `PrimitiveEnforcementTest.ALLOWLISTED_FILES` empty |
| Honest trade pulse contract | merged PR #197 — **scope D1's remaining delta against this before pulling** |
| Omen B2 brand wordmark refit | merged PR #199 `9ecd562` (carries `2c48bbf` + `ca96559`) |
| Dependency health controls + advisory-debt clearance | merged PR #200 |
| Actions version bumps (checkout/github-script/setup-java) | merged PRs #201–#203 |
| M4-Omen-Screen native decision destination | merged PR #210 `6c2f9ae` |
| B2-D-S0 Sleeper projection mapping fix | merged PR #214 |
| B2-D Sleeper waiver stack + deterministic selector | PRs #215, #238, #239, #240; Yahoo availability-only fallback preserved |
| Security hardening evidence recovery | PR #241; source-only RLS still explicitly gated |
| Store-review notes and ESPN E0 verdict | PRs #242, #243; documentation/evidence only |
| Backend test baseline | **481/481 green** locally and in CI (2026-08-01, post-#250) |

**Recovered-work disposition:** #215 merged directly; stacked #216/#217 closed when their base was deleted and were recovered onto current `main` by #238/#239. Selector recovery #240 preserved the newer Yahoo fallback. #220/#222/#223/#224 are closed as superseded by #240/#241/#242/#243.

**Closed without merge:** PR #140 (SVG logo masters) and PR #132 (Master Design System Blueprint). Their sprint tasks A1 and A2 are now `CLOSED / DESCOPED` — see `Direction/sprints_completed.md`.

## Native Mobile Pivot — still active

**Do not auto-pull web UI work.** New web page migrations and web-only primitive expansion stay paused. Read before selecting native work:

- `Blueprints/specs/mobile/omen-native-mobile-foundation-v1.md`
- `Blueprints/specs/mobile/omen-native-design-system-registry-v1.md`
- `Blueprints/specs/mobile/omen-native-app-shell-auth-api-contract-v1.md`
- `Blueprints/specs/mobile/m1-native-primitives-enforcement-v1.md`
- `Blueprints/playbooks/native-mobile-design-delivery-workflow-v1.md`
- Official Figma: `https://www.figma.com/design/mWjrAKPi4JSIP5lAmGAtB3`

Native design-system work (M0a/M0b/M0c, M1-F, M1-P P2/P3/P4, M2, M3, M3-A, M4 CC v1/v1.1, M4-Omen-Screen) is **complete**. The Mac/Xcode hardware gate cleared 2026-08-12; remaining native work is Figma-, local device/accessibility evidence-, provider-, or release-gated.

## Founder actions available now

1. **Park PR #198** (Discord OAuth) until the Actions restore — it is the one item with no local verification path.
2. **For ESPN waiver-pool work, wait for a drafted league** before making a roster-subtraction capability claim; E0's pre-draft observation remains evidence only.
3. **Pin A3 or M3A-QA** if you want either P0 to move — both are founder-gated today.
4. **Run `planning-pass`** to ratify the two planning-intake items above into canonical tasks.

## Current blockers and gates

- **GitHub Actions billing** — see the standing constraint above.
- **Tuesday scoring:** production flag stays false until an approved no-write dry-run and explicit production-change approval.
- **Production Supabase Stripe cleanup:** source SQL exists; production schema mutation is a separately gated Justin action.
- **M4-CC-LedgerPreview / M4-CC-PlatformsCompact:** Figma-first §3.2 proposals are approved (nodes `72:2` / `73:2`); use their current sprint records for execution scope. **M4-CC-WaiverWatch** is merged as PR #271; its former macOS hardware blocker is cleared, while its own six-state iOS render/accessibility evidence remains agent-resolvable.
- **M4-CC-LeaguePulse:** needs both a founder-approved visual brief §1.6 and a Figma pass.
- **M3A-QA:** one native Apple happy path is founder-observed; the remaining Apple edge cases, email OTP, restore, deletion, log safety, and Android matrix still require founder credentials/device interaction.
- **M4-Auth-Passkeys-iOS-Onramp:** local implementation/build/install is complete; production AASA merge/deploy and the physical Face ID pair/sign-in ceremony are founder-only gates.
- **B2-D live provider data:** provider-specific capability proof required before claiming live advice.
- **Post-live learning:** waits on Release Done, seven stable days, and `slops-product-pulse`.

## Agent selection guidance

- **Jules:** narrow component-only or tightly bounded migration briefs with exact allowed files, dependencies, and evidence requirements.
- **Codex:** native implementation, behavior-preserving backend/API/data work, regression tests, implementation verification.
- **Claude:** doctrine/spec reconciliation, product-gap analysis, recommendation-contract synthesis, copy/legal review, large-context planning.

These are tool-fit recommendations, not ownership. Lanes are vendor-agnostic; readiness, blockers, and verifiability decide the pull.

## Required kickoff output

Before implementation, the agent must print:

1. task ID and exact scope;
2. priority, cost, blockers, and done-when;
3. selected skills and N/A reasons;
4. files expected to change;
5. test/evidence plan;
6. do-not-touch boundaries;
7. branch name and serialization/hot-file check.

**Also required:** if the pulled item's done-when cites CI, state the local-evidence substitute you will record instead.

## Required closeout output

The handoff must include:

- actual files changed;
- intended RED, GREEN, broader tests/build/audit results as applicable;
- UI/security/legal/AI evidence as applicable;
- actual skills used, skipped, substituted, or weak;
- one concrete skill improvement or an explicit "no correction needed" verdict;
- branch/commit/PR/deploy status without implying local work is live.

**Ledger rule:** append the `Blueprints/done/LEDGER.md` row in the same pass that closes the work.

## Do not touch unless explicitly pinned

- `AGENT.md`, `CLAUDE.md`, `AGENTS.md`
- `Direction/status-model.md` — changing it without the L0 canonical source is a Truth Gate failure
- `.env`, secrets, or credentials
- deploy configuration or production infrastructure
- package files or dependencies
- SQL, Supabase schema/migrations, or production data
- Apple credentials
- production flags or deploy actions
