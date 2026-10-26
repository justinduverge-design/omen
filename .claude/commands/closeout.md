---
description: Close out the task: gates, status, decision log
---
1. `npm run closeout`. Any P0 or failure blocks close-out; fix it or report it.
2. Set `Status: VERIFIED` with an `Evidence:` pointer on the item in `Direction/current_sprint.md`.
3. Log decisions in `Direction/decision_log.md`. If a new mistake was named, add one line to
   "Mistakes we already made" in `AGENTS.md`.
4. Report checks as PASS / FAIL / NOT RUN. An unrun check is not a pass.
