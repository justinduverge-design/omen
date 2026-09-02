# Kickoff — Layer 2 (Omen product)

Paste this block into any runtime to start a product-layer session. It is **layer- and capability-named**, not vendor-named: it works for `claude-code`, `codex`, `cowork`, `api`, or `generic`, and it resolves authority from Runtime Policy rather than from who is reading it.

The kickoff is lane-agnostic — pull whatever the pin or the auto-populated inbox surfaces.

---

```text
You are working on Omen, Layer 2 (product).

STEP 0 — CONFIRM SESSION CAPABILITY (do this first, before any read)
  Do NOT infer capability from your vendor name, your model name, or an
  identity module. Identity modules describe POSSIBLE runtime profiles only.
  State explicitly, for THIS session, whether you actually have:
    - file read
    - file write / edit
    - terminal execution
    - git operations
    - network / connector access
    - persistent memory
  Missing or uncertain capability is treated as ABSENT. Uncertainty escalates
  to the founder; it is never resolved by inference.
  Then name which runtime in Runtime Policy you are: claude-code, codex,
  cowork, api, or generic. If you are none of them, you are generic.

STEP 0.1 — READ RUNTIME POLICY AND ACTIVE TRUST ASSIGNMENTS
  Read Runtime Policy Section 8 (runtime-policy/v1 and
  unreviewed-eligibility/v1) and Section 9 (active-trust-assignment/v1) in
  L0's Blueprints/agents/AGENT_INDEX.md. In a standalone Omen checkout where
  L0 is not available, you have NO active assignment by definition — operate
  at read-only and ask the founder before any write.
  - Your default_tier applies until an assignment says otherwise.
  - An empty `assignments: []` list means DEFAULTS ONLY. No assignment means
    no authority above your default_tier.
  - Apply ONLY the authority for the task actually in front of you. Never
    carry authority from a previous task, a previous session, or another item.
  - An assignment is void if session_capability_confirmed is not true, if its
    tier exceeds your max_eligible_tier, or if it has expired.
  - Capability alone grants no authority. A vendor or model name grants
    nothing at all.
  Report which tier you are operating at and why.

STEP 0.2 — CONFIRM YOU ARE ALONE IN THIS WORKING TREE
  Run: node scripts/check-workspace-solo.js
  Read the coverage block, not just the verdict.

  A clean tree is the kickoff expectation. Anything already dirty was put
  there by someone else — an unfinished previous session, or a concurrent
  one still typing. It is not yours to commit.

  If it reports findings, take your own worktree before writing anything:
    git worktree add ../omen-<your-task> -b <your-branch> main

  Branch discipline alone does NOT protect you. `git checkout` carries
  uncommitted changes across branches, which on 2026-08-24 is exactly how
  two unrelated workstreams ended up in one commit and how one session's
  files were twice moved onto a branch it had not selected.

  Never run `git add -A` or `git add .` in a tree you did not start clean.
  Stage the paths you wrote, by name.

  Record the HEAD sha this session starts from. Before closing, re-run:
    node scripts/check-workspace-solo.js --since <that-sha>

Read in order before acting:
0. Run slops-repo-inspector before planning. Establish repository truth —
   branch, ahead/behind origin, uncommitted state, canonical paths — before
   reading any queue.
  This list is identical to the one in CLAUDE.md, by contract.
  node scripts/check-kickoff-drift.js enforces it. Change one, change both.

  ALWAYS-READ CORE
   1. AGENTS.md            shared root posture, ownership, safety
   2. AGENT.md             Codex-specific extension of AGENTS.md.
                           AGENTS.md (with S) is the shared one; AGENT.md
                           extends it. One letter apart, easy to invert.
   3. RESOLVER.md          where a new file belongs, before you create one
   4. Direction/context.md
   5. Direction/agent_inbox.md      <- a pin wins over the queue
   6. Direction/current_sprint.md   <- lane queue when there is no pin
   7. Direction/status-model.md     states, Claim:/Evidence:, blocker grammar
   8. Direction/facts-of-record.md
   9. Direction/known_issues.md

  READ BEFORE YOU PLAN
  10. Direction/decision_log.md
  11. Blueprints/prompts/HOW-TO-RUN-THE-LOOP.md
  12. Blueprints/definition-of-done.md
  13. Blueprints/playbooks/omen-company-baseline.md
  14. Blueprints/playbooks/skill-activation-runbook.md
  15. Latest entry in Blueprints/handoffs/

  If a file is missing, continue and mention it.

Then run, in order:
1. PULL TASK
   - If Direction/agent_inbox.md has a 📌 pin, that's your task.
   - Otherwise select up to 5 items with Status: READY across all lanes in
     Direction/current_sprint.md, ordered by the selection rule in the status
     model, overwrite the selected-queue section in agent_inbox.md, surface any
     item whose Blocked by: line is not None, and set #1 as your active task.
     A shortlist is not authority to claim five — record a Claim: on the single
     item you are starting.
   - If your runtime has no queue-wide self-pull authority (see your standing
     conditions), do not select an item — ask the founder to name one.

2. PLAN-APPROVAL GATE
   - Report: task, the tier you are operating at and the assignment that
     grants it, files to touch, verification plan, skills you will invoke,
     skills considered-but-N/A with reason. Wait for the founder's
     confirmation.

3. BUILD — once the founder confirms.

4. DONE & CLOSE
   - Satisfy Blueprints/definition-of-done.md (per-type DoD).
   - Set Status: VERIFIED on the item in Direction/current_sprint.md and
     record its Evidence: pointer.
   - Log decisions in Direction/decision_log.md.
   - Append a row to Blueprints/playbooks/skill-usage-ledger.md (invoked +
     considered-but-skipped skills, with evidence pointer).
   - Write a dated handoff in Blueprints/handoffs/YYYY-MM-DD-<task>.md.
   - Append to Blueprints/done/LEDGER.md.

Begin now: run STEP 0, then STEP 0.1, then read the files above, then run
PULL TASK immediately. Do not wait for a separate task description — this
message is the task.

SAFETY GATES (apply throughout — no tier and no assignment removes these)
- Authorization requires ALL FOUR: the session actually has the capability;
  you hold an active assignment for THIS task; the Action Risk Tier gate is
  satisfied; and every founder, security, provider, and action-level approval
  is satisfied.
- Stop and wait for founder approval at: deploy, secrets, migrations,
  package-file edits, naming, cross-layer moves.
  (Stripe was removed from this list 2026-09-02. Omen is free indefinitely and
  no Stripe code, route, middleware, table, or column exists — a gate naming it
  implied a payment surface that is not there.)
- Destructive, production, DB-write, deployment, and secrets actions each need
  their own ACTION-LEVEL founder approval. General task approval is NOT
  sufficient. Re-ask per action.
- Main-branch merge is founder-only and is never delegated by any assignment.
- `git push` to a feature/worktree branch is allowed only while you are
  actively assigned full-executor for this task, and only after you have run
  verification and your report states an accurate complete/incomplete verdict.
  There is no standing branch, commit, or push authority for any runtime.
- Mock data must be clearly labeled. Never present as live advice.
- Don't expose ESPN cookies anywhere, ever.
- Founder approval does not remove hard safety, legal, provider, evidence, or
  irreversible-operation constraints.
```
