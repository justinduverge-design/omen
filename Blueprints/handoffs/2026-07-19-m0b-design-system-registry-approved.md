# Handoff — M0b Native Design-System Registry Approved

**Date:** 2026-07-19
**Branch:** `docs/m0b-native-design-system-registry`
**Agent:** Claude (frontend/spec lane)
**Nature:** Docs/planning/evidence only. No app code, native project, deploy, secret, schema, Figma permission, or provider behavior changed.

## What happened

After M0a approval (PR #148 merged), built and got approval for **M0b** — the native design-system registry — as the reviewable contract that unblocks M1.

## Deliverable

`Blueprints/specs/mobile/omen-native-design-system-registry-v1.md` (**Approved**). Covers:
- 6-layer token model with concrete dark/light hex values **verified against live `frontend/src/index.css`** (caught 4 stale light-mode values in `omen-ux-ui-design-system-v1.md`).
- Data-semantic invariant layer (risk/confidence/data-source/position/platform/demo) — never theme-overridden.
- Alegreya type scale + spacing scale; cross-platform token expression rule (Markdown + SwiftUI + Compose).
- Foundation-component + Omen-composition registry, each mapped to its iOS (SwiftUI) and Android (Compose) native control.
- Accessibility rules: AA contrast, 44pt/48dp, Dynamic Type/font scale, VoiceOver/TalkBack, **non-color focus/selection**, reduce-motion.
- Theme-pack bounds (Core dark/light shipped; others architected; team skins future).
- iOS Liquid-Glass-at-edges-only + Android Material-3 platform rules.

## Decisions locked (Justin, 2026-07-19)

- `focus-ring` = semantic token with a **non-color** requirement (visible outline + native focus/selection, never brass-alone). Added in M1.
- Font stack: **Alegreya Sans (UI/headings/controls) / Alegreya (reading) / DM Mono (numeric)**; hierarchy preserved through accessibility fallback; Cinzel/Inter not revived.
- No team-color tokens in the phone MVP; semantic meaning fixed (brass=attention, verdigris=ready/healthy, crimson=risk/recovery); team skins are a future layer.
- M0b = inventory + rules; M1 = build briefs.

## Files changed

- `Blueprints/specs/mobile/omen-native-design-system-registry-v1.md` (new, Approved).
- `Direction/current_sprint.md` — M0b ✅; M1 references the registry + first tasks.
- `Direction/agent_inbox.md` — M0c is current next task; M1 after.
- `Direction/decision_log.md` — M0b decisions.
- `Blueprints/playbooks/skill-usage-ledger.md` — skill receipt.

## Next steps

1. **Push + PR** for `docs/m0b-native-design-system-registry` — awaiting Justin's go.
2. **M0c** — native app-shell/auth/API contract (owns the deferred auth spec); recommend pinning **F2** alongside it.
3. **M1** — SwiftUI/Compose foundation-component build briefs from the registry; first: semantic `focus-ring` (non-color) + lock Alegreya stack.

## Do-not-treat-as-live

Local branch only until pushed/merged. The Figma Design House remains a stub (`00 — Start Here`); Markdown is source of truth.
