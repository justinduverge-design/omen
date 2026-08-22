# M4-Help-Support-Implementation — accessibility and visual evidence, 2026-08-22

Closes the evidence gap left open by PR #229. That PR's own closeout was explicit about it:
*"Device evidence was not run: `adb` is unavailable here, so there are no Android screenshots,
TalkBack/font-scale checks, compact/large-phone checks, or iOS Dynamic Type/VoiceOver claims."*

## Android — states, at default font scale

`android-medium-phone-help-support-{available,no-account,offline,submission-unavailable,provider-recovery}.png`

`medium_phone` AVD, API 36, 1080×2400 @420dpi (411×914dp).

## Android — font scale

| File | Scale | Result |
|---|---|---|
| `android-medium-phone-help-support-available-fontscale-1.3.png` | 1.3 | clean |
| `android-medium-phone-help-support-available-fontscale-2.0.png` | 2.0 (accessibility max) | **Help + Support content is clean; the bottom nav breaks** |
| `android-medium-phone-help-support-submission-unavailable-fontscale-2.0.png` | 2.0 | same |

**The 2.0 break is not this screen's.** "Command" wraps to "Comma / nd" and "League" clips at the
right edge — in `OmenBottomNav`, which sits under every Android screen. Confirmed as production
code by reading `OmenAndroidApp.kt:505` against the screenshot-mode `FauxBottomNav`: structurally
identical, neither sets `maxLines`/`softWrap`/`overflow`. Recorded in `Direction/known_issues.md`
as its own app-wide item. **The Help + Support cards themselves grow, wrap, and clip nothing.**

## Android — compact phone

`android-compact-360x640dp-help-support-{available,submission-unavailable}.png`

Same device driven at `wm size 720x1280` / `wm density 320` → **360×640dp**, the compact-phone
reference. Both render cleanly; the geometry override was reset afterwards.

## Android — TalkBack

- `android-medium-phone-help-support-talkback-focus.png` — TalkBack running, focus rectangle on
  the screen title, proving it traverses the screen.
- `android-talkback-accessible-name-inventory.txt` — every clickable/focusable node with the name
  TalkBack would announce. **0 actionable elements without an accessible name.** A scan of the
  whole tree for `espn_s2`, `swid`, `cookie`, `token`, `bearer`, `password`, `secret`, `session=`
  returned **no hits**.

Two caveats stated rather than buried:

1. The names live on each row's **merged subtree**, not on the clickable node's own
   `content-desc`. Reading only the clickable node makes all six look unlabeled; they are not.
2. The Help Center rows (Getting started / League connections / Account and privacy) are **not**
   in the actionable inventory because they are deliberately non-interactive — verified in source
   (`OmenHelpSupportScreen.kt:107-109`, `OmenListRow` with no `onClick`), not assumed.

This is a static accessibility-tree check. **It is not a human TalkBack listening pass** — it
proves a name exists and is well-formed, not that the announcement is useful or well-ordered.

## iOS — states and sizes

- Compact: `ios-se3-compact-help-support-*.png` — iPhone SE (3rd gen), 375×667pt, all five states.
- Large: `ios-17-pro-max-large-help-support-*.png` — iPhone 17 Pro Max, three states.
- Dynamic Type: `ios-se3-compact-help-support-{available,submission-unavailable}-dynamic-type-axxxl.png`
  at `accessibility-extra-extra-extra-large`. Text scales and reflows; nothing clips. The iOS tab
  bar does **not** exhibit the Android nav break.

## iOS — VoiceOver substitute

`mobile/ios/OmenIOS/OmenIOSUITests/HelpSupportAccessibilityUITests.swift` audits all five states
plus the largest Dynamic Type with `performAccessibilityAudit()`, following the pattern
`ContextualHelpAccessibilityUITests` established.

**Why a substitute:** the iOS Simulator cannot run VoiceOver — `com.apple.VoiceOverTouch` is a
background-only launchd job there and never gets a PID. **A real-device VoiceOver pass remains
open** and is not claimed anywhere in this evidence set.

## Environment

- Xcode **26.6 (17F113)**; `medium_phone` AVD API 36; JDK 17 (Temurin 17.0.20), matching CI.
- All captures run in screenshot mode: no session, no auth, no network, no provider state.
