# Omen Native Design House v1

**Status:** Proposed active authority for native mobile design  
**Date:** 2026-07-19  
**Scope:** All iPhone and Android screens, native components, themes, motion, visual review, and cross-platform design parity.  
**Companion to:** `omen-native-mobile-foundation-v1.md` and `omen-mobile-onboarding-connection-contract-v1.md`.

## 1. One design house, two native expressions

Omen is one product with one identity. It must not become a web app on iPhone, a different app on Android, or a collage of competitor UI.

The shared Omen design house controls:
- product hierarchy;
- copy and decision posture;
- color/token meaning;
- component intent;
- state honesty;
- information density;
- motion restraint;
- accessibility and quality bar.

Each platform controls its own native expression:
- **iPhone:** SwiftUI, Apple Human Interface Guidelines, Apple navigation, sheets, controls, typography behavior, and accessibility.
- **Android:** Kotlin + Jetpack Compose, Material 3, Android navigation/back behavior, dynamic/adaptive layout conventions, and accessibility.

Same house does not mean same pixels. It means the same product feels deliberately native on each phone.

## 2. The Omen blend

| Reference | Omen borrows | Omen refuses |
|---|---|---|
| Apple | calm hierarchy, native clarity, tactile restraint, focused flows | sterile default-app sameness, decoration without purpose |
| Google / Material | adaptive layouts, clear stateful controls, efficient navigation, Android-native feedback | generic Material template appearance or uncontrolled dynamic-color drift |
| Meta | quick account entry, forgiving recovery, familiar account management | social feed mechanics, engagement traps, surveillance vibe |
| ESPN Fantasy | “this week matters” urgency, recovery prompts, action near insight | broadcast clutter, media overload, ad-energy density |
| Yahoo Fantasy | command-center clarity, league context, operational usefulness | portal sprawl, too many equal-weight panels |
| Sleeper | player fluency, fast discovery, dense-but-legible fantasy controls | cartoon energy, chat-first chaos |
| Omen | recommendation first, evidence second; warm premium darkness; institutional confidence | generic SaaS, sportsbook noise, algorithmic hype |

## 3. Design DNA

Every Omen screen must feel:
- decisive;
- calm under pressure;
- sports-native but not loud;
- dense when useful, never cramped;
- premium through control, not expensive-looking decoration;
- warm and human, not cold data machinery.

Every Omen screen must avoid:
- full-screen marketing gradients in product workflows;
- glass everywhere;
- neon as a primary language;
- multiple competing accent colors;
- dashboard card farms;
- hover-only meaning;
- “AI” theatrics;
- copied competitor layouts.

## 4. Design hierarchy

### Decision first

The recommended action, result, or next useful task is visually dominant.

### Evidence second

Confidence, risk, impact, and explanation support the action. They never bury it.

### Status never hides

Live, demo, mock, stale, disconnected, syncing, recovering, off-season, empty, and error must be explicit in wording and structure; color reinforces but never carries the message alone.

### Surfaces earn prominence

Not every container is a card. Use:
1. page background;
2. grouped section;
3. standard surface;
4. elevated decision surface;
5. high-attention action/recovery surface.

## 5. Token architecture

No screen-level raw colors, arbitrary spacing, or ad hoc typography.

| Layer | Meaning | Examples | May vary by theme pack? |
|---|---|---|---|
| Core semantic | stable role meaning | text, surface, border, focus, success, risk, disabled | rarely |
| Brand expression | Omen atmosphere | brass accent, verdigris signal, glow, hero lighting | yes |
| Component alias | component role | decision-card surface, primary-button fill, connection panel | controlled |
| Theme pack | bounded visual mode | Core, Blackout, Whiteout, Playoff Gold | yes |
| Team skin | future personalized identity | team color expression | not MVP |

Initial modes:
- Core Omen dark
- Core Omen light/system

Future packs are not built until the core system passes accessibility and cross-platform parity.

## 6. Platform rules

### iPhone — Apple-native by default

