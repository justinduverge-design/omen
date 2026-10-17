# Omen Playbooks

Operational procedures for using SLOPS skills against Omen. These files apply Layer 0 workflows to the Layer 2 product without copying or redefining the canonical skills.

## Start Here

1. `omen-company-baseline.md` — required lifecycle for turning Omen work into a reusable company baseline.
2. `skill-activation-runbook.md` — trigger, owner, route, and evidence requirement for every registered SLOPS skill.
3. `skill-usage-log.md`: one line per task with the skills used or skipped, and why. (`skill-usage-ledger.md` is the older ledger, kept as history. Do not append to it.)
4. `post-live-technology-learning.md` — parked until Omen is live plus seven stable days; teaches why the stack exists and creates an in-season improvement backlog.
5. `espn-recovery.md` — provider-specific recovery behavior and security rules.
6. `app-store-reviewer-access.md` — how an Apple/Google reviewer reaches a populated demo state without a real platform connection.
7. `rollback-runbook.md` and `first-app-review-submission-runbook.md`: release safety and the first App Store submission.
8. `native-mobile-design-delivery-workflow-v1.md`: how a native screen goes from approved design to code.
9. `football-data-staging-shadow-runbook.md` and `warehouse-projection-analysis-session-v1.md`: football data and warehouse work.
10. `pi-kernel-update-runbook.md`: updating the Raspberry Pi fleet.

## Authority

- Skill behavior remains canonical in `../../../../Blueprints/skills/<name>/SKILL.md`.
- Skill status and routing remain canonical in `../../../../Blueprints/skills/SKILL_ROUTING.md`.
- These playbooks decide when Omen invokes those skills and what evidence must be retained.
- If a playbook conflicts with a canonical skill or current `Direction/facts-of-record.md`, the canonical/current source wins and the playbook must be corrected.

## Maintenance

Any skill status, name, or trigger change requires a same-pass review of `skill-activation-runbook.md`. Repeated skips in `skill-usage-log.md` mean the trigger, skill or done gate needs correcting.
