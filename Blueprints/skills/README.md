# ssffmvp Skills

This folder is reserved for app-specific reusable skills for the ssffmvp product and its services.

## Canonical Skill Location

All SLOPS-authored global skills live under:

```text
C:\Users\JDuve\OneDrive\Desktop\SLOPS\Blueprints\skills
```

See that folder's README and SKILL_ROUTING.md for the authoritative skill lookup, agent routing, and tool permission rules.

## App-Specific Skills

If ssffmvp requires skills not in the global library, they may be created here:

- Keep them scoped to ssffmvp concerns only.
- Global reusable skills belong in `Blueprints\skills`, not here.
- Name them consistently: kebab-case folder names, snake_case for divided categories.
- Each skill should have a `SKILL.md` following the global template.

## Before Creating Skills Here

1. Check `SLOPS\Blueprints\skills\SKILL_ROUTING.md` to confirm the skill doesn't exist globally.
2. Verify that the skill is truly app-specific and not reusable elsewhere.
3. If it becomes reusable, move it to the global library with Justin approval.

## Tool Permissions

All skills inherit the tool permission rules from:

```text
SLOPS\Blueprints\tools\tool-permissions.md
```

Agent tool tier caps are defined in:

```text
SLOPS\Blueprints\agents\AGENT_INDEX.md
```
