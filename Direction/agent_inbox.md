# Omen Agent Inbox

**Refreshed:** 2026-08-16 — sprint-queue reconciliation. 23 completed items moved to `Direction/sprints_completed.md`, the Done ledger caught up, and the selection below re-derived from what is actually open. Handoffs are pointers, not standalone proof; `main` is the proof.
**Authority:** `Direction/current_sprint.md` is the active queue. `Direction/status-model.md` defines states, `Claim:`/`Evidence:` requirements, blocker grammar, and the selection rule. This file selects or recommends the next pull.

## ✅ Founder-directed A7B Phase 3 slice — complete 2026-08-25

**Result:** The local staging-shadow, deterministic failure matrix, immutable backup, exact-hash witness, correction candidate, health alerts, and fresh-primary recovery proof are complete. Evidence: `Blueprints/handoffs/2026-08-25-a7b-phase3-staging-shadow.md`. A7B returns to READY for a separately approved production-readiness/A4 no-write rehearsal; no remote host, service, timer, database, credential, publication, deployment, production scoring, or ADP state changed.

## Historical founder pin — 2026-08-12 native iOS authorization closeout (superseded 2026-08-13)

The iOS passkey half is promoted from the deferred backlog as `M4-Auth-Passkeys-iOS-Onramp`. Local implementation is complete on `feat/m3a-ios-apple-auth`: native AuthenticationServices ceremonies, official Supabase first-factor passkey transport, account add/list/remove, pairing offer, Sign in with Apple entitlement/tests, Associated Domains entitlement, and the exact AASA artifact/route. Xcode 26.6 passes 121 tests with 0 failures; Automatic Signing builds and installs on the paired iPhone under team `6RWR5G9894`.

At the time of this pin, the remaining boundary was external: the public AASA URL returned 404 pending review/deploy, followed by the founder's Face ID ceremony. That description is historical, not current—the authorization PR later merged and the founder subsequently proved Face ID passkey entry. `M3A-QA` still owns the deliberately unperformed destructive/account-deletion and remaining Android interactive matrix; the native UI parity pass below superseded this pin for the current session.

## ✅ Resolved 2026-08-13 — first native UI parity pass

The approved Command Center contract now renders full-screen on current iOS, exposes the contextual Account control on both native shells, uses a distinct Android League glyph, and replaces the Ledger and League Pulse placeholders with approved, honest-state compositions. `M4-CC-LedgerPreview` and `M4-CC-LeaguePulse` are VERIFIED with evidence in `Blueprints/handoffs/2026-08-13-native-ui-parity-command-center.md`.

This does **not** complete the native UI program. `M4-CC-PlatformsCompact` remains the next named beta-blocking Command Center item. *(Updated 2026-08-16: its implementation merged as `6466a4c` and it is now `VERIFIED`; only the Android above-the-fold evidence and a handoff remain before it can close.)* The permanent Trade and League destinations still contain explicit placeholders and need their own approved screen slices; do not describe this pass as web/native feature parity.

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

## Selected Queue — 2026-08-18

