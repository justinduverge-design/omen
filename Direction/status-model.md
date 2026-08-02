# Status model — Omen operational mirror

```text
MIRROR_OF:      justinduverge-design/Slops-OS :: Blueprints/agent-modules/status-model.md
SCHEMA_VERSION: 1.0.0
SOURCE_COMMIT:  d26b7b66e5155ecbd07b621d1b416d527277d9d4
LAST_SYNCED:    2026-07-30
```

**Reconciliation note (2026-08-02):** The operational rules were compared against the
available L0 source and normalized locally. `SOURCE_COMMIT` remains the prior recorded
upstream revision until the L0 documentation change is committed; do not treat the date or
the commit marker as a claim that an uncommitted L0 change is published.

Omen is a separate repository. It must work in standalone clones and in CI, where the L0
canonical source is not on disk. **In a standalone Omen checkout, this mirror is the
operative model.** L0 remains the shared canonical source across layers.

**There is no silent "L0 wins" rule.** When both copies are available, any difference in
`SCHEMA_VERSION` or in operational content is a **blocking Truth Gate failure** — halt and
report the mismatch. Do not proceed on either copy, and do not quietly reconcile one to the
other; the divergence is the finding.

This is the queue model for `Direction/current_sprint.md`. It replaces the retired checkbox
mechanic — `- [ ]` / `- [x]` boxes, selecting work by box state, and ticking a box to close.

## Lifecycle

```text
READY → IN_PROGRESS → VERIFIED → CLOSED
```

`CLOSED` is terminal. A regression after `CLOSED` does not reopen the task — it creates a
**new linked task** that names the closed one.

## `Claim:` — required for `IN_PROGRESS`

`IN_PROGRESS` is a statement that a named party is **actively advancing the work right
now**. It is never inferred from partial implementation, a merged PR, or a branch that once
existed.

```text
Claim: <YYYY-MM-DD> <named claimant> — <what is being advanced>
```

A task carries `IN_PROGRESS` only while a current named `Claim:` is present and that
claimant is actively advancing the remaining work. With no valid active claim the task is
`READY`, regardless of how much of it is already built. Release a stale claim rather than
letting it hold the task.

## `Evidence:` requirements

`Evidence:` is required on `VERIFIED` and on `CLOSED / COMPLETED`. It must point **only at
evidence that directly supports that task** — an exact PR number, commit SHA, file path,
run ID, or output location. Never a broad range (`#125–#139`) that sweeps in unrelated or
unmerged work.

**A merged PR alone does not satisfy `VERIFIED`.** The task's own `Done when:` criteria
must be met, and any outstanding item must be shown to fall outside that task's scope. Per
`Blueprints/definition-of-done.md`, point to evidence rather than pasting command output.

## Closure types

`CLOSED` requires a `Closure:` value:

| Closure | Requires |
| :--- | :--- |
| `COMPLETED` | evidence — an exact commit hash, PR, path, or output location |
| `SUPERSEDED` | a named successor task or artifact |
| `DESCOPED` | a stated reason |

## `Blocked by:`

Required on **every active task** (`READY`, `IN_PROGRESS`, `VERIFIED`). Repeatable — **one
blocker per line**, never combined. The **type is the first token**:

| Form | Meaning |
| :--- | :--- |
| `None` | not blocked |
| `AGENT_RESOLVABLE — <reason>` | an agent can clear this without founder input |
| `FOUNDER_APPROVAL — <decision>` | needs Justin's decision |
| `EXTERNAL — <dependency>` | outside the repo (vendor, billing, device, season) |
| `TASK-<sprint-key> — <predecessor>` | another task must land first |

No empty or placeholder reasons. **Unblocked means exactly one `None` line** — `None` never
appears alongside another blocker.

## `Unblock:`

Repeatable, dated, append-only. **Never erase prior entries** — the history is the audit
trail for how a blocker was cleared.

```text
Unblock: <YYYY-MM-DD> CLEARED|ROUTED|ESCALATED|REASSESSED — <detail>
```

## Selection order

Apply in order; the first rule that discriminates wins:

1. **Founder pin** — a pinned item overrides the queue.
2. **Continue actionable `IN_PROGRESS`** — finish what is started before starting more.
3. **Effective priority** — a task blocking a higher-priority task **inherits** that higher
   priority.
4. **Downstream unblock reach** — how many tasks eventually unblock.
5. **Direct unblock count** — how many unblock immediately.
6. **Progress-now** — what can actually move today given current blockers.
7. **File order** — the tiebreak of last resort.

## WIP

A shortlist is **not** authority to claim five items. One new claim per agent by default;
work items in parallel only when they have been assessed parallel-safe (no shared hot files,
no ordering dependency). Release a task back to `READY` when the only remaining blocker is
escalated and outside your authority — do not hold a claim on work you cannot move.

## Required field block

Planning and grooming emit this block per task. This is the shape `planning-pass` writes.

```text
### <TASK-KEY> — <imperative title>

- **Status:** READY
- **Blocked by:** None
- **Priority:** P1
- **Cost:** small
- **Done when:** <explicit, testable outcome>
- **Do not touch:** <boundaries>
```

A closed task carries `Closure:` and its evidence instead of `Blocked by:`:

```text
- **Status:** CLOSED
- **Closure:** COMPLETED
- **Evidence:** <exact commit hash / PR / path / run id>
```
