@AGENTS.md

## Claude Code only

- `.claude/settings.json` hooks: `guard-bash.sh` blocks raw `gh pr merge`, pushes to `main`, `--no-verify`
  and production commands; `budget.py` blocks tools once the card's run budget is spent; with `VALOR_RUN=1`,
  `report_gate.py` makes a run end with `STATUS: done|blocked|budget`. Say what a block stopped; don't work around it.
- Commands: `/plan-task`, `/review` (`.claude/agents/reviewer.md`), `/closeout`. MCP: recall, Supabase (read-only), PostHog.
- At most two local sessions on the Mac (simulator builds are heavy); the rest go to cloud sessions.
