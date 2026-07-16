# Handoff — 2026-07-16 — Master Design System Blueprint v1 (Phase 1, doc-only)

**Session:** Claude (Creative Director pass), directed by Justin
**Branch:** `claude/omen-design-system-svdaom`
**Type:** Spec/doc deliverable — no code, no assets, no font imports touched

## What happened

Justin halted all Remotion/video rendering work: the asset foundations (shield emblem, favicon, cursor, backgrounds, typography) read as amateur, flat, and disjointed. This session delivered Phase 1 of the rebuild — the **Master Design System Blueprint** — as a spec, not code.

## Files changed

- **NEW** `Blueprints/specs/design/omen-master-design-blueprint-v1.md` — the deliverable. Status: **Proposed** (becomes Active companion to the North Star on Justin's approval). Covers:
  - §1 Iconography: vector-first mandate (the emblem currently has **no SVG source**), 1024-unit construction grid, scripted optical-centering math (silhouette centroid at 50%/48.5% of the squircle, ±0.4%), lace/wing geometric rules keyed to a base detail unit `L`, one-light internal depth model (brass rim ramp from existing tokens, vector bevel, ≤3% grain at ≥256px only), 3-tier size cut matrix.
  - §2 Typography: **new stack proposed** — Archivo / Inter / JetBrains Mono / Fraunces(rationed) — superseding Alegreya *upon ratification*; full scale tables for app + both video aspect ratios; caption collision system (safe-area maps, caption plates ≥7:1, fixed z-contract); loading guardrails (Remotion font assertion at frame 0; `assertFontImportBaseline()` amended to whitelist form only in the same PR as the swap).
  - §3 Environment engine: five tokenized layers (base / radial light / depth grid / grain / vignette), three presets (`console`/`ritual`/`broadcast`), motion rationing per North Star §6, and a shared `Brand/tokens/omen-tokens.json` contract to kill the Remotion `COLORS` drift.
  - §4 Cursor ("the Sight"): shield-apex-derived pointer, CSS-only state swaps, hotspot spec, video path choreography replacing the CSS-triangle `MouseCursor`. Scope: video + marketing surfaces only.
  - §5 Pipeline: stages 0–7 with QA gates G0–G9; **no Remotion work resumes until gates are green.**
  - §6 Reconciliation register; §7 plain-English summary.
- `Blueprints/specs/design/README.md` — blueprint added to the read order and a new "Proposed — pending Justin approval" section.
- `Direction/decision_log.md` — dated entry (video halt; proposed type supersession; cursor scope; zero new hues; token JSON contract).
- `Blueprints/playbooks/skill-usage-ledger.md` — row appended.

## Decisions captured from Justin (via AskUserQuestion this session)

1. **Typography: propose a new pairing** (not keep-Alegreya-and-fix-execution, not video-only display face). Marked PROPOSED everywhere — brand-system §8 and the CI font gate change only after ratification, in the implementation PR.
2. **Cursor scope: video + marketing surfaces** (recommended option) — tool routes and all form fields keep native cursors.

## What the next session should know

- **Nothing is ratified yet.** The blueprint is Proposed. First action item is Justin's review; on approval, flip its status line, apply the §6 reconciliation edits (brand-system §8 rewrite, decision-log ratification note), and open pipeline Stage 0.
- **Build order is dependency order:** tokens JSON → SVG masters (`Brand/masters/`, new dir) → export script → distribution/favicon re-wiring (48/64 exports are currently orphaned in `frontend/public/`) → typography PR (with gate amendment) → environment tokens → cursor → only then Remotion.
- **Do not** stack new fonts, assets, or Remotion edits before their pipeline stage — the whole point of the halt is to stop improvising assets.
- Known repo facts this rests on: emblem is raster-only in `logos/`; Remotion project (`Brand/promos/omen-coming-soon/`) loads no fonts and duplicates color constants; app background is flat `--color-bg`; no cursor exists in the app today.
