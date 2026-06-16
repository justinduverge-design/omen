# Corvus Agent Inbox

**Override slot for the build loop. The sprint feeds tasks automatically; use this only to pin one.**

How it works now:
- Leave the Active Task **empty** → each agent auto-pulls the **top unchecked item in its own lane**
  from `Direction/current_sprint.md` → "Next" (Codex = `### Backend / Codex`, Claude = `### Frontend / Claude`).
- Fill the Active Task → that **pinned** task wins, overriding the sprint. Use it for a one-off,
  a custom task, or to jump the queue.

Operator steps: `Blueprints/prompts/HOW-TO-RUN-THE-LOOP.md`.

---

## Active Task

- **Status:** empty  (agents auto-pull from current_sprint "Next")
- **Lane:** —
- **Task:** —
- **Source:** —
- **Done when:** —

> To pin a task: set Status to `ready`, choose a Lane (Backend / Codex or Frontend / Claude),
> and write the Task in plain English. Everything else is optional — the agent will restate it
> and confirm before building, and Done-when defaults to `Blueprints/definition-of-done.md`.

---

## Auto-Populated Top 5

1. **Phase 1.5 — Team accent sweep (whole-app, both modes).** Ready now that Phase 1.4 is closed. Guardrail: `ui-ux-pro-max` accent-contrast library; verdict: `slops-ui-ux-audit`. Done docs: page + design.
2. **Phase 1.6 — Position chip palette + selected-state styling.** Ready now that Phase 1.4 is closed. Guardrail: `ui-ux-pro-max` palette + color-blind validation; verdict: `slops-ui-ux-audit`. Done docs: page + design + recommendation if recommendation cards change.
3. **Phase 1.7 — Platform brand color emphasis + button-style consistency.** Ready now that Phase 1.4 is closed. Guardrail: `ui-ux-pro-max`; verdict: `slops-ui-ux-audit`. Done docs: page + design.
4. **Phase 1.8 — Confidence gradient endpoints.** Ready now that Phase 1.4 is closed. Guardrail: `ui-ux-pro-max` gradient interpolation; verdict: `slops-ui-ux-audit`. Done docs: design + recommendation.
5. **Phase 1.9 — Metallic tier treatment.** Ready now that Phase 1.4 is closed. Guardrail: `ui-ux-pro-max` metallic contrast; verdict: `slops-ui-ux-audit`. Done docs: design + recommendation if Draft Assistant cards change.

---

## Standing Route

```text
SLOPS/
  slops-saloon/
    corvus/
```

## Active Notes

- This repo is the Corvus product repo. The old nested `Corvus/` folder is retired.
- Product handoffs live in `Blueprints/handoffs/`.
- Product context lives in `Direction/`.
- Division context lives one layer up in `..\`. OS context lives two layers up in `..\..`.

## Do Not Touch Unless Explicitly Asked

- `AGENT.md`, `CLAUDE.md`
- `.env`, secrets, or credentials
- Deploy config
- Package files
- SQL or migrations
- Production infrastructure
