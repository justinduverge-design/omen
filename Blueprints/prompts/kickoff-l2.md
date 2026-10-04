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
  Revised 2026-10-03: the cold start was ~92,000 tokens and is now two files.
  Everything else is pulled by the routing table in the map, per task.
   1. Direction/map.md
   2. Direction/agent_inbox.md

  Codex also reads AGENT.md (its runtime extension of AGENTS.md).
  Direction/decision_log.md, the ledgers and Direction/shipped.md are records,
  not briefings: search them, never load them whole. You still WRITE to the
  decision log at close-out. If you are about to re-decide something, go read it.

	The Slops skills are INVOCABLE BY NAME. Do not read them as files and do not
	copy one into this repo. The local .claude/skills/ directory is linker output;
	Slops-OS/Blueprints/skills/SKILL_ROUTING.md is authoritative for status and
	scope. slops-ui-ux-audit, mobile-first-qa-playbook and slops-mobile-smoke are
	WEB-APP ONLY.

	SHORT FOUNDER PROMPTS ARE VALID
	If the founder gives a short prompt ("this Command Center screen feels wrong",
	"make League know the team", "fix this backend state"), do not ask for a
	fully-written task prompt. Use the kickoff context to identify the surface,
	read only the governing docs for that surface, route to the relevant skills by
	name, and ask only for a missing decision or restricted approval.

	SCREENSHOT / VOICE-NOTE UI INTAKE
	If the founder attaches a screenshot or screen recording and talks through
	what feels wrong, use Blueprints/prompts/omen-grade-ui-intent.md after this
	kickoff. It is the generic intake for page-driven work across Command Center,
	Omen, Trade, League, Waiver Watch, Ledger, League Pulse, Posts, and related
	product surfaces. It turns messy founder intent into source-backed UI work and
	crosswalks the result against current sprint items.

	SKILL ROUTING DEFAULTS
	- Native UI or screen behavior: slops-native-screen-design when deciding the
	  screen, slops-native-sim-drive for deterministic captures, and
	  slops-native-ui-audit for a built-screen grade.
	- Backend behavior or contracts: slops-tdd for the smallest behavior slice,
	  slops-quality-baseline for checks, and slops-code-review before handoff.
	- Security, privacy, provider credentials, auth, SQL, or release evidence:
	  security-privacy-evidence and rbac-risk-review, plus the action-level gates.
	- UX copy, empty/error/loading states, and exposed product wording:
	  slops-ux-copy, with facts-of-record checked for public claims.
	- Unclear external/provider behavior: pre-build-research before coding.
	If a named skill is unavailable in this runtime, say so and use the closest
	safe fallback without pretending the skill ran.

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
   - Review your diff in a fresh agent BEFORE opening the PR (slops-code-review);
     ask Codex (@codex review) only for database, user-data, auth/credential or
     billing changes. Never merge past an open P0/P1.
   - Satisfy Blueprints/definition-of-done.md (per-type DoD).
   - Set Status: VERIFIED on the item in Direction/current_sprint.md and
     record its Evidence: pointer.
   - Log decisions in Direction/decision_log.md.
   - Add one line to Blueprints/playbooks/skill-usage-log.md (skills invoked,
     skipped and why). The old ledgers are history: do not append to them.
   - Write a dated handoff in Blueprints/handoffs/YYYY-MM-DD-<task>.md only
     when the work continues in another session.
   - Run the gates. A P0 BLOCKS YOUR OWN CLOSE-OUT. An unrun check is not a
     passing check; in a standalone clone without L0, say the gate did not run.
       node scripts/check-sprint-staleness.js
       node ../../Blueprints/tools/truth-gate/truth-gate.mjs --quiet
       node ../../Blueprints/tools/valor-brain/validate.mjs
       node scripts/check-kickoff-drift.js
       node scripts/harness-cost.js

	Begin now: run STEP 0, then STEP 0.1, then read the files above, then run
	PULL TASK immediately unless the founder's message already names the task.
	Do not require a detailed prompt; this kickoff plus the founder's short
	instruction is enough to start discovery and plan approval.

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
