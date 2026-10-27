@AGENTS.md

## Claude Code only

- Project settings (`.claude/settings.json`) carry the allowlist and hooks; the hooks block raw
  `gh pr merge`, pushes to `main` and `--no-verify`. Don't work around a block: say what it stopped.
- Commands: `/plan-task`, `/review` (fresh-agent reviewer, `.claude/agents/reviewer.md`), `/closeout`.
- MCP for this project is in `.mcp.json`: recall, Supabase, PostHog. Designs come from any of our tools (Claude, ChatGPT, Codex, Gemini); no Figma. Supabase is read-only here.
- At most two local sessions on the Mac at once (simulator builds are heavy). Anything else goes to a
  cloud session with its own worktree.
