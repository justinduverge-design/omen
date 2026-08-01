# Omen Agent Inbox

**Refreshed:** 2026-07-30 — migrated to the status model. Reconciled against `main` @ `90f6376`, the GitHub PR record, and local verification. Handoffs are pointers, not standalone proof.
**Authority:** `Direction/current_sprint.md` is the active queue. `Direction/status-model.md` defines states, `Claim:`/`Evidence:` requirements, blocker grammar, and the selection rule. This file selects or recommends the next pull.

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
- **Native iOS has no local substitute** on the Windows dev box — but `ios-ci.yml` runs on PRs targeting `main` again, so it is CI-verifiable.

## How to verify before pulling

Handoffs in this repo have repeatedly said "implemented locally; not pushed, merged, deployed" for work that was already on `main`. **`main` is the proof.** Before pulling anything, `grep` for the symbol on `main` and check `gh pr list`.

## Selected Queue — 2026-07-30

**5 items**, selected from `Status: READY` in `Direction/current_sprint.md` and ordered by the selection rule (founder pin → actionable `IN_PROGRESS` → effective priority → downstream unblock reach → direct unblock count → progress-now → file order). No founder pin is set and no task holds a valid `Claim:`, so selection began at effective priority.

> **Read this before pulling.** All 13 active tasks currently carry a non-`None` `Blocked by:` line. Per the pull rule, an agent stops and surfaces the block rather than skipping ahead. The four items below marked *progress-now* have an `AGENT_RESOLVABLE` component that can advance today; the rest need founder or external action first.

### 1. B2-D — Complete the canonical Omen engine

- **Status:** READY · **Claim:** unclaimed
- **Blocked by:** AGENT_RESOLVABLE — provider-specific live-data capability proof still outstanding for ESPN
- **Why first:** P0 with the largest downstream reach (GitHub issue #162 is the canonical engine). The Sleeper waiver stack and deterministic selector already landed (#215, #238, #239, #240) and Yahoo availability-only fallback landed (#236) — *progress-now*.
- **Do not touch:** provider credentials, deployment, production data mutations, store configuration.

### 2. A4 — Tuesday scoring production enablement

- **Status:** READY · **Claim:** unclaimed
- **Blocked by:** FOUNDER_APPROVAL — production-change pin for the environment flip
- **Blocked by:** AGENT_RESOLVABLE — approved no-write Supabase dry-run against real nflverse data
- **Why next:** P0. The dry-run preparation and verification half is agent work — *progress-now*. The env flip stays gated.
- **Do not touch:** the production flag before approval.

### 3. A3 — Production security and Supabase review

- **Status:** READY · **Claim:** unclaimed
- **Blocked by:** FOUNDER_APPROVAL — Justin pin and access window
- **Why next:** P0, but audit-preparation only until the pin and access window exist.
- **Do not touch:** secret values, production database, DNS, Nginx, TLS, environment variables.

### 4. M3A-QA — Native auth interactive real-device QA

- **Status:** READY · **Claim:** unclaimed
- **Blocked by:** FOUNDER_APPROVAL — founder/human credential and inbox access
- **Why next:** P0, but the remaining work is human/device evidence, not an agent implementation lane. Agents may prep the matrix only.
- **Output:** sanitized QA matrix; never real credentials in agent logs or screenshots.

### 5. M4-Help-Support-Implementation — remaining QA evidence

- **Status:** READY · **Claim:** unclaimed
- **Blocked by:** AGENT_RESOLVABLE — iOS unsigned CI runs again as of #250; the remaining gap is accessibility/visual evidence, not CI
- **Blocked by:** AGENT_RESOLVABLE — complete Android TalkBack, font-scale, and compact/large-phone screenshot evidence
- **Why next:** highest P1 with an agent-resolvable component — *progress-now*. Implementation merged via PR #229, but the task's own `Done when:` requires accessibility and visual evidence that has not been produced. **Not VERIFIED**; a merged PR does not close it.

## Planning intake — pending planning-pass

**Not selectable. Not canonical tasks. Not counted in any status total.**

These two surfaced during the 2026-07-30 reconciliation. They are real work, but minting a task key, priority, and `Done when:` is a planning act, not a migration act. They stay here until `planning-pass` creates and ratifies full task records.

### ESPN waiver-pool implementation (proposed key: `B2-D-E1`)

- **Source:** this inbox's 2026-07-27 selection; corroborated by `Direction/sprints_completed.md` "Still active / not completed: ESPN E1 implementation and its drafted-league roster-subtraction proof".
- **Type:** task (has a named predecessor and a spec-declared successor relationship).
- **Predecessor:** B2-D-E0 feasibility verdict — `Blueprints/specs/b2d-espn-e0-verdict-v1.md:97` names "E1 implementation" as its own successor; verdict restored via PR #243.
- **Proposed blocker:** EXTERNAL — a drafted ESPN league is required for roster-subtraction proof.
- **Key note:** must be namespaced. Bare `E1` already means the mobile scope decision in `current_sprint.md`.
- **Scope note for planning-pass:** implementation must use per-entry `onTeamId` ownership rather than trusting a server-side exclusion filter.

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

Native design-system work (M0a/M0b/M0c, M1-F, M1-P P2/P3/P4, M2, M3, M3-A, M4 CC v1/v1.1, M4-Omen-Screen) is **complete**. Remaining native work is either Figma-gated or iOS-CI-gated.

## Founder actions available now

1. **Park PR #198** (Discord OAuth) until the Actions restore — it is the one item with no local verification path.
2. **For ESPN waiver-pool work, wait for a drafted league** before making a roster-subtraction capability claim; E0's pre-draft observation remains evidence only.
3. **Pin A3 or M3A-QA** if you want either P0 to move — both are founder-gated today.
4. **Run `planning-pass`** to ratify the two planning-intake items above into canonical tasks.

## Current blockers and gates

- **GitHub Actions billing** — see the standing constraint above.
- **Tuesday scoring:** production flag stays false until an approved no-write dry-run and explicit production-change approval.
- **Production Supabase Stripe cleanup:** source SQL exists; production schema mutation is a separately gated Justin action.
- **M4-CC-WaiverWatch / M4-CC-LedgerPreview / M4-CC-PlatformsCompact:** Figma-first §3.2 proposals do not exist yet — founder-gated.
- **M4-CC-LeaguePulse:** needs both a founder-approved visual brief §1.6 and a Figma pass.
- **M3A-QA:** founder/human credential + inbox access. Agents may prep the matrix only.
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
