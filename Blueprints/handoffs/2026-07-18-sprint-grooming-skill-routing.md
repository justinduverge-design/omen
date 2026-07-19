# Handoff — Sprint Grooming + Skill Routing

**Date:** 2026-07-18  
**Branch:** `docs/sprint-grooming-skill-routing`  
**Scope:** Documentation and execution routing only.

## What changed

1. Rebuilt `Direction/current_sprint.md` as an active execution queue rather than a mixed queue/history file.
2. Added priority, cost, blockers, agent/gate status, skills, done-when, evidence, and do-not-touch boundaries to active work.
3. Added reusable skill bundles grounded in the Omen skill-activation runbook.
4. Replaced stale `Direction/agent_inbox.md` auto-population history with current open-PR gates, next pulls, blockers, and Claude/Codex/Jules tool-fit guidance.
5. Added `Direction/reviews/2026-07-18-sprint-grooming-skill-map.md` with the audit trail, stale-item removals, coherence conflicts, and skill-improvement loop.
6. Preserved `Direction/sprints_completed.md` and existing PR/handoff receipts rather than destructively rewriting history.

## Main decisions encoded

- Contract-first sequencing for the unified Omen recommendation system.
- `DecisionBrief` waits on the unified contract shape.
- Current next page migrations are Draft Assistant, Connect League, Football Command Center, and later the public front door.
- Real Trade Pulse remains a P1 data/honesty task.
- Full app-store hardening vs relay-only iOS shell is now a required P0 product-scope decision.
- Per-team design/chant work is not active sprint scope after team theming removal.
- PR #132 and PR #140 remain review/founder gates, not auto-pull implementation work.

## Skills used for this pass

| Skill | Result | Evidence | Gap / correction |
|---|---|---|---|
| `slops-repo-inspector` | PASS | Inspected current sprint/inbox, skill routing, UI backlog, active source references, open PRs, and recent merge history | GitHub connector does not expose local dirty-state details; branch isolation and exact-path writes substituted for local worktree inspection. |
| `planning-pass` | PASS | Reordered work by product value, blockers, dependency sequence, and context cost | Old sprint allowed decisions and implementations to coexist without a contract-first split; corrected in B1–B4. |
| `slops-context-markdown` | PASS | Rebuilt canonical active queue and inbox; added dated audit and handoff | Historical file was intentionally preserved to avoid evidence churn. |
| `slops-git-flow` | PASS | Created isolated branch `docs/sprint-grooming-skill-routing`; no direct `main` write | Draft PR required before merge. |
| `product-gap-analysis-session` | PARTIAL / manual application | Have/Need/Gap reasoning used to identify recommendation-system and mobile-scope conflicts | The full skill procedure was not directly executable in this runtime; future B1/F3 pilot should exercise the canonical procedure and record whether it adds value. |
| `slops-retro` | PARTIAL / embedded | Converted repeated stale-queue and unused-skill failures into operating corrections | A formal post-merge retro should assess whether the new task shape reduces context and missed skills. |
| `slops-tdd` | N/A | Documentation-only; no behavior changed | First implementation pulled from the groomed sprint must run the required RED/GREEN procedure. |
| `slops-quality-baseline` | N/A for code; docs scope verification required | No app/package/config behavior changed | Branch diff still needs exact file-scope verification before PR. |
| `slops-code-review` | PENDING | Draft PR review will provide final docs coherence verdict | Review should check lost tasks, invented claims, and skill over-ceremony. |

## Skill improvements proposed

### 1. `planning-pass`

Add a mandatory reconciliation step before ordering a queue:

- compare open sprint items against current source and merged PRs;
- classify each item as open, complete, superseded, blocked, gated, or future-only;
- detect conflicts where two workstreams imply different product scope.

### 2. `slops-context-markdown`

Add an active-queue rule:

- current sprint files should not carry long completed receipts;
- completed evidence should be linked, not repasted;
- local-only, merged, deployed, and production-applied must remain distinct states.

### 3. Company-baseline / skill receipt

Make the receipt explicitly ask for:

- selected vs actually invoked skills;
- skipped/substituted skills;
- evidence per skill;
- one procedure correction or explicit no-change verdict.

## Validation plan

- Compare branch against `main` and verify only the four named Markdown files changed.
- Re-read `Direction/current_sprint.md` and `Direction/agent_inbox.md` from the branch.
- Confirm no app, package, SQL, deploy, secret, or production file changed.
- Open a draft PR for review; do not merge automatically.

## Next action after this PR

Use **B1 — Unified Omen recommendation contract** as the first company-baseline skill-receipt pilot. The kickoff must print the selected skills, N/A reasons, files, evidence plan, boundaries, and branch before work starts.

## Production/deploy status

- Not deployed.
- No production mutation.
- No database or environment action.
- No code behavior change.
