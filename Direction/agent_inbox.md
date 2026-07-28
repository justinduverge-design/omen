# Omen Agent Inbox

**Refreshed:** 2026-07-27 — reconciled against `main` @ `c393948`, `gh pr list`, and a local `npm test` run. Handoffs were not treated as evidence.
**Authority:** `Direction/current_sprint.md` is the active queue. This file selects or recommends the next pull.

## ⚠️ Standing constraint — GitHub Actions billing hold

The monthly Actions allotment is exhausted. Expected restore ~**2026-08-01**.

- **No workflow can run.** Any done-when citing "iOS unsigned CI green", "connected tests green in CI", or "workflow passes" is **verification-blocked, not build-blocked**. Build the work; record local evidence; defer the CI claim.
- **Red checks are not a merge gate on this repo.** Branch protection is unavailable on the current GitHub plan (`/branches/main/protection` returns 403 "Upgrade to GitHub Pro"). Failing checks are cosmetic — merges are not blocked by them.
- **Local `npm test` is the substitute proof for backend work.** `node --test`, ~6s, no build step. Use it and record the count.
- **Native iOS work has no local substitute** on the Windows dev machine. Park iOS-verification-dependent closeouts until the restore.

## How to verify before pulling

Handoffs in this repo have repeatedly said "implemented locally; not pushed, merged, deployed" for work that was already on `main`. **`main` is the proof.** Before pulling anything, `grep` for the symbol on `main` and check `gh pr list`.

## Verified truth — 2026-07-27

### On `main` (done, ledgered)

| Work | Evidence |
|---|---|
| M0-BE-1 safe provider-state API | merged PR #189-era work in `src/routes/platforms.js` |
| M0-BE-2 native Sleeper connect idempotency | merged PR #190 |
| M0-BE-3 Yahoo verified native OAuth return | merged PR #191; covered by `GET /api/yahoo/callback` tests on `main` |
| M4-Auth primitive retirement | merged PR #193; `PrimitiveEnforcementTest.ALLOWLISTED_FILES` empty |
| Honest trade pulse contract | merged PR #197 — **check this before starting D1** |
| Omen B2 brand wordmark refit | merged PR #199 |
| Dependency health controls + advisory-debt clearance | merged PR #200 |
| Actions version bumps (checkout/github-script/setup-java) | merged PRs #201–#203 |
| M4-Omen-Screen native decision destination | merged PR #210 |
| B2-D-S0 Sleeper projection mapping fix | merged PR #214 |
| Backend test baseline | **417/417 green locally on `main`** (the "240/240" in `context.md` is stale) |

### Built, verified, not landed

| Work | Branch / PR | State |
|---|---|---|
| B2-D-S1 Sleeper available waiver pool | PR #215 → `main` | MERGEABLE. `src/adapters/sleeper.js` +221. |
| B2-D-S2 Sleeper waiver three-state branching | PR #217 → **#215's branch** | MERGEABLE. `src/services/omen.js` +387. |
| B2-D-S0+S1 closeout docs | PR #216 → **#215's branch** | MERGEABLE. |
| B2-D-2 guarded Yahoo waiver fallback | PR #211 → `main` | **Draft.** +435/-9. |
| M4-Auth-Providers-v1 Discord OAuth (Android + iOS) | PR #198 | Code-complete, frozen on iOS CI billing. Passkeys deferred to `M4-Auth-Passkeys-Onramp` (P2). |
| Inbox reconciliation (2026-07-26 pass) | PR #212 → `main` | MERGEABLE. Superseded in part by this file. |
| OAuth telemetry redaction, waitlist RLS source, browser permissions hardening | PR #232 | **Merged to `main`** as `5fdb2f3`; local suite 422/422, build, and moderate audit 0. No deploy or production SQL application. |
| Yahoo native-return evidence reconciliation | PR #234 | **Merged to `main`** as `a6e6555`; focused Yahoo route 9/9 and full local suite 422/422. Provider-console and real-device proof remain human gates. |

**Sleeper stack merge order:** #215 first → GitHub auto-retargets #216/#217 to `main` → then merge those. Merging #217 first pulls S1's commits in sideways. Full-stack tip verified **432/432 green locally** (+15 over `main`).

### Dead entries — remove on next sprint grooming

- **A1 / PR #140 (SVG logo masters)** — PR is **closed**. Sprint item is dead.
- **A2 / PR #132 (Master Design System Blueprint)** — PR is **closed**. Sprint item is dead.
- The 2026-07-23 pin on **M4-Auth-Providers-v1** — that work is code-complete in PR #198. Do not rebuild it.

## Native Mobile Pivot — still active

**Do not auto-pull web UI work.** New web page migrations and web-only primitive expansion stay paused. Read before selecting native work:

- `Blueprints/specs/mobile/omen-native-mobile-foundation-v1.md`
- `Blueprints/specs/mobile/omen-native-design-system-registry-v1.md`
- `Blueprints/specs/mobile/omen-native-app-shell-auth-api-contract-v1.md`
- `Blueprints/specs/mobile/m1-native-primitives-enforcement-v1.md`
- `Blueprints/playbooks/native-mobile-design-delivery-workflow-v1.md`
- Official Figma: `https://www.figma.com/design/mWjrAKPi4JSIP5lAmGAtB3`

Native design-system work (M0a/M0b/M0c, M1-F, M1-P P2/P3/P4, M2, M3, M3-A, M4 CC v1/v1.1, M4-Omen-Screen) is **complete**. Remaining native work is either Figma-gated or iOS-CI-gated — see the top-5 below.

## Auto-Populated Top 5 — 2026-07-27

