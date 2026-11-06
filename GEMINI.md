## Antigravity only

Antigravity loads `AGENTS.md` and this file on its own; a bare `@AGENTS.md` would not inline it
(antigravity.google/docs/rules), so there is no import line.

- The agent shell may not have Homebrew on its PATH (2026-10-21 sessions: `command not found: node`).
  Start every shell with:
  `export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"`
- Before writing, confirm you are alone in the tree: `node scripts/check-workspace-solo.js`.
- recall is available as an MCP server (`recall_search`); use it for history instead of reading old files.
- Omen has no `.agents/hooks.json` yet, so no guard runs for Antigravity here: run `npm run closeout`
  yourself before saying a task is done, and end with `STATUS: done|blocked|budget`. CI repeats closeout.
