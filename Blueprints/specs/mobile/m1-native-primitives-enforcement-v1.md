# M1-P Native Primitives & Component Enforcement v1

**Status:** Planned P0 build program  
**Date:** 2026-07-20  
**Owner:** Native mobile foundation  
**Applies to:** SwiftUI iPhone and Kotlin/Jetpack Compose Android  
**Companions:** `omen-native-design-system-registry-v1.md`, `omen-native-mobile-foundation-v1.md`, `omen-mobile-visual-briefs-v1.md`, `native-mobile-design-delivery-workflow-v1.md`

## Purpose

Make native screen delivery trustworthy. A feature agent must compose approved shared primitives, not recreate visual patterns inside a page.

This program is a gate for new M4 feature-screen construction. It does not retroactively claim that the M2/M3 demo shells are full design-system implementations.

## Delivery sequence

### P1 — Reconcile authority

Before component code:

- Align the registry navigation wording with approved M0c: Command Center, Omen, Trade, League; Draft seasonal; Account behind profile.
- Align Figma/capability status wording with current completed M1-F/M2-F boards.
- Confirm the capability canvas is active operating authority or explicitly revise its status.
- Record one reading order for every native task.

### P2 — Shared foundation primitives

Build only in iOS `DesignSystem` and Android `core:designsystem` modules:

- Button and IconButton
- TextField, FormField, Picker/Select
- Card/Surface and ListRow
- Badge/Chip and PlatformBadge
- Modal/Sheet and ConfirmationDialog
- Six distinct State Surfaces: Empty, Loading, Error, Disconnected, Stale, Mock

Every primitive needs the registry-approved variants, semantic tokens, accessibility behavior, and tests/previews.

### P3 — First Omen compositions

Before feature pages, build:

- PlayerRow / compact player presentation
- DecisionBrief shell
- PlatformConnectionCard
- ConnectionStatusBadge
- MetricStrip, ConfidenceBar, RiskPanel, and SignalList

Context Strip, Matchup Spine, and Evidence Disclosure are required by the approved visual briefs but are new compositions. They must first be proposed/approved on Figma `03 — Components` and added to the registry before implementation.

### P4 — Gallery and enforcement

Create an internal iOS/Android component gallery showing every variant/state, long-content behavior, dark/light/system appearance, selection/focus, reduced motion, and text scaling.

Enforce these rules:

- Feature modules import shared primitives/compositions; no feature-local Button, Card, PlayerRow, or state-surface clones.
- Feature modules use semantic tokens and approved type roles; no raw visual colors or retired fonts.
- New composition requires Figma proposal + registry entry + founder approval before production use.
- A component is not “done” without iPhone and Android visual/accessibility proof.

## Required evidence

For each P2/P3 PR:

1. Contract and Figma node links.
2. Unit/component tests plus platform preview/gallery capture.
3. iPhone and Android screenshots for primary and alternate state.
4. Dynamic Type/font-scale, TalkBack/VoiceOver, focus/selection, contrast, touch-target, and reduced-motion results.
5. Honest deviations/limitations and skill receipt.
6. Design steward review; founder approval for a new token, component, or visual pattern.

## Definition of done

M1-P is complete only when shared primitives and first Omen compositions are available in both native modules, the gallery has founder approval, feature-local duplication is prevented by review/enforcement, and a first Command Center screen can be assembled entirely from approved shared pieces.

No M4 feature screen may introduce a new visual primitive while M1-P is incomplete.
