# M1 Native Reference Library v1

**Status:** Approved reference policy  
**Date:** 2026-07-20  
**Owner:** Native mobile foundation  
**Applies to:** M1-P primitives, Figma wireframes, SwiftUI, and Jetpack Compose  
**Purpose:** Define which sources may guide native implementation and exactly what they are allowed to influence.

## 1. Authority order

1. Approved Omen product decisions and `omen-mobile-visual-briefs-v1.md`.
2. Omen Brand System, Native Mobile Foundation, Native Design-System Registry, and M0c app-shell/auth/API contract.
3. Approved Omen Figma nodes.
4. Apple/Android platform guidance and accessibility standards.
5. ESPN, Yahoo, and Sleeper observation references.

A lower source never overrides a higher one. Existing web documents may inform shared token vocabulary and terminology only; they cannot override native navigation, native component behavior, or approved mobile visual briefs.

## 2. Approved implementation references

| Source | Allowed influence | Explicitly excluded |
|---|---|---|
| [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines) | iPhone-native controls, hierarchy, Dynamic Type, VoiceOver, safe-area and navigation behavior. | Omen identity or Android behavior. |
| [Apple tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars) | Four top-level destinations and iPhone tab behavior. | Reintroducing permanent Draft tab or Account tab. |
| [Apple sheets](https://developer.apple.com/design/human-interface-guidelines/sheets) and [action sheets](https://developer.apple.com/design/human-interface-guidelines/action-sheets) | iPhone selector, confirmation, and focused-task presentation. | Custom modal patterns that fight iOS. |
| [Material 3 components](https://m3.material.io/components), [navigation bars](https://m3.material.io/components/navigation-bar/guidelines), [bottom sheets](https://m3.material.io/components/bottom-sheets/guidelines), [lists](https://m3.material.io/components/lists/overview), [buttons](https://m3.material.io/components/buttons/guidelines) | Android-native navigation, lists, actions, and sheets. | Material palette/copy as Omen identity or iPhone imitation. |
| [Compose accessibility](https://developer.android.com/develop/ui/compose/accessibility), [API defaults](https://developer.android.com/develop/ui/compose/accessibility/api-defaults), [accessibility testing](https://developer.android.com/develop/ui/compose/accessibility/testing) | Semantics, TalkBack, 48dp targets, text scaling, and accessibility tests. | Post-build-only accessibility. |
| [WCAG 2.2 focus appearance](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html), [non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html), [contrast minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum), [focus order](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html) | Focus, non-color state, contrast, and logical accessibility order acceptance. | Decorative outlines or color-only state treatment. |

## 3. Fantasy-product observation policy

| Product | Allowed observation | Never copy |
|---|---|---|
| ESPN Fantasy | weekly urgency and matchup storytelling | layout, colors, typography, copy, icons, assets, or branded patterns |
| Yahoo Fantasy | standings/league administration clarity | same |
| Sleeper | player scanning and action-forward information density | same |

Observation references are annotated learning material only. They never become a design-system source, a component template, or approval to reproduce a competitor screen.

## 4. Agent citation rule

Every native Figma/component PR cites:

- the applicable Omen contract/brief;
- one relevant platform or accessibility source when behavior is platform-specific;
- exact Figma node(s);
- any observation source only as a named behavior insight, never as a copied visual reference.

No agent may add a visual pattern based only on external research.

## 5. Resource-alignment addendum

For practical alignment with official Apple and Google/Material production and design resources — Apple Design Resources, iOS & iPadOS UI Kit, SF Symbols, Icon Composer, Apple App Icon Template, Product Bezels, Material 3 in Compose, Material 3 Adaptive, Material Symbols, Android adaptive icon guidance, and Compose design systems guidance — see `m1-native-resource-alignment-addendum-v1.md`. That addendum sits below every source in §1's authority order and does not modify this document's authority order, approved implementation references, or observation policy. Agents must cite it before selecting real icons, app icons, store screenshots, product bezels, or any production mobile visual asset.