Filter applied: agent-buildable, blockers actually satisfied, and **verifiable without GitHub Actions**.

### 1. B2-D-S3 — ESPN waiver pool + wiring 🔵 ACTIVE

- **Why next:** spec `Blueprints/specs/b2d-live-waiver-pool-sleeper-espn-v1.md` (PR #213) scopes Sleeper **and** ESPN. Sleeper is done through S2; ESPN is the unbuilt half. S1/S2 give an exact pattern to mirror.
- **Priority / cost / blocker:** P0 / medium / none
- **Verifiable without Actions:** yes — local `npm test`.
- **Stacks on:** `backend/b2d-s2-sleeper-waiver-wiring`
- **Do not touch:** ESPN cookie values in logs/UI/URLs/payloads; provider credentials; deploy.

### 2. B2-D-S4 — Deterministic recommendation selection

- **Why next:** the core unmet acceptance criterion of issue #162. Start/Sit, Waiver, and Trade paths each exist, but nothing arbitrates between them. Pure logic, table-testable, no provider calls.
- **Priority / cost / blocker:** P0 / medium / S3 landing first is preferable but not required
- **Verifiable without Actions:** yes.

### 3. B2-D-2 — Guarded Yahoo waiver fallback

- **Why next:** draft PR #211 is the remaining non-Sleeper/non-ESPN waiver path; it must be reviewed against the canonical live-or-unavailable contract before any landing decision.
- **Priority / cost / blocker:** P1 / medium / provider-capability review required; no provider credentials or production action.
- **Output:** inspect the existing draft and its tests, then either record a fix-then-merge verdict or land only if it remains honest about unavailable live inputs.

### 4. M3A-QA — real-device native authentication proof

- **Why next:** code is merged, but the remaining work is human/device evidence rather than an agent implementation lane.
- **Priority / cost / blocker:** P0 / small / founder credentials and inbox access.
- **Output:** run the existing QA matrix; do not use real credentials in agent logs or screenshots.

### 5. Actions restoration sweep

- **Why next:** the hold defers iOS CI and every workflow-only claim. This is eligible only after the billing hold is confirmed cleared.
- **Priority / cost / blocker:** P0 / medium / GitHub Actions availability.
- **Output:** re-run open-PR and DEFERRED-CI workflows and record real results without treating the current hold as code failure.

- **Why next:** listed unblocked — but **PR #197 merged an "honest trade pulse contract" on 2026-07-23.** Scope the remaining delta before pulling; this may be partially done.
- **Priority / cost / blocker:** P1 / medium / needs a scope check against PR #197 first
- **Do not touch:** paid data source or new dependency without approval.

## Founder actions available now

1. **Merge the Sleeper stack** — #215, then #216/#217. Verified 432/432 locally. Red checks do not block.
2. **Merge PR #212** or accept this file as its replacement.
3. **Park PR #198** (Discord OAuth) until the Actions restore — it is the one item with no local verification path.

## Current blockers and gates

- **GitHub Actions billing** — see the standing constraint above.
- **Tuesday scoring:** production flag stays false until an approved no-write dry-run and explicit production-change approval.
- **Production Supabase Stripe cleanup:** source SQL exists; production schema mutation is a separately gated Justin action.
- **M4-CC-WaiverWatch / M4-CC-LedgerPreview / M4-CC-PlatformsCompact:** Figma-first §3.2 proposals do not exist yet — founder-gated.
- **M4-CC-LeaguePulse:** needs both a founder-approved visual brief §1.6 and a Figma pass. Not agent-buildable.
- **M3A-QA:** founder/human credential + inbox access. Agents may prep the matrix only.
- **B2-D live provider data:** provider-specific capability proof required before claiming live advice.
- **Baked-black fallback deletion:** wait until at least 2026-07-28 plus a clean production soak after PR #120.
- **Post-live learning:** waits on Release Done, seven stable days, and `slops-product-pulse`.

## Agent selection guidance

- **Jules:** narrow component-only or tightly bounded migration briefs with exact allowed files, dependencies, and evidence requirements. Dependency-update issues via the manual `jules` label.
- **Codex:** native implementation, behavior-preserving backend/API/data work, regression tests, implementation verification.
- **Claude:** doctrine/spec reconciliation, product-gap analysis, recommendation-contract synthesis, copy/legal review, large-context planning.

These are tool-fit recommendations, not ownership. Readiness, blockers, and verifiability decide the pull.

## Required kickoff output

Before implementation, the agent must print:

1. task ID and exact scope;
2. priority, cost, blockers, and done-when;
3. selected skills and N/A reasons;
4. files expected to change;
5. test/evidence plan;
6. do-not-touch boundaries;
7. branch name and serialization/hot-file check.

**Also required as of 2026-07-27:** if the pulled item's done-when cites CI, state the local-evidence substitute you will record instead.

## Required closeout output

The handoff must include:

- actual files changed;
- intended RED, GREEN, broader tests/build/audit results as applicable;
- UI/security/legal/AI evidence as applicable;
- actual skills used, skipped, substituted, or weak;
- one concrete skill improvement or an explicit "no correction needed" verdict;
- branch/commit/PR/deploy status without implying local work is live.

**Ledger rule:** append the `Blueprints/done/LEDGER.md` row in the same pass that closes the work. The ledger went five days stale between 2026-07-23 and 2026-07-27 because closeouts skipped it.

## Do not touch unless explicitly pinned

- `AGENT.md`, `CLAUDE.md`
- `.env`, secrets, or credentials
- deploy configuration or production infrastructure
- package files or dependencies
- SQL, Supabase schema/migrations, or production data
- Apple credentials
- production flags or deploy actions
