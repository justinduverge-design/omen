# Omen Design Authority Index

**Status:** Active routing index  
**Date:** 2026-07-15  
**Purpose:** Tell agents which UX/UI files are current authority, which are companions, and which are historical evidence only.

---

## Read order for UX/UI work

For any task touching Omen UX, UI, shared components, visual language, colorways, page hierarchy, motion, or theme strategy, read files in this order:

1. `Blueprints/specs/design/omen-ui-north-star-v1.md`
2. `Blueprints/specs/design/legacy-doc-suppression-banners.md`
3. `Brand/brand-system.md`
4. Relevant implementation spec or route/page file
5. Historical audit/evidence only if the task needs it

The North Star is the current authority for the overhaul. If another design document conflicts with it, the North Star wins unless Justin explicitly says otherwise.

---

## Active authority

| File | Status | Use |
|---|---|---|
| `Blueprints/specs/design/omen-ui-north-star-v1.md` | Active | Current UX/UI overhaul authority: product posture, component governance, visual direction, motion, colorway strategy, and document-status cleanup. |
| `Blueprints/specs/design/legacy-doc-suppression-banners.md` | Active routing support | Exact banner text and suppression status for older UX/UI files until physical banners are applied. |
| `Brand/brand-system.md` | Active companion | Brand identity, voice, positioning, copy anchors, palette, logo usage, and product pillars. |

---

## Partially superseded / reconcile before use

| File | Status | Use |
|---|---|---|
| `Blueprints/specs/design/component-lock-v1.md` | Partially superseded | Useful component-lock thinking. Reconcile typography, implementation assumptions, and current runtime before building from it. |
| `Blueprints/specs/page-system.md` | Partially superseded | Useful route-level history and page evidence. Product posture, overhaul priorities, and component governance now defer to the North Star. |
| `Blueprints/specs/app-ui-plan.md` | Needs reconciliation | Existing UI planning artifact. Do not treat as authority until checked against the North Star. |
| `Blueprints/specs/omen-ux-ui-design-system-v1.md` | Legacy / needs reconciliation | Older design-system source referenced by prior docs. Extract useful token/component detail only after checking the North Star. |

---

## Future-only / not current runtime authority

| File | Status | Use |
|---|---|---|
| `Blueprints/specs/design/team-theme-contract-v1.md` | Future-only | Research/reference for future team skins. Current runtime removed team theming on 2026-07-12, so do not build current UI from this file without a new approval. |

---

## Evidence only

| File | Status | Use |
|---|---|---|
| `Blueprints/audits/2026-07-10-frontend-doctrine-audit.md` | Evidence only | Historical audit evidence. Keep findings, but do not treat stale team-theme conclusions as current build doctrine. |

---

## Agent rule

Do not implement a large UX/UI overhaul from a single old audit, screenshot review, or stale spec. First map the task to the North Star, then identify the smallest buildable PR.

Recommended sequence:

1. Authority cleanup.
2. Primitive completion.
3. Page migration.
4. Visual elevation.
5. Theme/colorway packs.
6. Future team skins.
