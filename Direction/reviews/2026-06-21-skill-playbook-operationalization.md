# Omen Skill Playbook Operationalization

**Date:** 2026-06-21
**Status:** procedure baseline authored and wired; first product-task pilot pending

## Outcome

- Omen now has a core company-baseline playbook, a complete skill-activation runbook, an append-only usage ledger, and a parked post-live technology-learning runbook.
- All **52** registered skill entries appear exactly once in the activation matrix: 48 active, 1 paired, 2 parked, 1 retired.
- All **49** active/paired canonical packages remain present and hash-aligned in both agent runtimes: 98 package presences, zero canonical-file mismatches.
- `slops-learning-loop` and `slops-community-needs-research` remain canonical but are absent from both runtimes. Four prior runtime copies were backed up at `C:\Users\JDuve\.slops-skill-parked-backup-20260621-202704`.
- Current Omen authority files inspected by this pass contain no retired OneDrive workspace paths.

## Where Skills Now Work

| Operating point | Procedure | Effect |
|---|---|---|
| Session start | Shared kickoff `read-first` + `slops-repo-inspector` | Establishes repo, layer, dirty state, and current authority before work |
| Plan approval | Shared `plan-approval` + activation runbook | Names required/conditional skills, TDD feedback command, N/A reasons, and evidence location |
| Build | Company-baseline playbook | Routes backend, UI, AI/data, release, and content work through the appropriate skill bundle |
| Done | Definition of Done + feature/security/release gates | Requires TDD, quality, review, ship/canary/pulse, and a skill receipt when applicable |
| Closeout | Shared `done-and-close` | Appends evidence to the skill-usage ledger and surfaces procedure gaps |
| Operations | Canary → investigate → product pulse → retro | Turns live behavior into evidence, diagnoses safely, and corrects procedures |
| Future learning | Post-live technology-learning runbook | After live + seven stable days, teaches stack choices and produces before-season-end improvements |

## New Canonical Omen Procedures

- `Blueprints/playbooks/omen-company-baseline.md`
- `Blueprints/playbooks/skill-activation-runbook.md`
- `Blueprints/playbooks/skill-usage-ledger.md`
- `Blueprints/playbooks/post-live-technology-learning.md`
- `Blueprints/playbooks/README.md`

## Evidence From This Pass

- Existing graph query found skills, sprint, and Done nodes but only shallow implicit connections. The new playbooks encode those relationships explicitly.
- The existing Done ledger already shows repeated skipped review/audit skills. The new skill ledger makes skips visible and gives `slops-retro` a correction path.
- The first five procedure uses are recorded in `Blueprints/playbooks/skill-usage-ledger.md`.
- The sprint now contains `V1`, the first company-baseline skill-receipt pilot, and parked `PL1`, the post-live learning cycle.

## Remaining Gaps

### P1 — first real product-task pilot

The procedure is wired but has not yet governed a completed Omen product change. Apply `V1` to the next agent-buildable task without expanding its product scope. Verify that the plan, Done evidence, handoff, and skill ledger agree.

### P1 — conditional skills need evidence, not artificial invocation

Governance, legal, finance, content, animation, conversion, and agent-authoring skills now have explicit triggers but should only run when Omen produces the matching need. Monthly ledger review must identify skills that are never triggered and decide whether their route is valid, parked, or should be retired.

### P1 — release evidence is stale in places

`release-done.md` previously referenced a 291-test baseline while current sprint truth records 352. This pass corrected the gate, but the next release must run `slops-quality-baseline` and ratchet from actual current output rather than trusting either number.

### P1 — graph refresh remains post-merge work

The current graph predates these explicit playbook links. Refresh the L0↔L2 graph after the documentation is committed/merged, then query whether every lifecycle phase reaches a skill, Done gate, and evidence artifact.

### P2 — procedure enforcement is documentation-based

There is no CI check for 52-entry matrix parity or mandatory skill-receipt presence. Run the manual audit first; automate only after the pilot proves the receipt shape is useful and not noise.

### Parked work

- Learning: blocked until public Omen baseline + seven stable days + seven-day product pulse.
- Community app: outside Omen and blocked until Justin explicitly opens future product discovery with a named community, geography, need, and decision.

## AAA Completion Gate

- **Accuracy: PASS.** Routing/matrix parity is 52/52; all 51 canonical skill frontmatters parse; all 49 active/paired packages match both runtimes; parked packages are absent and backed up; claims distinguish authored, routed, exercised, and pending states.
- **Accessibility: PASS.** The core action, status gates, owners, N/A rule, evidence contract, and next pilot are explicit in plain language. No user interface changed.
- **Aesthetic Integrity: PASS.** The playbook set is indexed, uses one purpose per file, and avoids forcing unrelated skills into every task.
- **Release decision: SHIP THE PROCEDURE BASELINE.** No product deploy is involved.
- **Highest-risk gap:** `V1` has not yet proven the skill-receipt flow on a completed product task.

## Intentionally Not Touched

- Existing dirty frontend work in `page-system.md`, `index.css`, `DraftAssistant.jsx`, `TradeAnalyzer.jsx`, and `positionChip.js`.
- `Direction/agent_inbox.md`, which already contains user/agent work in progress.
- App source behavior, tests, packages, environment files, secrets, database, production, deploy, commit, push, merge, or external systems.
