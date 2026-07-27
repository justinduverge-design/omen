# Omen Agent Inbox

**Refreshed:** 2026-07-26 (reality reconciliation — verified against `main` @ `6c2f9ae`, open PRs, and branch state)
**Authority:** `Direction/current_sprint.md` is the active queue. This file selects or recommends the next pull.

## ⛔ Standing constraint — GitHub Actions billing hold

**GitHub Actions is on hold until ~2026-08-01 (founder).** macOS runners are rejected with a billing error. Practical effect:

- **iOS CI cannot go green on any branch.** Do not treat "iOS unsigned CI validates on push" as an available verification path.
- Any work whose done-when requires iOS CI is **verification-blocked**, not build-blocked. Build it, verify Android locally, and say plainly that iOS is unverified.
- **Do not rebuild work that is already sitting in a PR waiting on this hold.** Check the table below first.

## ✅ Already done — do not rebuild

Verified present on `main` or merged:

| Item | Evidence |
|---|---|
| M4-Omen-Screen — Omen destination owning the full DecisionBrief | PR #210 merged 2026-07-26; handoff `2026-07-26-m4-omen-screen.md` |
| M1-P P3 product compositions (all 3 batches) | merged; M4 Omen screen builds on them |
| M1-P P2 primitives + P4 gallery/enforcement | merged PRs #165–#169, #174–#176, #193 |
| M4-Auth primitive retirement (`ALLOWLISTED_FILES` empty) | PR #193 merged |
| M0-BE-1 — safe provider-state API | on `main` @ `543a471`; `platform-provider-state.v1` in `src/routes/platforms.js` |
| M0-BE-2 — idempotent native Sleeper connect | on `main` @ `ff5c546`; `request_id` handling in `src/routes/platforms.js` |
| D1 — real `GET /api/trade/pulse` | PR #197 merged 2026-07-23 |
| F2 status truth (runtime + docs) | `src/services/omenReadiness.js`; handoff `2026-07-22-f2-status-truth.md` |
| Omen B2 brand swap (shield retired, wordmark refit) | PR #199 merged |
| Dependency debt remediation + health controls + quiet inbox | PRs #200–#203 merged |

**Note:** the M0-BE-1 and M0-BE-2 handoffs both say "implemented locally; not pushed." That wording is **stale** — both are on `main`. Trust `main`, not those handoffs.

## 🟡 Built but not landed — waiting, not available to pull

### M4-Auth-Providers-v1 — Discord OAuth (was the previous pin)