**Refreshed by Claude.** The 2026-08-16 selection above went stale within a day: its item 1, `M5-Slice-E-Ledger`, merged and closed 2026-08-17 (PR #320) — the same "handoff written pre-merge, never re-read" failure the 2026-08-16 pass itself was written to end. Items 1 (`P1-DraftAssistantSideline`) and 2 (`M5-Native-API-Client` slice D) from that list are also both already closed (`08aa73f`, `80ee3fa`). Items 3 (`M4-CC-PlatformsCompact`) and 4 (`F9`) were **not** re-checked this pass — verify directly against `current_sprint.md` rather than trust either line here.

`node scripts/check-sprint-staleness.js` was run against 100 merged PRs and found the rest of `current_sprint.md` consistent with `main` — only this file's cached list had lagged. `gh pr list` shows zero PRs open. Also closed since the last refresh and not previously recorded here: `O1b` (GlitchTip error tracking) and `O5` (Supabase backup, doc-reconciled), both PR #329.

**No active claim.** `S5` closed 2026-08-18; `O7` closed 2026-08-19 (PR #337).

## ✅ Done 2026-08-22 — `S3`, `S4`, and `O4` closed as one package

All three are `CLOSED / COMPLETED` on PR [#355](https://github.com/justinduverge-design/omen/pull/355), which is **open, unmerged, and left that way for founder review**. Nothing is on `main` and nothing is deployed. `npm test` 618/618 locally and in CI; all three PR checks green.

Item 5 of the 2026-08-19 selection below (`O4`) is therefore stale. Items 1 (`O2`) and 4 (`O3`) were not re-checked this pass — verify against `current_sprint.md` rather than trusting that line. Item 2 (`O8`) closed 2026-08-21 and item 3 (`S8`) is already struck through.

**Two things from this package that change how the next one should be pulled:**

- **`O4` was underspecified until `S3` existed.** A performance number means nothing without a stated admission-control policy — measure before the limits and you characterise a system that no longer exists; measure after them without accounting for them and you are timing `express-rate-limit`. Any future perf item on a rate-limited route needs its concurrency *derived* from the limits, not chosen.
- **The shared scrubber has been found holed in three consecutive sessions**, every time by provoking a real failure and searching the emitted bytes, and never by review. `S4` found `authorization` missing outright and, once added, `Bearer <token>` still surviving because the key/value rule stops at the first space — **it matched, and reported success on the exact string it was failing to protect.** Treat "we have a scrubber" as a claim needing evidence, not a fact.

Details: `Blueprints/handoffs/2026-08-22-s3-s4-o4-hot-route-hardening.md`.

## 📌 Founder pin — 2026-08-19 — `O2` (named rollback owner + tested rollback path)

**Pinned by the founder. This is the next task; skip auto-populate.**

`O2` is the **last unclosed P0 in the Ops lane.** Its two halves split cleanly by who can do them:

- **Agent half:** write the rollback documentation — the backend rollback procedure, and the mobile answer recorded explicitly as *"no rollback — O7 forced-update is the mitigation."* `O7` closed 2026-08-19, so that sentence can now be written with a real mechanism behind it instead of an intention.
- **Founder half:** actually executing the rollback once against a non-critical deploy, and being named as the rollback owner. Neither is delegable — rolling back production is an action-level founder approval per the safety gates, and "named owner" means a person.

**Read before starting:** `O2`'s own record in `current_sprint.md`, `O7`'s closure (the mobile mitigation it now points at), and `Blueprints/done/release-done.md`.

### Next pull — re-derived 2026-08-19, `Blocked by: None`, agent-buildable, priority-ordered

1. **`O2`** — named rollback owner + tested rollback path. **P0, and now the last unclosed P0 in the Ops lane.** The rollback exercise itself is founder-executed; the documentation half is agent work. O7 closing makes this more urgent, not less: O7's `Done when:` records "no rollback — O7 forced-update is the mitigation" as the *mobile* answer, and O2 is where that sentence has to actually be written down alongside the backend path.
2. **`O8`** — wire GlitchTip into Omen's actual error paths. P1, and the direct payoff of `O1b`: nothing in `src/` sends a real error to GlitchTip yet.
3. ~~**`S8`** — triage the 6 open Dependabot PRs.~~ **CLOSED 2026-08-19 — it was already done on 2026-08-11 and nobody advanced the status.** Zero Dependabot PRs are open; #281 is merged. **This line is left struck through rather than deleted because it is the evidence**: S8 was offered as an available P1 pull on the same day the reconciliation proved it finished. `check-sprint-staleness.js` could not catch it — it matches sprint keys against PR *titles*, and Dependabot titles never contain a sprint key.
4. **`O3`** — post-deploy canary. P1, recommend-only.
5. **`O4`** — load-test the three hot routes. P1; `scripts/load-omen-routes.js` exists and has never been run.

### ✅ Done 2026-08-19 — known-issues ↔ GitHub reconciliation

Ran after `O7` merged (#337). Results in `Direction/known_issues.md` § "Reconciled against GitHub — 2026-08-19". Four buried issues surfaced as [#338](https://github.com/justinduverge-design/omen/issues/338) (fonts), [#339](https://github.com/justinduverge-design/omen/issues/339) (backend Sentry breadcrumbs), [#340](https://github.com/justinduverge-design/omen/issues/340) (contrast), [#341](https://github.com/justinduverge-design/omen/issues/341) (Android status bar). One contradiction corrected in `facts-of-record.md` (Yahoo entitlement). One stale entry corrected (`omen_gdpr.js`). `S8` closed as already-done.

**Standing rule from this pass:** a real, unresolved known issue gets a GitHub issue and carries its number in the heading. If it is not worth an issue, it is not worth an entry. **Re-run this reconciliation periodically — no script covers it**, and the one script that exists (`check-sprint-staleness.js`) is blind to both dependency PRs and cross-file contradictions.

**Before closing anything, run `node scripts/check-sprint-staleness.js`.**

**Founder-gated, not selectable:** `A4` remains blocked on A6 production proof and the unexecuted `O2` rollback drill; `F6` needs the real-account ESPN matrix on both founder-controlled native devices; `R2-Android` (Google review), `R3`–`R6`, `M3A-QA`, `M4-Auth-Passkeys-iOS-Onramp`, `B2-D3-S2` deploy step, `M1-Screen-Trade` / `M1-Screen-League` (proposals delivered 2026-08-16, ratification pending). **External:** `P1-YahooReauth` → `F7`. **Season floor cleared 2026-08-26:** F6-F8 are runnable; none is automatically verified.

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
- **Tuesday scoring:** production is on the founder-authorized A6 safety hold with both scoring flags `false`; only `omen_cron` was recreated. A4 remains open until the A6 persistence repair is merged/deployed and proven on new rows and O2 is executed. A7B itself is CLOSED/COMPLETED.
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
