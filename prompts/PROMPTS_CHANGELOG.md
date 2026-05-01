# Prompts Changelog
**File:** `prompts/PROMPTS_CHANGELOG.md`

Every change to any prompt in the `/prompts` directory must be logged here.
Include: date, file changed, what changed, and why.
The self-improving loop tracks win rates but not prompt changes — this file fills that gap.

---

## Format

```
## [version] — YYYY-MM-DD
**File:** prompts/filename.md
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
**File:** prompts/manager_agent.md
**Changed by:** Justin Duverge
**Win rate at time of change:** N/A (initial version)

### What changed
Initial prompt created. Extracted from hardcoded template string in `ssffmvp_agents.js`
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
**File:** prompts/sub_agents.md
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

<!-- Add new entries above this line, newest first -->
