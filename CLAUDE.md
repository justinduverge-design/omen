# Omen — Claude Context

You are working in the Omen product layer (L2). Omen is a fantasy football app: a user connects an
ESPN, Yahoo or Sleeper league and Omen tells them the best move this week. Confirm this session's actual
capabilities and read Runtime Policy before applying any authority. Lanes schedule work; they never grant
authority.

## Do this, in order

1. **Read the map and the inbox** (list below). That is the whole cold start.
2. **Take your task.** A pin in `Direction/agent_inbox.md` wins. With no pin, pick from
   `Direction/current_sprint.md` (small, active items only) or ask the founder. Record a `Claim:` on the one
   item you start.
3. **Read only what the map's routing table names for what you are touching.** Do not read the rest.
4. **Report your plan and wait for the founder.** Task, your tier and the assignment granting it, files to
   touch, verification plan, skills you will invoke.
5. **Build, review the diff before the PR, close out** (below).

If a file is missing, continue and say which one.

## Read in order before pulling a task

**This list and `Blueprints/prompts/kickoff-l2.md` are one contract and must stay identical.**
`node scripts/check-kickoff-drift.js` enforces it. Change one, change both. Do not grow it without the
founder: `node scripts/harness-cost.js` fails when the always-loaded set goes over budget.

1. `Direction/map.md` — what Omen is, rules that never bend, current focus, and the "when you touch X,
   read Y and call Z" table
2. `Direction/agent_inbox.md` — pinned task; **a pin wins over the queue**

Codex also reads `AGENT.md`, its runtime extension. **`AGENTS.md` with the S is the shared file; `AGENT.md`
extends it for Codex.**

## Reads on demand

Everything else is pulled by the map's routing table, not up front. The usual suspects:

| Read this | When |
|---|---|
| `Direction/facts-of-record.md` | A rule in the map needs its reasoning, or you may be about to state a public claim |
| `Direction/status-model.md` | Setting or reading `Status:`, `Claim:`, `Evidence:` |
| `Direction/known_issues.md` | You hit a bug; open issues only. Fixed ones: `known_issues-resolved.md` |
| `Direction/decision_log.md` | You need the reasoning behind a decision — search it, never load it whole |
| `Direction/shipped.md` | What has merged or is open; regenerate with `node scripts/shipped.js` |
| `Blueprints/definition-of-done.md` | Closing out |
| `RESOLVER.md` | Before creating a new file |
| `Blueprints/prompts/HOW-TO-RUN-THE-LOOP.md` | The loop, and the Review policy |
| `Blueprints/api-routes.md` | API contracts |
| `Brand/brand-system.md`, `Blueprints/specs/page-system.md`, `Blueprints/specs/design/component-lock-v1.md`, `team-theme-contract-v1.md` | Voice, page and component design |

`Blueprints/specs/omen-ux-ui-design-system-v1.md` is **partially superseded**; read its banner before
citing it.

### Skills are invoked by name

Call a Slops skill by name. Do not read it as a file and never copy one into this repo.
`Slops-OS/Blueprints/skills/SKILL_ROUTING.md` is authoritative for status and scope. Three are
**web-app only**: `slops-ui-ux-audit`, `mobile-first-qa-playbook`, `slops-mobile-smoke`. Native work wants
`slops-native-ui-audit`, `slops-native-sim-drive` and `slops-native-screen-design`.

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

When one is missing or two conflict, **flag the gap and stop.** Do not start the feature code.

## Review

Before opening a PR, review the diff in a fresh agent (`slops-code-review`) and fix what it finds. Ask
Codex (`@codex review`) only for database and migrations, user-data deletion or exposure, auth and
credentials, and billing. Never merge past an open P0/P1. Policy: `Blueprints/prompts/HOW-TO-RUN-THE-LOOP.md`.

## Close-out

1. Satisfy `Blueprints/definition-of-done.md` for the type of thing you shipped.
2. Set `Status: VERIFIED` on the item with an `Evidence:` pointer.
3. Log decisions in `Direction/decision_log.md`.
4. Add one line to `Blueprints/playbooks/skill-usage-log.md`: date, task, skills invoked, skills skipped and why.
5. Run the gates. **A P0 blocks your close-out.** An unrun check is not a passing check: in a standalone
   clone without the L0 tree, say the gate did not run.

```bash
node scripts/check-sprint-staleness.js                         # queue vs main, this repo
node ../../Blueprints/tools/truth-gate/truth-gate.mjs --quiet   # cross-layer docs, from L0 root
node ../../Blueprints/tools/valor-brain/validate.mjs            # opted-in metadata pages
node scripts/check-kickoff-drift.js                             # this list vs kickoff-l2.md
node scripts/harness-cost.js                                    # always-loaded set within budget
```

6. Write a dated handoff in `Blueprints/handoffs/` only when work continues in another session.

The older ledgers (`Blueprints/playbooks/skill-usage-ledger.md`, `Blueprints/done/LEDGER.md`) are history:
do not read them and do not append to them.
