# M1 Native Resource Alignment Addendum v1

**Status:** Approved addendum to `m1-native-reference-library-v1.md`
**Date:** 2026-07-22
**Owner:** Native mobile foundation
**Applies to:** M1-P primitives, M1-P P3 and M4 feature screens, native iOS (SwiftUI) and Android (Compose) implementations, app icon and store asset production
**Purpose:** Align future native work with official Apple and Google/Material production and design resources without displacing Omen's approved design authority.

## 1. Scope and intent

This addendum is **practical/resource-alignment guidance only**. It does not introduce a new visual direction, brand, IA, navigation model, or component contract. It names the official platform resources agents may consult when they need to pick real iconography, produce app icons, prepare product mockups, or generate platform-native asset exports.

If any guidance below appears to conflict with Omen's approved product decisions, brand system, native foundation, registry, approved Figma nodes (file `mWjrAKPi4JSIP5lAmGAtB3`), or the M0c app-shell/auth/API contract, Omen's authority wins. This addendum sits under those in the authority order defined by `m1-native-reference-library-v1.md` §1.

## 2. Authority reaffirmation

The following remain higher authority than any resource listed here:

- Omen product decisions and `omen-mobile-visual-briefs-v1.md`.
- `Brand/brand-system.md`, `omen-native-mobile-foundation-v1.md`, `omen-native-design-system-registry-v1.md`, and the M0c app-shell/auth/API contract.
- Approved Omen Figma nodes and the M1 Figma screen contract (`m1-figma-screen-contract-pass-v1.md`).
- Approved component contracts (Button, Input, Segmented, Card shell, Type scale, Spacing) and semantic tokens, typography hierarchy, product IA, and recommendation-first layout.
- Platform-specific security/auth contracts.

Nothing in this addendum authorizes overriding any of the above.

## 3. Approved Apple resources (iOS-native alignment)

| Resource | Allowed influence | Explicitly excluded |
|---|---|---|
| [Apple Design Resources](https://developer.apple.com/design/resources/) | Sourcing official Apple system UI kits, templates, and reference files when producing iOS-native Figma frames or exported assets. | Substituting Apple system palettes, type, or component identities for Omen brand tokens or approved component contracts. |
| [iOS & iPadOS UI Kit for Figma](https://developer.apple.com/design/resources/#ios-apps) | Modeling native controls, status bar, navigation bar, tab bar, safe-area, and system chrome accurately inside Omen Figma mockups. | Copying Apple sample layouts as Omen screens or replacing approved Figma nodes. |
| [Apple App Icon Template](https://developer.apple.com/design/resources/#macos-apps) | Producing correctly sized/masked iOS app icons and marketing icons. | Choosing new icon marks or altering Omen brand identity. |
| [SF Symbols](https://developer.apple.com/sf-symbols/) | Selecting iOS-native system iconography for controls, tab items, and toolbar affordances that already exist in approved specs. | Introducing icons not present in approved specs, or using SF Symbols on Android. |
| [Icon Composer](https://developer.apple.com/icon-composer/) | Producing layered/tinted app icon variants (light/dark/tinted) per Apple's current icon production pipeline. | Redesigning the app icon or brand mark. |
| [Product Bezels](https://developer.apple.com/design/resources/#product-bezels) | Wrapping approved screens for marketing, App Store, and internal review mockups. | Modifying the underlying approved screens or using competitor device frames. |

Allowed use areas: iOS-native UI resource usage, SF Symbols selection, app icon production, product bezels, system chrome rendering, and asset export.

## 4. Approved Google / Material resources (Android-native alignment)

| Resource | Allowed influence | Explicitly excluded |
|---|---|---|
| [Material 3 in Compose](https://developer.android.com/develop/ui/compose/designsystems/material3) | Behavior of Material 3 components used inside Compose (states, motion, elevation, touch targets) where behavior is not already fixed by an Omen contract. | Adopting Material palette, type ramp, or shape system as Omen identity. |
| [Material 3 Adaptive](https://developer.android.com/develop/ui/compose/layouts/adaptive) | Adaptive layout behavior across phone/foldable/tablet window size classes for Android surfaces we ship. | Altering Omen IA, navigation model, or recommendation-first layout ordering. |
| [Material Symbols / Google Font Icons](https://fonts.google.com/icons) | Selecting Android-native system iconography that maps to approved control/affordance specs. | Introducing icons not present in approved specs, or using Material Symbols on iOS. |
| [Android adaptive icon guidance](https://developer.android.com/develop/ui/views/launch/icon_design_adaptive) | Producing correctly masked foreground/background/monochrome layers for the Android launcher icon. | Redesigning the app icon or brand mark. |
| [Compose design systems guidance](https://developer.android.com/develop/ui/compose/designsystems) | Structuring the Compose theme wrapper so Omen semantic tokens drive Material components rather than the reverse. | Exposing Material tokens as Omen tokens or bypassing the registry. |

Allowed use areas: Android-native Material Symbols usage, adaptive icons, Compose Material 3 component behavior, adaptive layout behavior, and Android asset export.

## 5. What these resources cannot do

These resources **cannot** override:

- Omen brand identity, color, or expressive system.
- Omen semantic tokens or the Native Design-System Registry.
- Typography hierarchy or the M1 native typography build brief.
- Product IA, navigation model, or recommendation-first layout.
- Approved component contracts and their APIs.
- Platform-specific security/auth contracts (M0c app-shell/auth/API contract, onboarding connection contract).
- Approved Figma nodes in file `mWjrAKPi4JSIP5lAmGAtB3`.

If a resource's default would conflict with any of the above, Omen wins and the resource is used only where its default is silent.

## 6. Competitor references

Competitor references (ESPN, Yahoo, Sleeper — per `m1-native-reference-library-v1.md` §3) remain **observation-only**. Nothing in this addendum permits copying competitor layouts, assets, copy, iconography, device frames, or component templates. Competitor screens are never a substitute for Apple/Google official resources.

## 7. Agent citation rule (extends reference-library §4)

Before choosing a real icon, an app icon, a store screenshot frame, a device bezel, or any production mobile visual asset, an agent must:

1. Cite the applicable Omen contract, brief, or approved Figma node.
2. Cite the specific resource from §3 or §4 that authorizes the choice.
3. Confirm the choice does not override any item in §5.

**M1-P P3 and M4 feature screens must not use arbitrary iconography or asset-production assumptions outside this addendum.** If a needed asset class is not covered here, flag the gap and stop — do not improvise from external research or competitor material.

## 8. Change control

This addendum extends `m1-native-reference-library-v1.md` and does not modify its authority order, its approved implementation references table, or its observation policy. Changes to product direction, navigation, tokens, typography, Figma nodes, or component approval status are out of scope for this document.
