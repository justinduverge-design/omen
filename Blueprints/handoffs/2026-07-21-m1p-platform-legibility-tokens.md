# M1-P Platform Legibility Tokens + PlatformBadge Fill-on-Platform Handoff

**Date:** 2026-07-21
**Branch:** `claude/m1p-platform-legibility-tokens`
**PR:** _pending_
**Base:** `main` @ `604c108`

## Scope

Close the token gap flagged by PR #174 (PlatformBadge) so that
`OmenPlatformBadge` renders as fill-on-platform (Yahoo purple with white text, ESPN red
with white text, darkened Sleeper blue with white text) instead of the tinted-surface
fallback.

Registry §2.3 already reserved names for `-chip` legibility overrides and `on-platform-*`
foregrounds; this PR fills them in with tested hex values that meet WCAG AA at chip
typography, and switches `OmenPlatformBadge` to consume them on both platforms.

Not a broader theme-pack refactor. Not a team-runtime-theming revival (removed in PR #114).
Not touching any other component.

## Files changed

- `mobile/android/core/designsystem/src/main/kotlin/com/slopssaloon/omen/core/designsystem/token/OmenColor.kt` (adds 6 new fields to `OmenDataSemanticColors`; both dark and light dataSemantics inherit them via `.copy()`)
- `mobile/android/core/designsystem/src/main/kotlin/com/slopssaloon/omen/core/designsystem/component/OmenPlatformBadge.kt` (switch to fill-on-platform; docs updated)
- `mobile/android/core/designsystem/src/test/kotlin/com/slopssaloon/omen/core/designsystem/token/OmenColorTest.kt` (3 new tests: hex lock, invariance across themes, on-platform white)
- `mobile/ios/OmenIOS/OmenIOS/DesignSystem/OmenColor.swift` (adds 6 new `Data.*` constants)
- `mobile/ios/OmenIOS/OmenIOS/DesignSystem/OmenPlatformBadge.swift` (switch to fill-on-platform; docs updated)
- `mobile/ios/OmenIOS/OmenIOSTests/OmenPlatformBadgeTests.swift` (adds chip/on-platform token assertions; keeps base-token assertions)
- `Blueprints/specs/mobile/omen-native-design-system-registry-v1.md` (registry §2.3 platform row now lists actual hex values)
- `Blueprints/done/LEDGER.md`
- `Blueprints/playbooks/skill-usage-ledger.md`
- `Blueprints/handoffs/2026-07-21-m1p-platform-legibility-tokens.md` (this file)

_No new Swift files → no `project.pbxproj` change; no new Kotlin components._

## Design decisions

### Invariant, per registry rule
Every new token is invariant across dark/light themes and across future theme packs.
Registry §2.3 mandates that data-semantic tokens (which includes the platform family) do not
drift — otherwise a user can't rely on "purple = Yahoo" to skim leagues. PR #114 already
removed team-runtime-theming; this PR does not revive it. If Justin later chooses to relax
the invariance rule, that is a registry-level decision, not a token-file change.

### Contrast targets and chosen hexes (WCAG AA: ≥4.5:1 vs white for normal text)

| Token | Base color contrast vs white | Chosen chip fill | Chip vs white | Rationale |
|---|---|---|---|---|
| Sleeper | `#1FA3E8` ≈ 2.5:1 (fail) | `#0F70B0` | ≈ 5.5:1 (AA) | darken blue until it clears normal-text AA |
| Yahoo | `#410093` ≈ 15:1 (AAA) | `#410093` (same) | ≈ 15:1 | already dark enough; no change |
| ESPN | `#C81E2C` ≈ 4.7:1 (AA borderline) | `#B21826` | ≈ 7:1 | small darken for margin above AA |

`on-platform-sleeper`, `on-platform-yahoo`, `on-platform-espn` = `#FFFFFF` for all three
(invariant). Uniform white text keeps a single voice across all three provider chips.

### Base tokens preserved
`platformSleeper` / `platformYahoo` / `platformEspn` remain in `OmenDataSemanticColors` and
`OmenColor.Data` with their original hex values. They are the correct token for any non-chip
provider identity use (accent stripes, icons, dividers, etc.); chip-only surfaces use the
new `-chip` fills.

## Verification

- **RED (implicit):** `PlatformBadge` on both platforms references `platformSleeperChip` /
  `platformYahooChip` / `platformEspnChip` / `onPlatform*` fields that did not exist in
  `OmenDataSemanticColors` or `OmenColor.Data` before this PR — the token expansion is what
  makes the switch compile.
- **GREEN — Android JVM:** `:core:designsystem:testDebugUnitTest :app:assembleDebug` passed
  (4s incremental). The 3 new `OmenColorTest` assertions cover the exact hex lock, dark/
  light invariance, and pure-white on-platform foregrounds.
- **GREEN — Android device:** `:core:designsystem:connectedDebugAndroidTest` passed
  **25/25** on `Medium_Phone` API 37 — the existing 3 PlatformBadge label-existence tests
  still pass with the fill-on-platform treatment (label is invariant to color).
- **iOS:** local toolchain unavailable in this shell; unsigned simulator CI (`ios-ci.yml`)
  will run on push. New `OmenPlatformBadgeTests` assertions pin the chip and on-platform
  token contracts.
- `git diff --check` clean.

## Boundaries honored

No provider connect flow, no provider credentials, no auth or user-data touch, no backend,
no SQL, no secrets, no signing/store/release, no `.env`/DNS/Nginx, no dependency or package
change, no Figma library publish. No new native components introduced. No `project.pbxproj`
edit (no new Swift files). No revival of team-runtime-theming.

## Skills

- Used: `slops-repo-inspector`, `planning-pass`, `slops-git-flow`, `slops-tdd`,
  `slops-quality-baseline`, `slops-code-review`.
- Substituted: `slops-mobile-smoke`/`slops-ui-ux-audit` — web-driver tooling; native
  substitutes are the Gradle connected instrumentation test + unsigned iOS simulator CI,
  same substitution as ConfirmationDialog/PlatformBadge/ListRow.
- N/A: `security-privacy-evidence`, `rbac-risk-review`, `slops-legal-spot-check`,
  `slops-ux-copy`, `design-md-author`, `demo-mode-pre-empty-state` — no trust boundary,
  authority change, provider claim, new user-facing copy, or new design contract.

## Skill improvement

None new. The token-hex-lock pattern in `OmenColorTest` is now the standard for anyone
adding future data-semantic tokens — mirror this file when adding new invariant families
(e.g. future medal/tier/badge families).

## Judgment calls Justin can override

The three chosen chip hexes (`#0F70B0`, `#410093`, `#B21826`) are contrast-driven, not brand-
authorized. They read as recognizably Sleeper-blue / Yahoo-purple / ESPN-red at chip size,
but a brand team may want slightly different values. Swap in `OmenColor.kt` + `OmenColor
.swift` + `OmenColorTest.kt` + the registry markdown row and this PR's contract still holds.

## Next work after this PR

- **M1-P P4** — dual-platform gallery + enforcement to prevent feature-local primitive
  clones. M1-P P2 is now fully complete (all foundation primitives + platform legibility
  tokens).
