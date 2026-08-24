# M4-CC-PlatformsCompact — render evidence

## iPhone SE — captured 2026-08-14 with PR #304 / `6466a4c`

- `iphone-se-command-center-demo.png`
- `iphone-se-dynamic-type-xxxl.png`

## Android — captured 2026-08-22

Added to close the item's one unevidenced `Done when:` clause. PR #304 committed iPhone SE
captures only, and the clause names **both** platforms.

| File | Covers |
|---|---|
| `android-medium-phone-command-center-demo-connected.png` | **connected and disconnected rows in one frame** — Sleeper `· Connected · 4m ago ›`, Yahoo and ESPN `· Disconnected` |
| `android-medium-phone-command-center-disconnected.png` | real signed-in user, all three providers disconnected |

Device: `medium_phone` AVD, API 36, 1080×2400 @420dpi = **411×914dp**. Pixel 6a is 1080×2400
@430dpi ≈ 404×895dp — the same pixel grid, within ~2% in dp. Recorded as measured rather than
claimed to *be* a Pixel 6a.

### Above the fold — measured, not eyeballed

Column scan of `android-medium-phone-command-center-demo-connected.png` at x=60:

| Element | y range (px) |
|---|---|
| Platforms strip | 794 → 1174 (**380px ≈ 145dp**, three 48dp rows + dividers) |
| Matchup hero card | 1307 → 2000 |
| Bottom nav | 2127 → 2400 |

**The Omen hero card ends at y=2000 with 127px clear before the nav bar**, so it is fully visible
without scrolling. That is the clause the item turns on.

### Design tokens — sampled from the rendered pixel

The point of this capture is a token assertion, so the token was read out of the PNG rather than
judged by eye:

| Element | Rendered | Token | Match |
|---|---|---|---|
| Strip border (3px, y794–796) | `#E5E5E3` | `border` (light) | ✅ |
| Strip interior | `#FFFFFF` | `surface1` (light) | ✅ |
| Page background | `#FAFAF9` | `bg` (light) | ✅ |

Token values are `OmenColor.kt:142-146`.

### One trap, recorded so the next agent does not lose the same hour

The first three capture attempts showed a **bright lime-green rectangle (`#64C139`) around the
platforms strip**, which reads exactly like a design-token defect. It is not. It is **TalkBack's
accessibility-focus indicator**, left enabled on the AVD by an earlier session.

Two things made it slow to diagnose, both worth knowing:

- `adb shell settings put secure enabled_accessibility_services ""` **fails with "Bad arguments"**
  and silently leaves TalkBack enabled. Use `settings delete secure enabled_accessibility_services`.
- Setting `accessibility_enabled 0` alone does not stop an already-running TalkBack from drawing,
  and the value **reverts to 1 on reboot** while a service is still listed.

`scripts/capture-screenshot-scenario.sh` now refuses to capture unless the Omen window holds
focus, which catches this class (and the cold-boot SystemUI ANR) instead of committing it.

### Other gates for `6466a4c`, run 2026-08-22

| Gate | Result |
|---|---|
| `:app:assembleDebug` | BUILD SUCCESSFUL |
| `PrimitiveEnforcementTest` (scanner) | **1/1** |
| `:core:designsystem:testDebugUnitTest` | **22/22** |
| `:app:testDebugUnitTest` | **45/45** |
| `:app:connectedDebugAndroidTest` | **53/53**, 0 failed |

### Not covered by these captures

The disconnected row's inline **`[Connect]` button does not appear**. That is correct behavior,
not a defect: screenshot mode passes no connect handler, and `OmenPlatformCompactRow` draws the
button only when `onConnect != null` — the honest-state rule that forbids advertising a dead end.
The Connect and Manage paths are covered by the connected tests, not by these renders.
