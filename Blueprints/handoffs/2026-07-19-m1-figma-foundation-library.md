# M1-F Native Figma Foundation Library — 2026-07-19

## Outcome

Populated the approved Omen Native Design House foundation pages without creating a new screen, feature component, token meaning, or provider behavior.

- [02 — Tokens & Themes](https://www.figma.com/design/mWjrAKPi4JSIP5lAmGAtB3?node-id=13-2)
- [03 — Components](https://www.figma.com/design/mWjrAKPi4JSIP5lAmGAtB3?node-id=14-2)

## Canvas changes

### Tokens and typography

- Created `Omen Primitives` (24 raw color values) and `Omen Semantic` (16 aliased Core Dark/Core Light semantic roles) variable collections.
- Added scoped semantic variables for background, surfaces, border, text, accent, Omen signal, umber, and `color/focus-ring`; no variable uses `ALL_SCOPES`.
- `focus-ring` is a stroke-only semantic token. Its specimen documents the required visible outline plus platform-native focus/selection behavior and non-color selected-state cue.
- Added ten locked typography styles: Display, Heading/H1–H3, Body/Default, Body/Small, Label, Eyebrow, Chip, and Numeric.

### Component registry

- Added a registry documentation frame for Inputs, Surfaces, Selection, and Rows & metrics.
- It records existing approved anatomy/state/accessibility/platform constraints only. It is deliberately not a set of reusable Figma components or a new screen pattern.

## Validation

- Read the existing Figma file first: the controlled pages existed, but `02` and `03` were empty; no local variables or styles existed.
- Confirmed Alegreya Sans, Alegreya, and DM Mono are installed in the Figma environment.
- Checked available libraries and searched for reusable assets. Material 3 and iOS kits were not imported because their token/system ownership conflicts with the Omen registry contract.
- Initial screenshots revealed the documentation frames were fixed at 1px height. Corrected each to auto-height, then visually rechecked both pages.
- Final node IDs: Tokens frame `13:2`; Components frame `14:2`; variable collections `VariableCollectionId:12:2` and `VariableCollectionId:12:3`.

## Boundaries preserved

- No Figma library publish action or permission change.
- No native scaffold/code, web code, API/auth/provider work, package change, secret access, schema change, deploy, or production action.
- No external library component import, new visual pattern, team skin, or ESPN/mobile-provider claim.

## Skill receipt

```text
Task: M1-F native Figma token and foundation-library setup
Change type: controlled native design-system foundation
Skills invoked: slops-repo-inspector, planning-pass, slops-context-markdown, slops-design-system-pack, figma-use, figma-generate-library, slops-git-flow
Conditional skills considered but not applicable: figma-create-new-file (official file exists); figma-generate-design and figma-swiftui (no screen composition or code-to-design translation); slops-taste and slops-ux-copy (no new visual pattern or product copy); workflow-tree-spec, security-privacy-evidence, rbac-risk-review, pre-build-research (no flow, trust boundary, authority, provider, or uncertain external behavior change); implementation/testing/device skills (no native app code).
Evidence: Figma node links above, visual screenshots, and this handoff.
Procedure gap found: no correction needed. The Figma library workflow caught and corrected the auto-layout sizing defect before acceptance.
```

## Status and next safe action

- Branch: `codex/m1-figma-foundation-library`
- Commit / PR / push / merge / deploy: none for this M1-F evidence branch.
- M1-F is complete. The next queued mobile milestone is M2 app-shell project scaffolding, which requires a new plan-approval gate before any code or project files are created.
