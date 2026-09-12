# Omen — Claude Context

You are working in the Omen product layer (L2). Confirm this session's actual capabilities and read
Runtime Policy before applying any authority. Lanes schedule work; they never grant authority.

## What Omen is

**Omen is a fantasy football management app.** A user connects a real league — ESPN, Yahoo, or
Sleeper — and Omen tells them the best move to make this week: what to do, why it matters, what the
risk is, and how confident it is. Plain-English reasoning, not heavy math. It should read like a
trusted analyst, not a calculator.

It ships as a **mobile app** — iPhone SwiftUI and Android Kotlin/Compose — and has a secondary web
app. Native is active authority; new web page migrations are paused.

**Trade Analyzer is the front door. Omen of the Week is the main event** — one call per week whose
type is not fixed: a start/sit, a pickup, a drop, or a trade. Waiver is its own section inside the
**League** destination. **Command Center is the Small Council** — Omen's advisors give short reads
on what they watch, one voice, seats labelled by subject.

ESPN, Yahoo and Sleeper all matter. ESPN is essential and fragile: treat it as high-value with
careful recovery flows, user guidance, and honest failure states.

**Two files own the detail, and both are in the read order below. Do not restate them here.**

| For | Read |
|---|---|
| Product promise, tool hierarchy, platform context, voice | `Direction/context.md` |
| Standing constraints — what is free, what is cut, what may be said publicly, security posture | `Direction/facts-of-record.md` |

A copy of a fact is a second source of truth, and the copy is the one that goes stale. This section
carried the billing and Draft-Assistant constraints until 2026-09-12 and had already drifted from
`facts-of-record.md` — it still said Draft Assistant was "cut from 1.0" after that was extended to
the 2027 season on 2026-08-11.

## Do this, in order

1. **Read the always-read core** below. Stop at step 2 if you have a pin.
2. **Take your task.** A pin in `Direction/agent_inbox.md` wins over the queue. With no pin, select
   from `Direction/current_sprint.md` by the selection rule in the status model. Record a `Claim:`
   on the one item you start.
3. **Read before you plan** — items 10–14 below, plus the native gate if the task is native.
4. **Report your plan and wait for the founder.** Name the task, your tier and the assignment
   granting it, files to touch, verification plan, and the skills you will invoke.
5. **Build, then close out** per the Close-out section. The gates are part of done.

If a file is missing, continue and say which one.

## Read in order before pulling a task

**This list and `Blueprints/prompts/kickoff-l2.md` are one contract and must stay identical.**
`node scripts/check-kickoff-drift.js` enforces it. Change one, change both. Do not grow the core
without the founder — every session pays for it.

### Always-read core

1. `AGENTS.md` — shared root posture, ownership boundaries, safety rules
2. `AGENT.md` — Codex-specific extension. **`AGENTS.md` with the S is the shared one**; `AGENT.md`
   extends it for Codex. One letter apart and easy to invert.
3. `RESOLVER.md` — where a new file belongs, before you create one
4. `Direction/context.md` — current operating context
5. `Direction/agent_inbox.md` — pinned task; **a pin wins over the queue**
6. `Direction/current_sprint.md` — the queue. **Active items only**; terminal items carry a
   one-line pointer into `Direction/sprint-verified-detail.md`
7. `Direction/status-model.md` — states, `Claim:`/`Evidence:`, blocker grammar, selection rule
8. `Direction/facts-of-record.md` — standing constraints
9. `Direction/known_issues.md` — **open** bugs. Fixed ones are in `Direction/known_issues-resolved.md`

### Read before you plan

10. `Blueprints/prompts/HOW-TO-RUN-THE-LOOP.md` — the loop in one page
11. `Blueprints/definition-of-done.md` — per-type DoD pointers
12. `Blueprints/playbooks/omen-company-baseline.md` — baseline procedure
13. `Blueprints/playbooks/skill-activation-runbook.md` — skill routing
14. Latest entry in `Blueprints/handoffs/` — last session handoff

`Direction/decision_log.md` is **not** read up front. Read the entry that governs what you are
touching. Write to it at close-out. About to re-decide something? Go read it first.

## Reads on demand

