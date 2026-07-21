# Sprint / Ledger Alignment Receipt — 2026-07-21

## Purpose

Reconcile the active sprint, agent inbox, and Done evidence after the native-mobile burst merged several items quickly and left stale status language behind.

## Scope

Docs/governance only.

No app code, native code, provider behavior, credentials, secrets, SQL, package files, deploy configuration, production flags, store configuration, or Figma content changed.

## Evidence checked

- `Direction/current_sprint.md` prior state still said ListRow was remaining in one row even though it was later recorded as complete.
- `Direction/agent_inbox.md` still described M3-A as partly pending iOS CI/merge even though PR #171 merged.
- PR #165 merged native tokens, controls, fields.
- PR #166 merged Card, Badge, Chip.
- PR #167 merged Modal / Sheet.
- PR #168 merged State Surfaces.
- PR #169 merged ListRow.
- PR #171 merged M3-A iOS native auth.
- PR #172 merged the post-merge native scaffold regression-test repair after the iOS screen split.
- Figma Native Design House currently has the expected pages: Start Here, Principles & References, Tokens & Themes, Components, iOS Screens, Android Screens, and QA & Evidence.

## Corrections made

### `Direction/current_sprint.md`

- Set last updated to 2026-07-21.
- Rewrote the stale native program table into a current truth table.
- Marked M0a/M0b/M0c, M1-F, M2-F, M2-E, M2, M3, and M3-A implementation as completed where evidence supports it.
- Marked M3A-QA as still open and founder/human-gated.
- Reconciled M1-P P2 progress through PR #169 ListRow.
- Set remaining M1-P P2 to PlatformBadge and ConfirmationDialog only.
- Explicitly blocked M4 feature screens until M1-P P2 and P4 gallery/enforcement close.
- Made the next build order explicit: PlatformBadge → ConfirmationDialog → gallery/enforcement → F2 → M0-BE → M4 screens.
- Paused old web migration queue items under the native pivot while preserving safe backend work.

### `Direction/agent_inbox.md`

- Set refreshed date to 2026-07-21.
- Removed stale “M3-A in progress / iOS pending CI” language.
- Recorded Android auth merged in PR #157, iOS auth merged in PR #171, and scaffold test fix merged in PR #172.
- Moved recommended next pull to M1-P PlatformBadge, then ConfirmationDialog, then M1-P P4 gallery/enforcement.
- Preserved founder/human QA boundary for real device auth tests.
- Suppressed web recommendations while the native mobile pivot is active.

## Current next pull

1. M1P-Next-1 — PlatformBadge foundation.
2. M1P-Next-2 — ConfirmationDialog foundation.
3. M1P-P4 — dual-platform gallery/enforcement.
4. F2 — resolve `ready` vs `pending_live_engine`.
5. M0-BE-0 — backend shared state/API contract and acceptance matrix.

## Done Ledger status

The existing Done Ledger already records M1-P P2 foundations through ListRow. This pass did not rewrite the large historical ledger table; the active routing docs now point agents at the reconciled truth and this receipt records the status delta.

Recommended follow-up: add compact Done Ledger rows for PR #171 and PR #172 if the next docs pass wants every native-auth closure reflected in `Blueprints/done/LEDGER.md` directly rather than only through PRs, handoffs, and this receipt.

## Verification

- Docs-only branch created: `docs/sprint-ledger-alignment-2026-07-21`.
- No production mutation.
- No deploy action.
- No package/SQL/secret changes.

## Boundaries for the next agent

Do not start feature-screen implementation from Figma yet. The Figma frames are visual contracts and reference evidence. Shared primitives and gallery/enforcement must come first.
