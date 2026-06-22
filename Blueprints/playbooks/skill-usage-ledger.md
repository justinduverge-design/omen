# Corvus Skill-Usage Ledger

## Purpose

Prove which skills are doing useful work and expose unused, skipped, or weak procedures. This ledger complements `../done/LEDGER.md`: the Done ledger proves the product gate; this ledger proves the operating method.

## Entry Shape

| Date | Task/milestone | Skill | Result | Evidence | Procedure gap / next correction |
|---|---|---|---|---|---|

Use one row per invoked skill. Record a skipped required skill as `SKIPPED` with the reason. Do not add rows for conditional skills that were genuinely unrelated; list those in the task's skill receipt instead.

## Active Log

| Date | Task/milestone | Skill | Result | Evidence | Procedure gap / next correction |
|---|---|---|---|---|---|
| 2026-06-21 | Convert skill catalog into Corvus procedures | `slops-repo-inspector` | PASS | Root/L2 repo, branch, dirty state, current sources, and stale L2 context path inspected | L2 context still carried OneDrive paths; corrected in this procedure pass |
| 2026-06-21 | Convert skill catalog into Corvus procedures | `slops-graphify` / `graphify` query | PARTIAL | Root graph query returned skill/sprint/done nodes but only shallow implicit links | Encode explicit links in playbooks, kickoff, and Done gates; refresh graph after merge |
| 2026-06-21 | Convert skill catalog into Corvus procedures | `planning-pass` | PASS | Post-live learning gate and procedure adoption routed into the Corvus sprint/loop | Future items must use cold-start shape consistently |
| 2026-06-21 | Convert skill catalog into Corvus procedures | `slops-context-markdown` | PASS | `Blueprints/playbooks/` baseline, activation runbook, ledger, and post-live runbook | Review monthly for duplicated/stale procedure text |
| 2026-06-21 | Park future skills | `slops-skill-author` | PASS | Canonical statuses, triggers, versions, routing, lifecycle, backup, and runtime removal | Reactivation requires same-pass routing/lifecycle/runtime distribution |
| 2026-06-21 | Refresh stale Corvus skill-procedure graph | `slops-graphify` | PASS | `../../References/graphify/REFRESH_REPORT_2026-06-21.md`; canonical graph 228 nodes / 224 edges / 23 communities with 27 L0↔L2 edges | Canonical curated graph retains 52 legacy edge-evidence warnings for a later curation pass |
| 2026-06-21 | Refresh stale Corvus skill-procedure graph | `graphify` | PASS | Deterministic Markdown merge, archive-node pruning, recluster, and broad-query verification in canonical and Corvus-local graphs | Full semantic rebuild intentionally deferred; no approved local semantic backend used during Claude's active work |
| 2026-06-22 | Phase 1.5g.0 motif grammar spec authoring (Path A) | `Workflow` (3-proposal × 3-lens synthesis + completeness critic) | PASS | `Blueprints/specs/team-motif-grammar.md` v1; category-axis winner over Maximum-flexibility / Tier-Based (avg 5.67 vs 4.67); critic verdict patch-then-ship, 10 patches applied | Workflow ate two rate-limit resets before completing; cache-resume worked as designed (research and most-verify hits returned instantly on resume) |
| 2026-06-22 | Phase 1.5g.0 motif grammar spec authoring (Path A) | `slops-context-markdown` (doctrine) | PASS | Spec frontmatter + house-style markdown discipline applied across `Blueprints/specs/team-motif-grammar.md`, page-system addendum, decision log entry, sprint split, inbox update | n/a |
| 2026-06-22 | Phase 1.5g.0 motif grammar spec authoring (Path A) | `design-md-author` (doctrine) | PASS | Per-team grammar shape (motif / typeFlourish / culturalMoment), AAA gate table, sprint split with done-when, cross-references | n/a |
| 2026-06-22 | Phase 1.5g.0 motif grammar spec authoring (Path A) | `slops-tdd` | N/A | Doc-only deliverable; no behavior change; no fast deterministic test command applies | Pickup at 1.5g.1 — motif resolver + `excludesOmenCard` enforcement + accent-fallthrough Vitest pins are the natural RED targets |
| 2026-06-22 | Phase 1.5g.0 motif grammar spec authoring (Path A) | `slops-ui-ux-audit` | N/A | No UI surface change in 1.5g.0; v1 grammar gates downstream rendering | Pickup at 1.5g.1 — motif color × surface ≥ 3.0 sweep extension |
| 2026-06-22 | Phase 1.5g.0 motif grammar spec authoring (Path A) | `ui-ux-pro-max` | N/A | Doc-only; no styling decisions | Pickup at 1.5g.2 — Alegreya OpenType feature spike (`"smcp" 1` retention vs `text-transform: uppercase` fallback) |
| 2026-06-22 | Phase 1.5g.0 motif grammar spec authoring (Path A) | `slops-code-review` | N/A | No code merging; doctrine fixes applied via 3-lens adversarial verify inside the workflow | Pickup at 1.5g.1+ as the per-PR review skill |
| 2026-06-22 | Phase 1.5g.0 motif grammar spec authoring (Path A) | `slops-ux-copy` | N/A | No production copy ships in 1.5g.0; eyebrow strings drafted in spec as proposals | Pickup at 1.5g.3 — every moment eyebrow string must pass copy review before render |

## Monthly Review

On the first of each month and after every release:

1. Compare this ledger with `../done/LEDGER.md`.
2. Find required skills skipped, conditional skills never triggered, and repeated procedure gaps.
3. Use `slops-retro` to decide whether to fix the playbook, skill, prompt, done gate, or task scope.
4. Do not keep a skill active solely because it exists; propose parking or retirement when it has no valid trigger.
