# Omen Skill-Usage Ledger

## Purpose

Prove which skills are doing useful work and expose unused, skipped, or weak procedures. This ledger complements `../done/LEDGER.md`: the Done ledger proves the product gate; this ledger proves the operating method.

## Entry Shape

| Date | Task/milestone | Skill | Result | Evidence | Procedure gap / next correction |
|---|---|---|---|---|---|

Use one row per invoked skill. Record a skipped required skill as `SKIPPED` with the reason. Do not add rows for conditional skills that were genuinely unrelated; list those in the task's skill receipt instead.

## Active Log

| Date | Task/milestone | Skill | Result | Evidence | Procedure gap / next correction |
|---|---|---|---|---|---|
| 2026-06-21 | Convert skill catalog into Omen procedures | `slops-repo-inspector` | PASS | Root/L2 repo, branch, dirty state, current sources, and stale L2 context path inspected | L2 context still carried OneDrive paths; corrected in this procedure pass |
| 2026-06-21 | Convert skill catalog into Omen procedures | `slops-graphify` / `graphify` query | PARTIAL | Root graph query returned skill/sprint/done nodes but only shallow implicit links | Encode explicit links in playbooks, kickoff, and Done gates; refresh graph after merge |
| 2026-06-21 | Convert skill catalog into Omen procedures | `planning-pass` | PASS | Post-live learning gate and procedure adoption routed into the Omen sprint/loop | Future items must use cold-start shape consistently |
| 2026-06-21 | Convert skill catalog into Omen procedures | `slops-context-markdown` | PASS | `Blueprints/playbooks/` baseline, activation runbook, ledger, and post-live runbook | Review monthly for duplicated/stale procedure text |
| 2026-06-21 | Park future skills | `slops-skill-author` | PASS | Canonical statuses, triggers, versions, routing, lifecycle, backup, and runtime removal | Reactivation requires same-pass routing/lifecycle/runtime distribution |
| 2026-06-21 | Refresh stale Omen skill-procedure graph | `slops-graphify` | PASS | `../../References/graphify/REFRESH_REPORT_2026-06-21.md`; canonical graph 228 nodes / 224 edges / 23 communities with 27 L0↔L2 edges | Canonical curated graph retains 52 legacy edge-evidence warnings for a later curation pass |
| 2026-06-21 | Refresh stale Omen skill-procedure graph | `graphify` | PASS | Deterministic Markdown merge, archive-node pruning, recluster, and broad-query verification in canonical and Omen-local graphs | Full semantic rebuild intentionally deferred; no approved local semantic backend used during Claude's active work |
| 2026-06-22 | Phase 1.5g.0 motif grammar spec authoring (Path A) | `Workflow` (3-proposal × 3-lens synthesis + completeness critic) | PASS | `Blueprints/specs/team-motif-grammar.md` v1; category-axis winner over Maximum-flexibility / Tier-Based (avg 5.67 vs 4.67); critic verdict patch-then-ship, 10 patches applied | Workflow ate two rate-limit resets before completing; cache-resume worked as designed (research and most-verify hits returned instantly on resume) |
| 2026-06-22 | Phase 1.5g.0 motif grammar spec authoring (Path A) | `slops-context-markdown` (doctrine) | PASS | Spec frontmatter + house-style markdown discipline applied across `Blueprints/specs/team-motif-grammar.md`, page-system addendum, decision log entry, sprint split, inbox update | n/a |
| 2026-06-22 | Phase 1.5g.0 motif grammar spec authoring (Path A) | `design-md-author` (doctrine) | PASS | Per-team grammar shape (motif / typeFlourish / culturalMoment), AAA gate table, sprint split with done-when, cross-references | n/a |
| 2026-06-22 | Phase 1.5g.0 motif grammar spec authoring (Path A) | `slops-tdd` | N/A | Doc-only deliverable; no behavior change; no fast deterministic test command applies | Pickup at 1.5g.1 — motif resolver + `excludesOmenCard` enforcement + accent-fallthrough Vitest pins are the natural RED targets |
| 2026-06-22 | Phase 1.5g.0 motif grammar spec authoring (Path A) | `slops-ui-ux-audit` | N/A | No UI surface change in 1.5g.0; v1 grammar gates downstream rendering | Pickup at 1.5g.1 — motif color × surface ≥ 3.0 sweep extension |
| 2026-06-22 | Phase 1.5g.0 motif grammar spec authoring (Path A) | `ui-ux-pro-max` | N/A | Doc-only; no styling decisions | Pickup at 1.5g.2 — Alegreya OpenType feature spike (`"smcp" 1` retention vs `text-transform: uppercase` fallback) |
| 2026-06-22 | Phase 1.5g.0 motif grammar spec authoring (Path A) | `slops-code-review` | N/A | No code merging; doctrine fixes applied via 3-lens adversarial verify inside the workflow | Pickup at 1.5g.1+ as the per-PR review skill |
| 2026-06-22 | Phase 1.5g.0 motif grammar spec authoring (Path A) | `slops-ux-copy` | N/A | No production copy ships in 1.5g.0; eyebrow strings drafted in spec as proposals | Pickup at 1.5g.3 — every moment eyebrow string must pass copy review before render |
| 2026-06-22 | Corvus → Omen active rename pass | `graphify` | PASS | Queried L2 and L0 graphs before edits; graph surfaced source/import/router/deploy clusters for rename inventory | Graph itself was not rebuilt; refresh after merge so graph labels stop saying Corvus |
| 2026-06-22 | Corvus → Omen active rename pass | `slops-repo-inspector` | PASS | Confirmed L0/L1/L2 routing, nested Git roots, dirty files, and authoritative vs historical paths before editing | External GitHub/GHCR/Oracle/container identifiers remain a later cutover, not a silent rename |
| 2026-06-23 | Omen operational rename cutover plan | `graphify` | PARTIAL | Queried the existing L2 graph before planning; graph confirmed stale/shallow Corvus ops nodes, then direct deploy-file inspection filled the inventory | Refresh graph after the operational rename lands so deploy identities and labels are current |
| 2026-06-23 | Omen operational rename cutover plan | `slops-repo-inspector` | PASS | Confirmed root/app repo state, dirty worktrees, L2 sprint, and active operational files before writing plan-only artifacts | Worktree remains dirty from the broader rename; future commits must stage explicit paths |
| 2026-06-23 | Omen operational rename cutover plan | `planning-pass` | PASS | Added gated OP1-OP5 and V2 items to `Direction/current_sprint.md`; created `Blueprints/specs/omen-operational-rename-cutover.md` | Implementation must wait for Justin approval; plan intentionally avoids app code and production mutation |
| 2026-06-23 | Omen operational rename cutover plan | `slops-deploy-guard` | PASS | Inspected deploy workflow, Dockerfile, compose files, Hostinger deploy notes/env inventory, and rollback path | KVM1 mutation, runner-label changes, GHCR cutover, and repo rename all require explicit approval |
| 2026-06-23 | Omen operational rename OP2 repo-side seed patch | `graphify` | PARTIAL | Queried existing L2 graph before editing; graph was shallow/stale for deploy ops, so workflow and deploy files were inspected directly | Refresh graph after the operational cutover lands |
| 2026-06-23 | Omen operational rename OP2 repo-side seed patch | `slops-repo-inspector` | PASS | Reconfirmed root/app repo, dirty state, branch, and L2 target before editing workflow/deploy docs | Worktree remains dirty; stage explicit files only if committing |
| 2026-06-23 | Omen operational rename OP2 repo-side seed patch | `slops-deploy-guard` | PASS | Added Omen GHCR tags while preserving Corvus live pull path and rollback tags; no KVM1, DNS, SSL, secret, database, or production action | OP3 KVM1 prep still requires explicit approval before mutation |
| 2026-06-23 | Omen operational rename OP3 repo-side compose prep | `graphify` | PARTIAL | Queried existing L2 graph before editing; graph stayed too shallow for compose ops, so direct file inspection carried the inventory | Refresh graph after compose/deploy identity lands |
| 2026-06-23 | Omen operational rename OP3 repo-side compose prep | `slops-repo-inspector` | PASS | Reconfirmed dirty state and active L2 deploy files before changing compose/docs | Existing rename work remains uncommitted; stage explicit paths only |
| 2026-06-23 | Omen operational rename OP3 repo-side compose prep | `slops-deploy-guard` | PASS | Prepared Omen compose/Nginx sample files and docs without touching KVM1, runner labels, env files, DNS/SSL, secrets, database, or containers | Live OP3 server actions still require a KVM1 command window and approval |
| 2026-06-23 | Omen operational rename execution prep | `graphify` | PARTIAL | Rechecked the stale graph report against direct deploy/workflow searches; graph still maps the app as Corvus at L2, which confirms the operational rename boundary | Refresh graph after the deployment and repo identity are stable |
| 2026-06-23 | Omen operational rename execution prep | `slops-repo-inspector` | PASS | Confirmed branch, dirty state, runner status, runner labels, and latest deploy workflow runs before preparing the cutover workflow | Repo still needs explicit-path staging; do not stage `graphify-out/` or logo source scratch files |
| 2026-06-23 | Omen operational rename execution prep | `slops-deploy-guard` | PASS | Added the `omen-deploy` runner label while retaining `corvus-deploy`, and added a manual-only rollback-guarded cutover workflow for `/opt/omen` | Execute in sequence: seed images through the old path, run cutover, then flip regular deploy workflows to Omen-only |
| 2026-06-23 | Omen operational rename execution prep | `slops-git-flow` | PASS | Prepared to stage explicit paths only; rollback/artifacts and generated graph/cache outputs are excluded from commit scope | If direct main push is blocked, use a branch/PR without broad staging |
| 2026-06-23 | Omen cutover run 27995403847 | `slops-deploy-guard` | HOLD SAFE | Cutover stopped at `/opt/omen` prep because the KVM1 runner lacks passwordless sudo; health/readiness stayed green and live containers were not stopped | Workflow patched to use a short-lived Docker helper for `/opt/omen` prep through existing Docker access |
| 2026-06-23 | Omen operational rename completion | `slops-deploy-guard` | PASS | Cutover `27995488318`, primary deploy `27995567629`, and Tailscale fallback `27996194346` all passed from `/opt/omen`; public health/ready stayed green | Corvus rollback artifacts retained until explicit cleanup approval |
| 2026-06-23 | Omen operational rename completion | `slops-git-flow` | PASS | Commits `42a52a2`, `26a5771`, and `1ff2210` pushed; repo renamed to `justinduverge-design/omen`; local origin updated | Final docs commit still needed after path/remote evidence update |
| 2026-06-23 | Omen operational rename completion | `graphify` | PARTIAL | Existing graph confirmed stale Corvus L2 routing before and during rename; direct file scans verified the live operational residue classification | Refresh graph output in a separate graph maintenance pass after local folder rename settles |
| 2026-06-23 | Phase 1.5g.1 motif schema + hairlines | `slops-repo-inspector` | PASS | Read L2 kickoff files, sprint, inbox, facts, specs, handoffs, branch/dirty state before selecting Phase 1.5g.1 | Existing unrelated dirty prompt files, `graphify-out/`, and `logos/` stayed unstaged |
| 2026-06-23 | Phase 1.5g.1 motif schema + hairlines | `slops-tdd` | PASS | RED `node --test test/teamMotifs.test.mjs` failed on missing motif data/tokens; GREEN passed 3/3 after implementation | Keep focused node:test pins even though sprint wording said Vitest |
| 2026-06-23 | Phase 1.5g.1 motif schema + hairlines | `slops-code-review` | PASS | `Blueprints/audits/2026-06-23-phase1-5g-code-review.md`; verdict merge, no P0/P1/P2 | Existing Vite bundle-size warning remains unrelated |
| 2026-06-23 | Phase 1.5g.1 motif schema + hairlines | `slops-ui-ux-audit` | PASS | `Blueprints/audits/2026-06-23-phase1-5g-ui-ux-audit.md`; screenshots and DOM checks for PIT/MIA/NO/GB | Full iOS Safari sweep remains Phase 1.13 |
| 2026-06-23 | Phase 1.5g.1 motif schema + hairlines | `rbac-risk-review` | PASS | `Blueprints/audits/2026-06-23-phase1-5g-rbac-risk-review.md`; no auth, data, secret, package, or deploy escalation | n/a |
| 2026-06-23 | Phase 1.5g.1 motif schema + hairlines | `slops-quality-baseline` | PASS | `Blueprints/quality/baseline.json` ratcheted from 312/312 to 356/356 with audits/build/diff green | Baseline was old relative to current sprint; refreshed during closeout |
| 2026-06-23 | Phase 1.5g.1 motif schema + hairlines | `run-slops-saloon` | PARTIAL | Local Vite server used and screenshots captured under `Solutions/reports/_screenshots/phase1-5g1/` | Bundled driver assertions are stale for renamed Omen landing copy; direct Playwright was used |
| 2026-06-23 | Phase 1.5g.1 motif schema + hairlines | `slops-git-flow` | PASS | Implementation commit `e66e9d7` staged explicit source/test paths only; closeout commit stages docs/evidence explicitly | No push or deploy from this task |

## Monthly Review

On the first of each month and after every release:

1. Compare this ledger with `../done/LEDGER.md`.
2. Find required skills skipped, conditional skills never triggered, and repeated procedure gaps.
3. Use `slops-retro` to decide whether to fix the playbook, skill, prompt, done gate, or task scope.
4. Do not keep a skill active solely because it exists; propose parking or retirement when it has no valid trigger.
