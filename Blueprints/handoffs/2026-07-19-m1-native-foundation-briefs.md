# M1 Native Foundation Briefs — 2026-07-19

## Outcome

Created the first two approved M1 build inputs:

- `Blueprints/specs/mobile/m1-focus-ring-build-brief-v1.md`
- `Blueprints/specs/mobile/m1-native-typography-build-brief-v1.md`

They turn the approved M0b registry into implementable SwiftUI and Jetpack Compose contracts for the semantic focus-ring and locked Alegreya type hierarchy. M1 remains in progress; these are its first two briefs, not native component code or a completed app-shell milestone.

## Scope and boundaries

- Documentation/build briefs only.
- No iOS or Android project scaffold, font-file acquisition, native code, Figma edit, web CSS change, API/auth/provider change, package change, secret access, database change, deploy, or production action.
- The official Design House currently has only `00 — Start Here`; Markdown remains the working source until the token/component pages exist.
- F2 and M0-BE continue to own the connected-league readiness/provider-state contract.

## Contract coverage

### Focus ring

- `focus-ring` is a semantic core token with one SwiftUI and one Compose expression.
- It requires a visible outline plus native focus/accessibility/selection behavior; brass or any color alone is insufficient.
- The brief names the first interactive foundation controls, iOS/Android behavior, non-color selection cues, and later device/accessibility evidence.

### Typography

- Locks Alegreya Sans for UI/headings/controls, Alegreya for reading, and DM Mono for numeric/code-adjacent values.
- Defines the ten shared type roles, planned SwiftUI/Compose role APIs, Dynamic Type/font-scale behavior, and component coverage.
- Excludes Cinzel and Inter from native Omen UI; permits accessibility fallbacks only when the role hierarchy survives.

## Verification

- `git diff --check` passed for the tracked worktree diff.
- Source trace checked against the approved mobile foundation, native Design House, registry, inbox, sprint, decision log, and M0c handoff.
- No app tests or builds ran: this change adds no application code or executable project.

## Skill receipt

```text
Task: M1 first two native foundation build briefs
Change type: L2 documentation/build-input contract
Skills invoked: slops-repo-inspector, planning-pass, slops-context-markdown, slops-design-system-pack, slops-git-flow
Conditional skills considered but not applicable: slops-taste (no new visual pattern); slops-ux-copy (no user-facing copy change); workflow-tree-spec (no flow/state change); pre-build-research (no unsettled external-platform behavior); slops-tdd, slops-quality-baseline, slops-code-review, slops-mobile-smoke, slops-ui-ux-audit, slops-verify (no code or running native app); Figma tools (no approved component/token page to edit).
Evidence: the two build briefs and this handoff; git diff check.
Procedure gap found: no correction needed. The registry's explicit M0b-to-M1 boundary was sufficient to write build-ready briefs without inventing code or Figma scope.
```

## Status

- Branch: `codex/m1-native-foundation-briefs`
- Commit / PR / push / merge / deploy: none.

## Next safe action

Select the next small M1 foundation-component brief from the approved registry before any native project scaffold or component implementation. M2 remains the owner of native project structure and module paths.
