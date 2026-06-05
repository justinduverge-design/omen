# How to Run the Build Loop

**Goal:** one short instruction per task. The folder carries the context; you approve the gates.

## The pieces (already in place)
- **Task slot:** `Direction/agent_inbox.md` — one active task at a time.
- **Kickoffs:** `Blueprints/prompts/kickoff-backend-codex.md` (Codex), `Blueprints/prompts/kickoff-frontend-claude.md` (Claude).
- **Self-check:** `Blueprints/definition-of-done.md`.
- **Contract bus:** `Blueprints/handoffs/backend-to-frontend.md` (Codex → Claude), `frontend-to-backend.md` (Claude → Codex).
- **Memory:** `Direction/decision_log.md`. **Queue/history:** `Direction/current_sprint.md`.

## Each task — 5 steps
1. **Load the task** into `Direction/agent_inbox.md` (copy the next item from `current_sprint.md` → "Next"; set Lane + Done-when).
2. **Kick off the right lane:** paste `kickoff-backend-codex.md` to Codex *or* `kickoff-frontend-claude.md` to Claude.
3. **Approve the plan.** The agent reports the task as understood, files it will touch, files it will avoid, and how it will verify. Confirm or correct before it edits.
4. **It builds and closes out.** Satisfies the definition-of-done, writes its handoff, logs the decision, reports test/build results.
5. **Full feature = both lanes.** Run backend first (it writes the contract to `backend-to-frontend.md`), then run frontend against that contract.

You stay in only at the **gates**: deploy, secrets, migrations, Stripe production, naming. The agent stops there and waits for you.

## Buildable candidates right now
Corvus is in launch-QA, so most `current_sprint.md` "Next" items are Justin-gated ops (deploy, authenticated smoke with real tokens, Stripe production). Clean agent-buildable items:
- **Frontend (Claude):** run the UX pass on the Account and ConnectLeague pages (sprint item 6).
- **Backend (Codex):** persist Stripe `trial_ends_at` / current-period dates from webhook events — *coordinate first with the in-flight, not-yet-deployed Stripe webhook recovery work so they don't collide.*
- **Decision (Claude + Justin, not a build):** merge or retire `POST /api/optimizer/mvp-move`.

## Reconciliation notes
- **Task pointer:** there used to be two (`agent_inbox.md` and `current_sprint.md`). `agent_inbox.md` is now the single *active task*; `current_sprint.md` stays the *queue + history*.
- **Handoffs:** `Blueprints/handoffs/*` is the canonical *contract* bus; `Blueprints/agent_handoff.md` is a *historical session log*. Use `handoffs/*` for new contracts.