| Read this | When |
|---|---|
| `Direction/decision_log.md` | You need the reasoning behind a decision. L2's decision authority — there is no `Direction/decisions/` folder here. |
| `Direction/sprint-verified-detail.md` | You need evidence or correction history for a terminal item. |
| `Direction/known_issues-resolved.md` | A symptom looks familiar. More than one entry here has been re-opened. |
| `Direction/reviews/2026-09-07-sprint-reconciliation.md` | You need why the queue looks the way it does. Three findings are still standing. |
| `Brand/brand-system.md` | Voice, palette, type, the AAA framework. |
| `Blueprints/api-routes.md` | API contracts. |
| `Blueprints/specs/page-system.md` | Per-page typography, accent, palette, copy contract. |
| `Blueprints/specs/design/component-lock-v1.md` | Component APIs and tokens — Button, Input, Segmented, Card, type scale, spacing. |
| `Blueprints/specs/design/team-theme-contract-v1.md` | Which tokens a team skin may override, contrast rules, room-mode depth. |
| `Blueprints/handoffs/frontend-to-backend.md`, `backend-to-frontend.md`, `decisions.md` | The contract bus. |

`Blueprints/specs/omen-ux-ui-design-system-v1.md` is **partially superseded**. It is authoritative
only for base palette hexes, dark-mode token names, and brand voice. The two design specs above own
component APIs, tokens, and state patterns. Read its own banner before citing it for anything else.

### Skills are invoked by name

Call a Slops skill by name. Do not read it as a file and never copy one into this repo — 61 are
linked into `.claude/skills/` by `Slops-OS/Blueprints/tools/skill-link/link-skills.mjs`, and
`Slops-OS/Blueprints/skills/SKILL_ROUTING.md` is authoritative for status and scope. If a skill does
not appear, re-run the linker.

Three are **web-app only**: `slops-ui-ux-audit`, `mobile-first-qa-playbook`, `slops-mobile-smoke`.
Native work wants `slops-native-ui-audit` (grades a built screen), `slops-native-sim-drive`
(captures screenshots), and `slops-native-screen-design` (decides what a screen should be).

## Native mobile read gate

Read these before planning or writing code for any native iPhone, Android, mobile design-system,
onboarding, provider-connection, or mobile-release task:

1. `Blueprints/specs/mobile/omen-native-mobile-foundation-v1.md`
2. `Blueprints/specs/mobile/omen-native-design-house-v1.md`
3. `Blueprints/specs/mobile/omen-native-delivery-governance-v1.md`
4. `Blueprints/specs/mobile/omen-mobile-onboarding-connection-contract-v1.md`
5. `Blueprints/specs/mobile/omen-native-agent-capabilities-canvas-v1.md`
6. `Blueprints/playbooks/native-mobile-design-delivery-workflow-v1.md`
7. The approved Figma screen or component, and the API/state contract

When one of those is missing or two of them conflict, **flag the gap and stop.** Do not start the
feature code.

## Kickoff

Paste `Blueprints/prompts/kickoff-l2.md`, or run the auto-populate flow in
`Blueprints/prompts/HOW-TO-RUN-THE-LOOP.md`.

## Close-out

1. Satisfy `Blueprints/definition-of-done.md` for the type of thing you shipped.
2. Set `Status: VERIFIED` on the item with an `Evidence:` pointer.
3. Log decisions in `Direction/decision_log.md`.
4. Append a row to `Blueprints/playbooks/skill-usage-ledger.md` — invoked skills and
   considered-but-skipped, each with a reason.
5. Append to `Blueprints/done/LEDGER.md`.
6. Run the gates. **A P0 blocks your close-out** — it means an agent reading current docs would act
   on false information. An unrun check is not a passing check: in a standalone clone without the L0
   tree, say the gate did not run.

```bash
node scripts/check-sprint-staleness.js                         # queue vs main, this repo
node ../../Blueprints/tools/truth-gate/truth-gate.mjs --quiet   # cross-layer docs, from L0 root
node ../../Blueprints/tools/valor-brain/validate.mjs            # opted-in metadata pages
node scripts/check-kickoff-drift.js                             # this list vs kickoff-l2.md
```

7. Write a dated handoff in `Blueprints/handoffs/`.

Entries you append today cite repo-relative paths that resolve today — `Blueprints/done/LEDGER.md`,
not `Blueprints/done/LEDGER.md`. Old entries stay as written.
