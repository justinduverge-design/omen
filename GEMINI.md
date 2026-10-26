@AGENTS.md

## Antigravity only

- The agent shell may not have Homebrew on its PATH (2026-10-21 sessions: `command not found: node`).
  Start every shell with:
  `export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"`
- Before writing, confirm you are alone in the tree: `node scripts/check-workspace-solo.js`.
- recall is available as an MCP server (`recall_search`); use it for history instead of reading old files.
- No hooks run here, so run `npm run closeout` yourself before saying a task is done. CI repeats it.
