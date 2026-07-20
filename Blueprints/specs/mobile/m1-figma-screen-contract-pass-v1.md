# M1 Figma Screen-Contract Pass v1

**Status:** Approved M1-P visual deliverable  
**Date:** 2026-07-20  
**Owner:** Design steward  
**Applies to:** Omen Native Design House `mWjrAKPi4JSIP5lAmGAtB3`  
**Purpose:** Turn approved visual briefs into inspectable iPhone and Android screen contracts before component or feature-screen implementation.

## 1. Preconditions

Read, in this order:

1. `m1-native-reference-library-v1.md`
2. `omen-mobile-visual-briefs-v1.md`
3. `omen-native-design-system-registry-v1.md`
4. `omen-native-mobile-foundation-v1.md`
5. `omen-native-app-shell-auth-api-contract-v1.md`
6. `m1-native-primitives-enforcement-v1.md`
7. `native-mobile-design-delivery-workflow-v1.md`

If sources conflict, stop and flag the discrepancy. Do not solve it inside a screen.

## 2. Required Figma work

### 01 — Principles & References

Create a compact, annotated reference board that records:

- each approved Apple, Material, accessibility, and fantasy-product source;
- the exact behavior it may influence;
- the Omen rule that prevents copying;
- source URL/date and owner.

This page is an evidence board, not a moodboard.

### 03 — Components

Create proposals only for the new M1-P compositions required by approved visual briefs:

- Context Strip
- Matchup Spine
- Evidence Disclosure

Each proposal names anatomy, variants/states, tokens, accessibility notes, and iOS/Android expression. It remains a proposal until founder approval and registry update.

### 04 — iOS Screens and 05 — Android Screens

Create low-fidelity screen contracts for:

1. Command Center
2. Omen lead + Start/Sit detail
3. Waiver Analysis
4. Trade builder + verdict
5. League matchup + standings/activity
6. Team/league switcher sheet
7. Account → Connected Leagues
8. Welcome/provider connection

Each has primary state plus its most important alternate state. Use annotated layout and approved component names; do not make a high-fidelity one-off component in a screen.

Then create high-fidelity **golden screens** for:

1. Command Center
2. This Week’s Omen / Start-Sit
3. Trade verdict

Each golden screen has a paired iOS and Android frame. They share Omen hierarchy/tokens/content but use their own platform-native navigation, sheet, control, and feedback grammar.

### 06 — QA & Evidence

For every wireframe/golden screen, record:

- contract/brief links;
- Figma component references;
- primary and alternate state;
- platform differences;
- open questions/deviations;
- founder approval status.

## 3. Boundaries

This pass may create reference annotations, wireframes, golden screens, and component proposals.

It must not:

- publish a Figma library;
- invent/rename semantic tokens;
- create an unapproved production component;
- use copied competitor layouts/assets/copy;
- access provider accounts, secrets, real league data, or store accounts;
- claim a provider/connection path is technically ready;
- substitute a wireframe for implementation evidence.

## 4. Acceptance gate

The pass is ready for founder review only when:

- all eight low-fidelity flows exist on both screen pages;
- all three golden screen pairs exist;
- every visible element maps to an approved component or an explicit proposal;
- primary and alternate states are shown;
- all reference influence is annotated;
- iOS and Android differences are intentional and documented;
- no Figma change conflicts with approved visual briefs.

No M1-P P2/P3 component implementation begins until this gate is approved.
