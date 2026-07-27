# Inbox Reality Reconciliation + PR #198 Rebase — 2026-07-26

## Session arc

Kickoff surfaced that `Direction/agent_inbox.md` had drifted three days and would have sent an agent to rebuild shipped work. Founder asked directly whether the pinned task was already done and whether work had been duplicated. Answering that required verifying repo truth rather than trusting handoffs — which itself surfaced a systemic doc-accuracy problem. Two outputs: a reconciled inbox (PR #212) and an unblocked PR #198.

## Objective

1. Determine whether M4-Auth-Providers-v1 was already built, and whether any work had been done twice.
2. Refresh the inbox to match verified repo state.
3. Clear the one PR #198 blocker that is not founder-gated.

## Delivered

### 1. Duplication audit — no duplicate work found

Verified `main` @ `6c2f9ae` against open PRs and all local branches:

- Discord OAuth (`SupabaseOAuthProvider`, `PkceCodes`, `OAuthCallbackBus`, `AndroidChromeTabsOAuthProvider`, `ASWebAuthenticationOAuthProvider`) exists **only** on `claude/m4-auth-providers-v1`. `main` has none of it. Real, unduplicated work.
- The branch ↔ `main` overlap is **3 files**, and none is the same change twice:
  - `.github/workflows/ios-ci.yml` — branch removes a duplicate `branches:` YAML key; `main` bumped `actions/checkout@v4→v7`. Different lines, different bugs.
  - `Blueprints/playbooks/skill-usage-ledger.md` — both append rows.
  - `OmenAndroidApp.kt` — branch adds OAuth dispatch; `main` added Omen-tab wiring.

### 2. Inbox reconciled — PR [#212](https://github.com/justinduverge-design/omen/pull/212)

`Direction/agent_inbox.md`, +90/−115, docs-only. Added: the Actions billing hold as a standing constraint; an "Already done — do not rebuild" table with commit-level evidence for 10 items; a "Built but not landed" section; orphaned-branch flags; a four-command duplication check; and a closeout rule that "pushed"/"merged" may be claimed only when literally true.

### 3. PR #198 rebased — `CONFLICTING` → `MERGEABLE`

Force-pushed `8cd1eb2` → `c6fe1be` with `--force-with-lease` (founder-approved). Conflict resolution only — no scope change, no new features, passkey deferral untouched.

Two of the three predicted conflicts were real; `ios-ci.yml` auto-merged and both fixes were verified to survive.

## Validation

| Gate | Result |
|---|---|
| `:app:assembleDebug` | BUILD SUCCESSFUL — `:app:compileDebugKotlin` **executed**, not cached |
| `:core:auth:testDebugUnitTest` | 58 tests, 0 failures, 0 errors, 0 skipped (`--rerun-tasks`) |
| `:core:designsystem:testDebugUnitTest` | 22 tests, 0 failures, 0 errors, 0 skipped (`--rerun-tasks`) |
| `PrimitiveEnforcementTest.ALLOWLISTED_FILES` | still `emptyList()` |
| `ios-ci.yml` | `yaml.safe_load` parses; `checkout@v7` and single `branches:` key both present |
| `git diff --check` | clean |

**Evidence caveat, recorded deliberately:** the first test invocation returned `UP-TO-DATE` for every task. That is a stale Gradle cache, not verification. The counts above come from a forced `--rerun-tasks` run's JUnit XML. A green `UP-TO-DATE` build is not evidence and should not be recorded as such.

**iOS is unverified.** Xcode cannot run on the Windows dev box and iOS CI is billing-blocked. The rebase touched zero Swift files, so risk is low — but low risk is an argument, not evidence. No iOS-green claim is made.

## Findings worth propagating

1. **Handoffs go stale on merge; `main` is the only proof.** The M0-BE-1 and M0-BE-2 handoffs both state "implemented locally; not pushed, merged, deployed." Both are on `main` (`543a471`, `ff5c546` in `src/routes/platforms.js`). Handoffs are written at implementation time and never revised when the PR lands. Any agent trusting them would rebuild shipped backend routes.
2. **Unpushed local branches are the real duplication risk.** `codex/m0be3-yahoo-mobile-return` (1 commit) and `codex/security-log-redaction` (4 commits) have no remote and no PR. They exist on one machine. This is the mechanism by which work actually gets done twice.
3. **A blocked CI gate silently invalidates every done-when that cites it.** Multiple specs name "unsigned iOS CI on push" as the iOS verification path. That path has been unavailable since 2026-07-24 and stays unavailable until ~2026-08-01. Worse, `ios-ci.yml` carried a duplicate-`branches:` YAML bug that made GitHub discard the workflow entirely, so it had never run since check-in — the gate was cited as authority while being structurally incapable of running.

## Scope boundaries

Docs plus one conflict-resolution rebase. No app behavior change, no dependency change, no CI semantics change beyond preserving two existing fixes, no SQL, migration, credential, provider, deploy, or production action. `JAVA_HOME` was set to Android Studio's bundled JBR for the session only — no machine config was written.

## Still blocked

- **PR #198** — merge waits on GitHub Actions billing (~2026-08-01). Then: `gh workflow run ios-ci.yml --ref claude/m4-auth-providers-v1`.
- **PR #212** — founder review.

## Next session's first move

Dispose of the two orphaned local branches — push with a PR, fold into existing work, or abandon with a written reason. Then reconcile `Direction/current_sprint.md`, which still carries dead A1/A2 entries (PRs #140 and #132 are both CLOSED) and stale M1-P/M4 status.

## Skill receipt

Task: inbox reality reconciliation + PR #198 rebase.

Change type: docs reconciliation + conflict-resolution rebase.

Skills invoked: `slops-repo-inspector` (branch/PR/commit verification — carried the whole session), `slops-context-markdown` (inbox rewrite), `slops-git-flow` (scoped branch, explicit-path commit, force-with-lease gated on founder approval), `slops-quality-baseline` (Android build + forced test rerun as the regression gate).

Skills N/A: `slops-tdd` — no behavior change; the rebase preserves existing tests rather than authoring new ones. `slops-ui-ux-audit` / `slops-mobile-smoke` — no UI change, and both are web-oriented. `slops-ux-copy` — no user-facing wording. `security-privacy-evidence` / `rbac-risk-review` / `slops-legal-spot-check` — no trust boundary, permission, or legal surface touched; the PKCE/CSRF logic was preserved verbatim, not re-authored. `planning-pass` — no backlog authored; this session read the queue rather than groomed it.

Procedure gap found: **`slops-quality-baseline` should treat an all-`UP-TO-DATE` Gradle run as a non-result and force `--rerun-tasks` before recording a pass.** This session nearly logged a cached build as verification. Related and worth folding into the same skill: a CI workflow cited as a done-when gate should be confirmed to have actually executed at least once, since `ios-ci.yml` was authoritative-on-paper while structurally unable to run.