- Use SwiftUI navigation stacks, sheets, confirmation dialogs, pickers, lists, and native authentication surfaces where appropriate.
- Prefer native Sign in with Apple and system browser returns for authentication.
- Use tab navigation only for stable top-level destinations.
- Respect safe areas, Dynamic Type, VoiceOver, reduce motion, and iOS back/swipe conventions.
- Omen owns colors, hierarchy, content, and component aliases—not a fake Android look.

Reference: [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines).

### Android — Google-native by default

- Use Jetpack Compose and Material 3 as the behavioral baseline.
- Use Android-native back behavior, adaptive navigation, system bars, accessibility, and Credential Manager paths.
- Use bottom navigation only for stable top-level destinations; adapt to rail/large-screen patterns when justified.
- Preserve Omen tokens and hierarchy while allowing Material-appropriate controls and feedback.
- Dynamic color is not automatically adopted if it would weaken Omen brand/status meaning.

References: [Android onboarding](https://developer.android.com/design/ui/mobile/guides/patterns/onboarding), [Android quality](https://developer.android.com/quality/user-experience), [Compose Material 3](https://developer.android.com/develop/ui/compose/designsystems/material3).

## 7. Shared mobile navigation map

Top-level destinations are intentionally limited:
- Command Center
- Omen
- Trade
- Draft
- League / Account as a consolidated context area

Provider connection, player details, confirmation, filtering, and recovery are nested flows or sheets, not permanent top-level tabs.

Before code, each screen must define:
- job to be done;
- entry and exit paths;
- empty/loading/error/recovery states;
- components allowed;
- primary action;
- data contract;
- compact and large-phone behavior;
- iOS/Android differences.

## 8. Component approval system

A component exists in one of these levels:

1. **Foundation:** button, icon button, form field, picker, card/surface, badge, chip, state surface, list row, meter, dialog/sheet.
2. **Omen composition:** DecisionBrief, PlayerRow, TradeResultCard, ConnectionStatusBadge, SignalList, PlatformConnectionCard.
3. **Campaign module:** rare branded moments such as a launch hero or playoff reveal.
4. **Sanctioned exception:** unique, documented, time-bounded; graduates if reused.

Every approved component has:
- purpose;
- visual anatomy;
- allowed variants and forbidden variants;
- semantic token aliases;
- required states;
- accessibility behavior;
- iOS SwiftUI mapping;
- Android Compose mapping;
- screenshot reference;
- owner and version.

## 9. Onboarding is a product flow, not a splash sequence

Omen onboarding must be:
- short;
- demo-first;
- clear about Omen account versus fantasy-provider connection;
- resumable;
- honest about provider support;
- useful even when no league is connected.

The detailed source is `omen-mobile-onboarding-connection-contract-v1.md`. No agent may replace it with a generic “three slides then a signup form” pattern.

## 10. Visual evidence pipeline

An agent cannot claim visual correctness from code alone.

For every screen:
1. Start from an approved screen contract and reference board.
2. Implement native iOS and Android versions.
3. Capture compact-phone and large-phone screenshots in light/dark where applicable.
4. Compare them to the approved hierarchy and component contracts.
5. Run accessibility checks and interaction smoke.
6. Record deviations, not just successes.
7. Require founder/design-steward review for any new visual pattern.

Figma is the visual source for approved screen layouts and component anatomy. Markdown is the behavioral/source-of-truth companion. Code follows both.

## 11. Agent rule

Before touching a native screen, an agent must read:
1. this document;
2. the mobile foundation;
3. the relevant screen/component/state/API contract;
4. the current agent inbox;
5. the latest approved Figma screen or component.

An agent must stop and flag—not invent—when:
- no component contract covers a needed pattern;
- a platform behavior conflicts with the shared design intent;
- an API state is missing;
- a provider flow is not security-approved;
- a visual reference is ambiguous.

## 12. North Star

Omen should feel like a personal fantasy front office that happens to live natively on your phone:

> The board is clear. The move is visible. The risk is honest. You know what to do next.

Not like a dashboard, not like a sportsbook, and not like a webpage stuffed inside an app.
