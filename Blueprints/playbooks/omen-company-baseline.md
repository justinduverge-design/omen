# Omen Company-Baseline Playbook

## Purpose

Use Omen to prove the operating system for future SLOPS products. A feature is not company baseline merely because it shipped; the procedure, contract, evidence, rollback, and lesson must be reusable.

This playbook governs all new Omen work. It does not replace the canonical skills, kickoff modules, Definition of Done, or Justin's approval gates.

## Baseline Rule

Every task must leave a **skill receipt**:

```text
Task:
Change type:
Skills invoked:
Conditional skills considered but not applicable:
Evidence:
Procedure gap found:
```

Record the receipt in the task handoff and append a compact row to `skill-usage-ledger.md`. “Not applicable” is valid when the reason is specific. Omitting the decision is not valid.

## Core Lifecycle

| Phase | Required procedure | Conditional additions | Required evidence |
|---|---|---|---|
| 0. Orient | `slops-repo-inspector`; read current facts, sprint, inbox, and dirty state | `slops-graphify` for cross-layer/file-relationship questions; `slops-headroom` for oversized output | Repo/layer, branch, dirty files, authoritative sources |
| 1. Frame | Restate outcome, trust boundaries, and acceptance behavior | `product-gap-analysis-session`, `pre-build-research`, `workflow-tree-spec`, `security-privacy-evidence`, `slops-ai-integration-review`, `slops-data-ingest-plan` | Spec/review/source ledger and explicit exclusions |
| 2. Plan | `planning-pass` when queue/spec changes; select skills from `skill-activation-runbook.md` | `slops-prompt-generator` for a bounded execution prompt; `rbac-risk-review` for authority changes | Ordered item, spec path, done-when, blockers, planned skill receipt |
| 3. Build | `slops-tdd` for behavior-changing code; relevant handoff contract | `demo-mode-pre-empty-state`, design/copy/mobile skills, provider runbooks | Intended RED, GREEN, broader checks, changed contract |
| 4. Version | `slops-git-flow` | `clean-up-checkpoint` when stopping before completion | Scoped branch/diff/commit; no unrelated files |
| 5. Review | `slops-code-review` for code; applicable cross-cutting Done files | `slops-ui-ux-audit`, `slops-legal-spot-check`, `security-privacy-evidence` | Severity verdict and resolved/accepted P0/P1 |
| 6. Quality | `slops-quality-baseline` | `slops-mobile-smoke`, `mobile-first-qa-playbook`, real-account `slops-verify` | Tests/build/audit/diff results and baseline comparison |
| 7. Ship | `slops-ship`; Justin gates merge/deploy | `compliance-by-template`, observability runbook, app cutover playbook | Merge/deploy identifiers, release notes, rollback target |
| 8. Watch | `slops-canary` immediately; `slops-product-pulse` after sufficient traffic/time | `slops-investigate` on HOLD/ROLLBACK/anomaly | Health/ready/routes, latency/errors, pass/hold/rollback |
| 9. Learn | `slops-retro`; update decisions, playbook, skill, or backlog when evidence requires it | `slops-exec-summary`, `slops-financial-sketch` | Lesson, source correction, owner, next item or explicit no-change |
| 10. Promote | Identify the reusable part without copying Omen-specific behavior into L0 | `slops-context-markdown`, `design-md-author`, `slops-skill-author` | Promotion proposal or explicit reason the lesson stays L2 |

## Change-Type Bundles

### Backend/API behavior

Required: repo inspection → contract/spec → `slops-tdd` → git flow → code review → quality baseline → feature/security/recommendation Done as applicable. External providers add pre-build research, workflow tree, security/privacy evidence, and provider recovery behavior.

### Frontend/user-visible behavior

Required: page-system/design source → appropriate implementation loop → `slops-ux-copy` when words change → `slops-ui-ux-audit` → mobile smoke → real mobile QA at the release boundary. Use `slops-taste` and `slops-design-system-pack` while creating; use the SLOPS audit for verdicts.

### AI, math, or data behavior

Required: source/data contract → `slops-ai-integration-review` or `slops-data-ingest-plan` → `slops-tdd` → recommendation Done → code review → quality baseline. State what is live, stub, unavailable, or inferred.

### Release/operations

Required: quality baseline → code/design/security verdicts → `slops-ship` → `slops-canary` → rollback evidence → product pulse. Production, secrets, DNS, migrations, payment behavior, and deploy remain Justin-gated.

### Content and explainers

Use the screenplay → explainer/animation chain only when a real Omen result, method, or release needs explanation. Route public content through the content-marketing Done gate and L1 strategy; do not manufacture content merely to exercise a skill.

## Stop Conditions

- Required skill or source is unavailable and no approved equivalent exists.
- Intended TDD RED fails for the wrong reason.
- P0/P1 remains unresolved without Justin's explicit acceptance.
- Quality baseline regresses without an approved explanation.
- Mock/live status, provider terms, consent, or security boundary is unclear.
- A production, secret, migration, payment, install, push, merge, or deploy gate lacks approval.

## Completion

The task is complete only when its applicable Done files pass, the Done ledger has evidence, the skill-usage ledger has a receipt, and any procedure gap is either corrected at its source or placed in the sprint with an owner and done-when.
