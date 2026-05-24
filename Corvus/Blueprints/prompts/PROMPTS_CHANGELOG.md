# Prompts Changelog
**File:** `Blueprints/prompts/PROMPTS_CHANGELOG.md`

Every change to any prompt in the `/prompts` directory must be logged here.
Include: date, file changed, what changed, and why.
The self-improving loop tracks win rates but not prompt changes — this file fills that gap.

---

## Format

```
## [version] — YYYY-MM-DD
**File:** Blueprints/prompts/filename.md
**Changed by:** your name
**Win rate at time of change:** X% (from system_context table)

### What changed
Description of the exact change made.

### Why
The reason — a drop in win rate, a new edge case, model behavior observed, etc.

### Expected effect
What you expect this change to improve.
```

---

## [1.0.0] — 2025-11-12
**File:** Blueprints/prompts/manager_agent.md
**Changed by:** Justin Duverge
**Win rate at time of change:** N/A (initial version)

### What changed
Initial prompt created. Extracted from hardcoded template string in `slops-saloon_agents.js`
and moved to this markdown file for version-controlled prompt management.

### Why
Hardcoded prompts in JavaScript are invisible to non-technical collaborators and
have no change history. Moving prompts to markdown means every edit is tracked
in git, and the AI's reasoning instructions can be tuned without touching code.

### Expected effect
No change to output quality at launch — this is a structural improvement only.
Future tuning can now be measured against this baseline.

---

## [1.0.0] — 2025-11-12
**File:** Blueprints/prompts/sub_agents.md
**Changed by:** Justin Duverge
**Win rate at time of change:** N/A (initial version)

### What changed
All six sub-agent prompt templates documented for the first time.
Previously these were implicit — the agents returned hardcoded strings.

### Why
Formalizing the sub-agent output contract (one sentence, specific format)
makes the Manager Agent's synthesis more predictable and easier to debug
when a recommendation is unexpectedly poor.

### Expected effect
More consistent signal quality from sub-agents. Easier to identify
which agent produced a bad signal when reviewing a wrong call.

---

## [1.0.0] — 2026-05-22
**File:** Blueprints/prompts/omen-mvp-move-frontend.md
**Changed by:** Claude
**Win rate at time of change:** N/A (initial version)

### What changed
Initial frontend implementation prompt created for the Omen of the Week / MVP Move screen.
Covers: form inputs, full state machine (8 states), signals panel, confidence meter,
risk display, mock/dev toggle, visual conventions, Football.jsx tab update, what not to
build, and acceptance criteria.

### Why
The backend mock endpoint prompt (omen-mvp-move-development.md) already existed.
The frontend prompt slot was empty. Without this prompt, frontend implementation
would proceed without a reviewable brief anchored to the contract.

### Expected effect
A dev session given this prompt can implement the Omen screen correctly on the
first pass — correct state machine, correct field mapping, correct visual style —
without needing to re-read the full handoff and spec from scratch.

---

<!-- Add new entries above this line, newest first -->
