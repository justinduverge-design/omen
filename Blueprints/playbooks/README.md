# Omen Playbooks

Operational procedures for using SLOPS skills against Omen. These files apply Layer 0 workflows to the Layer 2 product without copying or redefining the canonical skills.

## Start Here

1. `omen-company-baseline.md` — required lifecycle for turning Omen work into a reusable company baseline.
2. `skill-activation-runbook.md` — trigger, owner, route, and evidence requirement for every registered SLOPS skill.
3. `skill-usage-ledger.md` — append-only evidence that a skill was used, skipped with reason, or exposed a procedure gap.
4. `post-live-technology-learning.md` — parked until Omen is live plus seven stable days; teaches why the stack exists and creates an in-season improvement backlog.
5. `espn-recovery.md` — provider-specific recovery behavior and security rules.

## Authority

- Skill behavior remains canonical in `../../../../Blueprints/skills/<name>/SKILL.md`.
- Skill status and routing remain canonical in `../../../../Blueprints/skills/SKILL_ROUTING.md`.
- These playbooks decide when Omen invokes those skills and what evidence must be retained.
- If a playbook conflicts with a canonical skill or current `Direction/facts-of-record.md`, the canonical/current source wins and the playbook must be corrected.

## Maintenance

Any skill status, name, or trigger change requires a same-pass review of `skill-activation-runbook.md`. Monthly, compare the usage ledger with `done/LEDGER.md`: repeated skips mean the trigger, skill, or done gate needs correction.