- **State:** code-complete on `claude/m4-auth-providers-v1`, [PR #198](https://github.com/justinduverge-design/omen/pull/198) OPEN.
- **Verified:** the OAuth seam, PKCE, Custom Tabs (Android), `ASWebAuthenticationSession` (iOS), and the Discord button exist **only on that branch** — `main` has none of it. This is real, unduplicated work.
- **Blocked by:** (1) GitHub Actions billing hold — iOS CI cannot pass before ~Aug 1; (2) PR is `CONFLICTING` after three days of unrelated merges.
- **Conflict is small:** only 3 files overlap with `main` — `.github/workflows/ios-ci.yml` (branch removes a duplicate `branches:` key; `main` bumped `checkout@v4→v7` — different lines, not the same fix), `Blueprints/playbooks/skill-usage-ledger.md` (both append), `OmenAndroidApp.kt` (branch adds OAuth dispatch; `main` added Omen-tab wiring). The other ~40 auth files are untouched by `main`.
- **Agent-buildable now:** the rebase only. Merging still waits on billing.
- **Passkeys are NOT part of this** — deferred by founder decision 2026-07-24 (Supabase passkey API is `@_spi(Experimental)`, SDK-only, and both platforms are deliberately SDK-free). Filed as `M4-Auth-Passkeys-Onramp` (P2).

### M0-BE-3 — Yahoo native deep-link return

- **State:** local branch `codex/m0be3-yahoo-mobile-return`, 1 commit, **never pushed**, no upstream, no PR.
- **Risk:** highest duplication risk in the repo — it exists nowhere except this machine.

### M0-BE-0 — shared contract matrix

- **State:** `backend/m0be-contract-matrix`, 1 commit not on `main`, no PR. BE-1 and BE-2 shipped without waiting for it, so it is now documentation-after-the-fact rather than a gate.

### Other unpushed/unmerged local work

- `codex/security-log-redaction` — 4 commits not on `main`, no PR
- `chore/dependency-health-controls` — 9 commits not on `main` (superseded? `chore/dependency-health-clean` merged as PR #200 — verify before reviving)
- `backend/b2d2-yahoo-waiver` — 3 commits, [PR #211](https://github.com/justinduverge-design/omen/pull/211) DRAFT

## Open PR gates

| PR | What | Gate |
|---|---|---|
| #198 | M4-Auth-Providers-v1 — Discord OAuth | billing hold + rebase |
| #211 | Guarded Yahoo waiver fallback (B2-D2) | draft; founder review |
| #204–#209 | Dependabot (6 PRs: Android Gradle, frontend runtime/tooling, production deps, dev tooling, actions/cache) | **package-file edits — founder approval required** |

**Closed, no longer gates:** PR #140 (SVG logo masters) and PR #132 (Master Design System Blueprint) are both CLOSED. A1 and A2 in the sprint file are dead entries.

## Recommended next pull

Ordered by "actually available given the billing hold."

### 1. Rebase PR #198 onto `main`

- **Why:** clears the only blocker anyone can clear. Converts the pinned task from stuck-on-two-things to stuck-on-billing-only, so it can merge the day Actions returns.
- **Priority / cost / blocker:** P1 / small / none
- **Done when:** `claude/m4-auth-providers-v1` merges cleanly onto `main`, Android `:app:assembleDebug` + `:core:auth:testDebugUnitTest` + primitive-enforcement scanner still green, PR no longer `CONFLICTING`.
- **Note:** the branch also edits `Direction/agent_inbox.md` and `Direction/current_sprint.md`. This refresh will conflict there — take `main`'s version of both.

### 2. Push or dispose of the orphaned local branches

- **Why:** `codex/m0be3-yahoo-mobile-return` and `codex/security-log-redaction` exist only on this machine. This is the mechanism that causes work to be done twice.
- **Priority / cost / blocker:** P1 / small / founder approval to push
- **Done when:** each branch is pushed with a PR, folded into existing work, or explicitly abandoned with a reason.

### 3. B2-D — canonical Omen engine (live Waiver + personalized Trade)

- **Why:** P0 backend, unblocked, Android/backend-only so the billing hold doesn't touch it. D1 already landed as the honest-contract foundation.
- **Priority / cost / blocker:** P0 / large / reconcile PR #211 first
- **Source of truth:** GitHub issue #162.

### 4. M4-CC-PlatformsCompact

- **Blocked:** needs a Figma-first §3.2 proposal that does not exist yet. Founder-gated.

## Current blockers and gates

- **GitHub Actions billing** — until ~2026-08-01. Blocks all iOS verification and any merge gated on CI.
- **Tuesday scoring:** production flag stays false until an approved no-write dry-run and explicit production-change approval.
- **Production Supabase cleanup:** source SQL exists; schema mutation needs separate approval.
- **Dependabot PRs #204–#209:** package-file edits — do not merge without founder approval.
- **M4-CC-WaiverWatch / M4-CC-LedgerPreview / M4-CC-LeaguePulse / M4-CC-PlatformsCompact:** each blocked on a Figma-approved §3.2 proposal.
- **M3A-QA:** founder/human only — credential entry and inbox reading are agent-blocked.
- **Baked-black fallback deletion:** wait until at least 2026-07-28 and a clean production soak after PR #120.
- **Post-live learning:** waits on Release Done, seven stable days, and `slops-product-pulse`.

## Native Mobile Pivot — still active

**Do not auto-pull web UI work.** New web page migrations and web-only primitive expansion remain paused. B3/B4/C1–C5 are historical web work and stay paused unless Justin explicitly reopens them.

Read before selecting native work:

- `Blueprints/specs/mobile/omen-native-mobile-foundation-v1.md`
- `Blueprints/specs/mobile/omen-native-design-system-registry-v1.md`
- `Blueprints/specs/mobile/omen-native-app-shell-auth-api-contract-v1.md`
- `Blueprints/specs/mobile/m1-native-primitives-enforcement-v1.md`
- `Blueprints/playbooks/native-mobile-design-delivery-workflow-v1.md`
- Official Figma: `https://www.figma.com/design/mWjrAKPi4JSIP5lAmGAtB3`

## Before pulling anything — duplication check

This repo has ~120 local branches, many unpushed. Before building, run:

1. `git log --oneline -15 main` — what actually landed
2. `gh pr list --state open` — what is already in flight
3. `git grep -l "<the-thing>" main` — does `main` already have it
4. Check the "Already done" and "Built but not landed" tables above

A handoff saying "not pushed" is not proof. `main` is proof.

## Agent selection guidance

- **Jules:** narrow component-only or tightly bounded migration briefs with exact allowed files, dependencies, and evidence requirements.
- **Codex:** native implementation, behavior-preserving backend/API/data work, regression tests, and implementation verification.
- **Claude:** doctrine/spec reconciliation, product-gap analysis, recommendation-contract synthesis, copy/legal review, and large-context planning.
- Tool-fit recommendations, not ownership. Readiness, blockers, and skill availability decide the pull.

## Required kickoff output

Before implementation, the agent must print:

1. task ID and exact scope;
2. priority, cost, blockers, and done-when;
3. selected skills and N/A reasons;
4. files expected to change;
5. test/evidence plan — **state explicitly whether iOS verification is available**;
6. do-not-touch boundaries;
7. branch name and serialization/hot-file check.

## Required closeout output

The handoff must include:

- actual files changed;
- intended RED, GREEN, broader tests/build/audit results as applicable;
- UI/security/legal/AI evidence as applicable;
- actual skills used, skipped, substituted, or weak;
- one concrete skill improvement or an explicit "no correction needed" verdict;
- branch/commit/PR/deploy status **without implying local work is live** — say "pushed" only if it is pushed, "merged" only if it is on `main`.

## Do not touch unless explicitly pinned

- `AGENT.md`, `CLAUDE.md`
- `.env`, secrets, or credentials
- deploy configuration or production infrastructure
- package files or dependencies
- SQL, Supabase schema/migrations, or production data
- Apple credentials
- production flags or deploy actions
