# Done Ledger

**Purpose:** every closure recorded. Review monthly — gates skipped often signal a prompt or skill to revisit.

## How to use

When you close a task, append a row. Format:

```
| Date | Item | Done docs applied | Gates skipped + why | Skill/prompt to revisit |
|---|---|---|---|---|
| 2026-06-15 | Phase 1.3 — page-system spec | feature, design | none | — |
```

If you skip a gate, write why. If the same gate gets skipped 3+ times across different tasks, that's a signal — either the gate is wrong (fix the gate), the agent doesn't know how to satisfy it (fix the prompt or skill), or the work is being mis-scoped (fix the planning).

## Active log

| Date | Item | Done docs applied | Gates skipped + why | Skill/prompt to revisit |
|---|---|---|---|---|
| 2026-06-15 | Phase 1.3 — page-system spec | feature, design | n/a — spec authoring, not feature ship | — |
| 2026-06-15 | RESOURCES_INDEX + facts-of-record at L0/L1/L2 + L1 strategy promotion | feature (doctrine) | content-marketing-done deferred to live posts | — |
| 2026-06-15 | Phase 1.4 — font system propagation fix | page, design | repo-local run-slops driver gate skipped: driver expects stale Trade Analyzer CTA text (`Run Your Trade`); replaced with targeted browser QA for 1.4 scope | run-slops-saloon driver |

## Monthly review

On the first of each month, scan the previous month's rows. Look for:

- Same gate skipped repeatedly → fix gate, prompt, or skill
- Same Done doc applied without others that should have applied → fix the routing rule in `definition-of-done.md`
- New patterns of "why skipped" → consider new done-file or merge existing
