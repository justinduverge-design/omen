# Legacy UX/UI Doc Suppression Banners

**Status:** Active routing support  
**Date:** 2026-07-15  
**Companion:** `Blueprints/specs/design/omen-ui-north-star-v1.md`  
**Purpose:** Provide exact banner text for older UX/UI files so agents do not treat stale-but-polished documents as current build authority.

---

## How to use this file

Until the physical banners are applied to each legacy document, this file is the suppression map. Agents must treat the statuses below as authoritative when reading old UX/UI docs.

The phrase **suppressed as current authority** does not mean the file is bad or deleted. It means the file is no longer allowed to override the North Star.

---

## Banner A — partially superseded implementation companion

Use for:

- `Blueprints/specs/design/component-lock-v1.md`
- `Blueprints/specs/page-system.md`

```md
> **Status: Partially superseded by `Blueprints/specs/design/omen-ui-north-star-v1.md`.**
>
> This file still contains useful implementation detail and historical route/component evidence, but it is not the current UX/UI authority. Product posture, visual direction, component governance, typography, motion, colorway strategy, and page-overhaul priority defer to the North Star. If this file conflicts with the North Star, the North Star wins.
```

### Why

These files contain valuable work, but they also carry assumptions from earlier phases. `component-lock-v1.md` is especially useful for primitive scope, but its typography and implementation assumptions must be reconciled before code work. `page-system.md` is useful route history, but it should not override the new owner/GM command-center direction.

---

## Banner B — future-only theming research

Use for:

- `Blueprints/specs/design/team-theme-contract-v1.md`

```md
> **Status: Future-only reference. Suppressed as current runtime authority by `Blueprints/specs/design/omen-ui-north-star-v1.md`.**
>
> This file is retained for future team-skin/colorway research. Do not use it to implement current UI behavior unless Justin explicitly approves a new theming phase. Current runtime removed team-based theming, cultural-moment chrome, motifs, and type flourishes on 2026-07-12.
```

### Why

The file is detailed and valuable, but it no longer matches current runtime. Treat it as research for future colorway/team-skin architecture, not as an instruction to rebuild Team mode now.

---

## Banner C — evidence only

Use for:

- `Blueprints/audits/2026-07-10-frontend-doctrine-audit.md`

```md
> **Status: Evidence only. Suppressed as current design doctrine by `Blueprints/specs/design/omen-ui-north-star-v1.md`.**
>
> This audit remains useful evidence about historical drift and visual failure modes. Do not treat its recommendations as current build authority unless the North Star confirms them. In particular, team-theme conclusions may be stale after the 2026-07-12 runtime removal of Team mode.
```

### Why

Audits are evidence, not doctrine. This one diagnosed real problems, but some recommendations were overtaken by later runtime decisions.

---

## Banner D — needs reconciliation

Use for:

- `Blueprints/specs/app-ui-plan.md`
- `Blueprints/specs/omen-ux-ui-design-system-v1.md`

```md
> **Status: Needs reconciliation. Suppressed as current UX/UI authority by `Blueprints/specs/design/omen-ui-north-star-v1.md`.**
>
> This file may contain useful historical planning or token detail, but it is not the current overhaul authority. Before using it for implementation, reconcile it against the North Star and the current frontend runtime.
```

### Why

Both files contain strong older direction, but they are not clean enough to drive new implementation without comparison against the North Star.

---

## Files that remain active and are not suppressed

- `Brand/brand-system.md` — active brand companion.
- `Blueprints/specs/design/omen-ui-north-star-v1.md` — active UX/UI overhaul authority.
- `Blueprints/specs/design/README.md` — active design read-order and authority index.
- `Blueprints/backlog/ui-component-system.md` — active backlog for small buildable component PRs.

---

## Rule for Claude Code, Codex, Jules, Gemini, or any other coding agent

If an older UX/UI file conflicts with the North Star, do not average the two. Do not pick the more detailed one. Do not pick the newer-looking one. Use the North Star, then cite the older file only as supporting evidence if it still agrees.
