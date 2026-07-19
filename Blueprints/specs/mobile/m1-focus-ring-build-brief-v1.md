# M1 Focus-Ring Build Brief v1

**Status:** Build input — approved scope, implementation not started
**Date:** 2026-07-19
**Owner:** Native design-system foundation
**Scope:** Shared semantic focus and selection contract for the future SwiftUI and Jetpack Compose design systems.
**Contract sources:** `omen-native-design-system-registry-v1.md` §§2.2, 4, 7; `omen-native-mobile-foundation-v1.md` §§4, 10, 10a; `omen-native-design-house-v1.md` §8.

## 1. Job and boundary

Make keyboard, switch-control, accessibility-focus, and selected states visible and understandable in both native apps without depending on brass or any other color alone.

This brief is a build input for M1. It does not create an iOS or Android project, change web CSS, add a feature screen, alter Figma, or change any API/auth/provider behavior.

## 2. Locked contract

- Define `focus-ring` as a **core semantic token**, not a team, campaign, or component-local color.
- Provide a visible outline in Core Omen dark and Core Omen light/system modes. Its final value must meet the M1 implementation's documented AA-visible contrast check against the surface it outlines.
- Focus is not color-only: every focusable control also exposes the appropriate platform focus or accessibility-focus behavior.
- Selection is not color-only: selected controls add a shape, weight, checkmark, or equivalent native selected-state cue.
- Do not use a team color, raw screen-level hex, a local shadow token, or brass-alone focus indication.
- Keep data-semantic status roles unchanged. Focus is not a success, risk, platform, or demo signal.

## 3. Token and API shape

The following names are the planned implementation interface. Exact file/module names are set when M2 creates the native projects.

| Concern | iOS SwiftUI target | Android Compose target | Rule |
|---|---|---|---|
| Semantic token | `OmenColor.focusRing` | `OmenTheme.color.focusRing` | Reads the Core theme; never declared inside a feature. |
| Outline treatment | `OmenFocusRing` view modifier | `Modifier.omenFocusRing(...)` | Adds a visible outline without changing layout size. |
| Focus state source | native focus/accessibility state, including `@FocusState` where applicable | `InteractionSource` / native focus state | Do not synthesize a separate app-level focus model. |
| Selected-state cue | native selected trait plus shape/weight/checkmark as appropriate | `selected` semantics plus shape/weight/checkmark as appropriate | Retain the cue with high contrast and reduced color perception. |

The token remains theme-aware. It may derive from the approved accent family only if the resolved dark and light values pass the required visibility check; the public name and semantic purpose remain `focus-ring`.

## 4. Required component coverage

M1 applies the shared treatment to the first foundation controls that can receive input or selection:

- Button and IconButton;
- TextField, SecureField, Textarea-equivalent, and Picker/Select;
- SegmentedControl, TabNav, and RadioCardGroup;
- interactive Chip, ListRow, Stepper, and confirmation actions;
- modal/sheet controls when they accept focus.

Card, Alert, Badge, display-only Chip, Meter, and passive state surfaces do not draw a focus ring unless they are made interactive by their component contract.

## 5. Platform behavior

### iOS

- Use SwiftUI's native focus and accessibility behavior first; a custom outline supplements it rather than replacing it.
- Preserve VoiceOver focus order and announce selected, disabled, and loading states through native semantics.
- The outline must remain visible with Increase Contrast and must not depend on Liquid Glass translucency. System-chrome material falls back safely under Reduce Transparency.
- Touch targets remain at least 44pt.

### Android

- Use Material 3 focus, press, and selected semantics first; a custom outline supplements them rather than replacing them.
- Preserve TalkBack labels, role, selected, disabled, and loading announcements.
- State layers and the outline must remain distinguishable when system dynamic color is not adopted.
- Touch targets remain at least 48dp.

## 6. Acceptance evidence for the later implementation PR

1. Token definitions exist once per native design system and are consumed by a representative control set without raw color literals.
2. Dark and light/system screenshots show focused Button, TextField, SegmentedControl, and selectable Card/row states on a compact and a large phone.
3. A focused state remains obvious when the token color is viewed without relying on hue; selected states show a non-color cue.
4. VoiceOver and TalkBack checks record the label, role, focus order, and selected/disabled/loading announcement for the representative controls.
5. Dynamic Type/font scale, Android font scale, Reduce Motion, and iOS Reduce Transparency checks reveal no clipping, lost outline, or inaccessible state.
6. iOS and Android satisfy the same semantic contract while retaining native control behavior; pixel parity is not required.

## 7. Explicit exclusions and dependencies

- **No native project scaffolding:** M2 owns project creation and module paths.
- **No feature screen:** M3 and later consume this foundation.
- **No Figma edit:** the Design House currently has only `00 — Start Here`; Markdown remains the approved working source until the token/component pages are populated.
- **No provider/auth/API work:** M0-BE and F2 own connection-state truth.
- **Dependency:** apply this brief alongside `m1-native-typography-build-brief-v1.md`; both are required before M1 component implementation starts.

## 8. Definition of ready

This brief is ready when a SwiftUI implementer and a Compose implementer can add the same semantic focus contract, prove it with the listed evidence, and do so without inventing a new token, component variant, or provider state.
