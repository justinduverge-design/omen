# M1-P P2 — Badge + Chip Foundations — 2026-07-20

## Scope

Added token-backed display Badge and selectable/display Chip primitives in both native design
systems. Semantic labels and selected/disabled behavior remain explicit; no team theming,
provider behavior, or feature-screen migration is included.

## Evidence

- Code commit: `dccdb4f`; iOS project-file identifier repair: `3fb8ae9`.
- Merge: PR #166 (`6e173d9`).
- iOS unsigned simulator CI: `29789967145` passed after the PBX identifier repair.

## Limitation and next gate

The build uses the shared P2 gallery/test surface; no direct gallery screenshot is claimed from
this shell. Future Swift project additions must retain unique `PBXBuildFile` identifiers.
