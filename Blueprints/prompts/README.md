# Corvus Prompts

This folder holds Corvus product prompts.

## Current Use

Use active prompts only when they match the current route:

```text
SLOPS/
  slops-saloon/
    corvus/
```

## Historical Rename Prompts

Some prompts preserve the pre-rename migration path from `ssffmvp` to the current Corvus route. They are historical run records and should not be re-run without rewriting:

- `codex-docs-commit.md`
- `codex-slops-saloon-rename.md`
- `codex-corvus-restructure.md`
- `codex-git-ssffmvp-clean-tree.md`

If a prompt mentions `ssffmvp`, treat it as historical unless the file explicitly says it has been rewritten for `slops-saloon/corvus`.

## Active Runtime Prompts

- `manager_agent.md`
- `sub_agents.md`

Runtime prompt changes affect product behavior. Read the notes inside each file before editing.
