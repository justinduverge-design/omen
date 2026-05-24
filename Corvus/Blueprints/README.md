# Corvus Blueprints

This folder contains Corvus-specific blueprints: specs, playbooks, design notes, and product artifacts.

Blueprints are non-code plans, requirements, standards, and guidance for implementation work.

## Subfolder Structure

- `specs/` — Implementation specs and product requirements.
- `playbooks/` — Operational playbooks, runbooks, and incident response guides.
- `design.md` — Product design notes, interaction patterns, and feature scope.

## Naming Conventions

Use kebab-case for file and folder names:

- `omen-mvp-move.md` ✓
- `espn-recovery.md` ✓
- `user_auth_flow.md` ✗ (use kebab-case)

Use ALL_CAPS_SNAKE for index files:

- `PLAYBOOKS_INDEX.md` ✓

## Relationship to Global Blueprints

Global reusable blueprints live at:

```text
SLOPS\Blueprints\
```

Corvus-specific blueprints live here.

For skills (reusable workflows), see:

```text
SLOPS\Blueprints\skills\
slops-saloon\Blueprints\skills\  (if app-specific)
```

For agents (reusable roles), see:

```text
SLOPS\Blueprints\agents\
slops-saloon\Blueprints\agents\  (if app-specific)
```

## Before Adding Files Here

1. Verify the file belongs at the Corvus project level, not the app level.
2. Use the DBS routing rules to select the right folder (specs vs playbooks vs design notes).
3. Use kebab-case for new files and folders.
4. Update this README if you add new subfolder categories.

## Reference

See `SLOPS\DBS_INDEX.md` for the full three-layer DBS navigation map.
