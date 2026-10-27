# Omen Native Mobile Design Delivery Workflow v1

**Status:** Active workflow for M0 native design and every native screen thereafter  
**Date:** 2026-07-19  
**Applies to:** SwiftUI iPhone work, Kotlin/Jetpack Compose Android work, design artifacts, components, onboarding, provider connection, and visual QA.

## Purpose

This is the repeatable route from product intent to a native, testable screen. It prevents two failures:

- a pretty concept that cannot be built or trusted;
- a technically functional screen that feels unlike Omen or unlike its platform.

**Sources of truth:**

1. `omen-native-mobile-foundation-v1.md`
2. `omen-native-design-house-v1.md`
3. `omen-mobile-onboarding-connection-contract-v1.md`
4. `omen-native-agent-capabilities-canvas-v1.md`
5. The approved design artifact for the screen (an approved design artifact (made with any of our tools: Claude Design, Slides and Artifacts, ChatGPT, Codex, Gemini; approved by the founder))
6. this workflow

## The workflow

### 1. Frame the job

Write the user job, entry point, primary action, exit, data/auth dependency, platform scope, and explicit do-not-touch boundaries.

For onboarding and provider work, use `workflow-tree-spec` before a screen is designed. Map success, cancel, retry, disconnected, stale, denied, demo, empty, and failure paths.

### 2. Research the native behavior

Use `pre-build-research` whenever Apple/Android behavior, a provider, policy, external SDK, or current guidance is uncertain. Prefer Apple and Android primary documentation.

For the iPhone path, use Apple system behavior first. Liquid Glass is a controlled system-material layer: navigation, tab bars, toolbars, compact controls, search, and transient sheets. It is not the default container for dense decision, provider, error, or recovery content.

For Android, use Material 3 and platform-appropriate navigation, feedback, and adaptive layout. Do not make Android imitate the iPhone.

### 3. Make the design contract

Use `slops-design-system-pack`, `slops-taste`, and `slops-ux-copy` as applicable to define:

- information hierarchy and primary action;
- tokens and allowed components;
- state/copy matrix;
- platform differences;
- accessibility intent;
- motion/material behavior;
- links to the approved design artifact.

Make the design in whichever of our tools fits (Claude Design, Slides and Artifacts, ChatGPT, Codex, Gemini) and get the founder's approval on it. Figma is retired (founder, 2026-10-26); `design/figma-archive/` is history.

**An empty listing is not evidence of absence.** Design tools and file listings can load lazily or be incomplete (on 2026-08-24 a Figma listing showed one page of seven). Before reporting that a design or contract was never made, probe for the specific item; treat a missing listing as unknown.

These tools support the workflow; they never override the product contracts.

### 4. Security and provider gate

Before code that touches auth, sessions, provider connection, personal data, telemetry, or recovery, use `security-privacy-evidence` and `rbac-risk-review`.

No secrets, OAuth tokens, provider cookies, or real user data may appear in design artifacts, fixtures, logs, screenshots, analytics, PRs, or handoffs. ESPN stays feasibility-gated until a store-safe, real-device path is approved.

### 5. Build the smallest native slice

Use `slops-repo-inspector`, `planning-pass`, `slops-git-flow`, `slops-tdd`, and `slops-quality-baseline`.

Implement only the approved screen/component and its named states. Prefer SwiftUI and Compose system components over custom clones. Keep iOS and Android parity at the contract level, not pixel-for-pixel.

### 6. Prove it visually and functionally

Use `slops-ui-ux-audit`, `slops-mobile-smoke`, and `slops-verify`.

Attach:
- compact-phone and large-phone screenshots;
- light/dark or system appearance where relevant;
- loading, empty, error, disconnected, recovery, and demo evidence;
- VoiceOver/TalkBack, Dynamic Type/font scale, contrast, touch target, and reduce-motion result;
- design artifact and contract links;
- an honest deviations list.

Use `mobile-first-qa-playbook` at the real-device/release gate.

### 7. Review, record, and release only when authorized

The reviewer checks behavior and security. The design steward checks hierarchy, tokens, native expression, and any new pattern. Founder approval is required for new components/tokens, provider claims, exceptions, production actions, and releases.

Record the actual skills used, evidence paths, and gaps in `skill-usage-log.md` and the handoff. Use `slops-retro` when a repeated gap should change the system.

## Required skill bundles

| Work | Required baseline | Add when applicable |
|---|---|---|
| Native design contract | `slops-repo-inspector`, `planning-pass`, `slops-context-markdown`, `slops-design-system-pack` | `slops-taste`, `slops-ux-copy`, `workflow-tree-spec`, `pre-build-research` |
| Native screen/component implementation | `slops-repo-inspector`, `planning-pass`, `slops-git-flow`, `slops-tdd`, `slops-quality-baseline`, `slops-code-review` | `slops-mobile-smoke`, `slops-ui-ux-audit`, `slops-ux-copy` |
| Auth/provider/onboarding | implementation bundle + `workflow-tree-spec`, `security-privacy-evidence`, `rbac-risk-review` | `slops-legal-spot-check`, `slops-verify`, `demo-mode-pre-empty-state` |
| Real-device/release | `slops-verify`, `mobile-first-qa-playbook`, `slops-quality-baseline` | `slops-ship`, `slops-canary`, `slops-retro` |

## Non-negotiables

- No screen code before its state/API contract and approved design artifact exist.
- No direct `main` write, production mutation, secret/store-account access, or release without the authority stated in the capability contract.
- No copied competitor screen or generic “glass everywhere” treatment.
- iOS may use Liquid Glass at system-chrome/control boundaries; Android remains a Material 3-native expression.
- No agent calls a provider path ready until safe real-device evidence exists.

## Definition of done

A native task is done when another agent can reproduce the result from the contract, the approved design artifact, code, tests, screenshots, accessibility evidence, and documented limitations—without guessing or needing elevated access.
