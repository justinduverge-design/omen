# Sprint Synergy Playbook

How to plan and close work so the active context for any pull stays small, and so the evidence we keep for retro/overhaul stays canonical instead of duplicated. Authored 2026-06-27 after the `current_sprint.md` split.

## The four-tier zoom

Every artifact lives at exactly one zoom level. A puller reads top-down and stops as soon as they have enough.

| Tier | File | Purpose | Read when |
|------|------|---------|-----------|
| 0 | `Direction/agent_inbox.md` | One pinned active task | every pull |
| 1 | `Direction/current_sprint.md` | Open queue + Now + Current State + Guardrails | every pull when inbox is empty |
| 2 | `Direction/sprints_completed.md` | Done items, one-paragraph summary each, with pointers to evidence | only when retro / overhaul / next-sprint planning |
| 3 | `Blueprints/done/LEDGER.md` + GitHub PRs/runs/commits | Per-deliverable receipts and the immutable evidence layer | only when a specific past decision needs auditing |

**Rule:** never inline tier-3 evidence into a tier-1 or tier-2 file. If you catch yourself pasting a run ID or commit SHA more than once, replace the second occurrence with a pointer.

## Done-item shape (writing one)

When an item closes, the closer writes **two** things, not three:

1. **`Blueprints/done/LEDGER.md` row** — the receipt. Full evidence: phase ID, date, PR #, deploy run #, merge commit SHA, test counts, audit findings, deferred work. This is the canonical record.
2. **`Direction/sprints_completed.md` one-paragraph entry** — a summary that names the phase, the date, what shipped (one sentence), and links the LEDGER row. No re-pasted run IDs.

What used to be a 200-word `current_sprint.md` `- [x]` block becomes a ~40-word `sprints_completed.md` entry + an immutable LEDGER row. The receipt is queryable on GitHub (PR description, commit message) without anyone reading it for next-task selection.

### Template
```markdown
- [x] **Phase X.Y — <one-line what shipped> (<date>).** <One sentence on scope / risk surface.> Receipt: `Blueprints/done/LEDGER.md` row `<phase-id>`. PR #<n>, deploy run `<n>`, merge `<sha>`.
```

## Open-item shape (writing one)

Each open `- [ ]` in `current_sprint.md` should carry, in this order:

1. **Phase ID + one-line goal**
2. **Blockers** — explicit phase refs in the form `Blocked by Phase X.Y [ ]` or `Blocked by Phase X.Y [x]` so a puller can scan for unblocked work in one pass.
3. **Done docs needed** — which `Blueprints/done/*.md` gates apply.
4. **Guardrails** — which skills must run (`ui-ux-pro-max`, `slops-code-review`, etc.).
5. **Token-cost hint** (NEW) — `small` (≤2 files, single-purpose), `medium` (a phase slice, 3–8 files), `large` (cross-cutting). Pullers can pick small items when they have low remaining context budget.

If an open item runs longer than ~80 words, it's actually a spec — move the body to `Blueprints/specs/<phase-id>.md` and leave a one-line `Spec: ` pointer in the sprint.

## Lane semantics

Lanes (`Ops / Justin`, `Backend`, `Frontend`, `Verify`, `Decisions`, `Tech debt`) are **work areas**, not agent assignments. Any agent may pull any agent-buildable item from any lane. Pull decisions go by:

1. Is it unblocked?
2. Does the puller's tool surface fit (e.g., a `ui-ux-pro-max` guardrail wants Claude's design context, but Codex can still do it if needed)?
3. What's the token-cost hint?

Soft-lean ("Claude leans frontend / Codex leans backend") is retired — it was making us assign work by convention instead of by readiness.

## Phase close-out ritual (3 commands, not 3 paragraphs)

When closing a sprint phase:

1. Move every `- [x]` paragraph out of `current_sprint.md` and into `sprints_completed.md` using the done-item template above.
2. Append the per-deliverable receipt to `Blueprints/done/LEDGER.md`.
3. Log the operating-rule change (if any) in `Direction/decision_log.md`.

When the active sprint fully closes (e.g., at major version cuts), rotate `sprints_completed.md` itself into `Archive/sprint-completed-<YYYY-MM-DD>.md` and start fresh. Same one-off pattern used on 2026-06-02.

## What this saves

The 2026-06-27 split alone took `current_sprint.md` from 55.9 KB → 17.0 KB (69% smaller) without losing one piece of evidence. Steady-state savings come from:

- **No re-paste of run IDs / commit SHAs** in any tier-1 or tier-2 file. GitHub already has them.
- **No more per-item evidence prose growing in the sprint.** New `- [x]` entries are one paragraph, not five.
- **Pullers stop at tier-1 by default.** Tier-2 is only read on retro pulls. Tier-3 is only read when a specific decision is being audited.

## When to revisit

Re-read this playbook when:
- You catch yourself reading `sprints_completed.md` to pick the next task. (Wrong tier; agent_inbox or current_sprint should have been enough.)
- A new `- [x]` paragraph in `sprints_completed.md` exceeds ~80 words. (Move the body to LEDGER.)
- A new `- [ ]` paragraph in `current_sprint.md` exceeds ~80 words. (Move the body to a spec.)
- We start a new SLOPS product. (Copy this doc; the tiered model is product-agnostic.)
