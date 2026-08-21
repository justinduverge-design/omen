# Omen Prompts

This folder holds Omen product prompts.

## Current Use

Use active prompts only when they match the current route:

```text
SLOPS/
  slops-saloon/
    corvus/
```

## Active Build Loop Prompts

Use these prompts to start new Omen work without re-explaining the whole repo:

- `HOW-TO-RUN-THE-LOOP.md` - operator guide for loading one task, choosing the right lane, and closing the loop.
- `kickoff.md` - the single local Omen starter for any runtime. Layer- and
  capability-named, not vendor-named: it confirms the session's actual capabilities and
  reads Runtime Policy and Active Trust Assignments before applying any authority.
  Supersedes the retired `kickoff-backend-codex.md` / `kickoff-frontend-claude.md` pair,
  archived under `Archive/authority-routing/`.

Any change to a prompt in this folder must be recorded in `PROMPTS_CHANGELOG.md`.
`prompt_playbook.md` is superseded by the kickoff files above and remains only as
historical context.

## Historical Rename Prompts

Some prompts preserve the pre-rename migration path from `ssffmvp` to the current Omen route. They are historical run records and should not be re-run without rewriting:

- `codex-docs-commit.md`
- `codex-slops-saloon-rename.md`
- `codex-corvus-restructure.md`
- `codex-git-ssffmvp-clean-tree.md`

If a prompt mentions `ssffmvp`, treat it as historical unless the file explicitly says it has been rewritten for `slops-saloon/corvus`.

## Active Runtime Prompts

- `manager_agent.md`
- `sub_agents.md`

Runtime prompt changes affect product behavior. Read the notes inside each file before editing.
