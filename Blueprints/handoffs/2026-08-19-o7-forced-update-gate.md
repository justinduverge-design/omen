# O7 — Forced-update / minimum-version gate

**Date:** 2026-08-19
**Agent:** Claude (claude-code)
**Task:** `O7` — server-driven minimum supported version, honest blocking prompt, fail open on network error
**Status on close:** `VERIFIED`
**Branch/PR/deploy:** work is **local and uncommitted** at the time of writing. Nothing is pushed, merged, or deployed. Do not read any evidence below as live.

## What shipped

A three-layer fail-open version gate. The server states a minimum; each app asks at launch; a build below the minimum is blocked with a prompt that offers the store listing.

### Backend

- `GET /api/system/min-version` — `src/routes/system.js`, contract `system-min-version.v1`. Public, unauthenticated (the check must run before sign-in). Query: `platform` (`ios`|`android`), `version` (dotted).
- `getMinVersionStatus()` — `src/services/systemContracts.js`. Compares dotted versions numerically after zero-padding to three parts.
- `config.minAppVersion` — `src/config/index.js`, from `MIN_APP_VERSION_IOS` / `MIN_APP_VERSION_ANDROID`, **both defaulting to `0.1.0`**, which equals the current shipped version on both platforms and therefore blocks nobody.

### iOS

- `App/Api/MinVersionGateClient.swift` — unauthenticated transport mirroring `OmenApiClient`'s shape, plus `AppVersionProvider` reading `CFBundleShortVersionString`.
- `App/UpdateGateViewModel.swift` — collapses the result to `passed` / `blocked`.
- `App/ForcedUpdateView.swift` — full-screen `OmenCard(.outlined, tone: .risk)` + `OmenButton`. Unlike `OmenStateSurface` this is deliberately interactive: it must offer the way out, not merely describe the state.
- `App/AppShellView.swift` — the gate wraps the `sessionManager.state` switch, so it applies signed-out as well as signed-in.
- `Config/Base.xcconfig` + `Info.plist` — new `OMEN_IOS_APP_STORE_URL`, blank for now.

### Android

- `feature/api/MinVersionGateClient.kt`, `UpdateGateViewModel.kt`, `ForcedUpdateScreen.kt` — direct mirrors of the iOS trio, reusing the existing `OmenHttpFetcher` seam.
- `OmenAndroidApp.kt` — same wrapping placement; the button opens the Play listing for `context.packageName`.

## Fail-open, which is the whole point of the item

Failure is absorbed at three independent layers, so no single bug can lock a user out:

1. **Service:** unknown platform, unparseable client version, or unparseable configured minimum → `status: "ok"`, `update_required: false`. Always HTTP 200.
2. **Clients:** network error, non-2xx, or undecodable body → `Unavailable`.
3. **View models:** `Unavailable` is handled in the same branch as `Ok`.

The initial state is also `passed`, so the app is never blocked while the check is in flight.

## Tests and evidence

| Gate | Result |
|---|---|
| Backend `npm test` | **570/570**, 0 fail (4 new: below-minimum, at-minimum, check-unavailable, and suffixed/4-part versions) |
| `npm audit --audit-level=moderate` | 0 vulnerabilities |
| iOS `MinVersionGateTests` | **8/8** |
| iOS unit suite | **234/234**, 0 fail (226 baseline + 8 new) |
| iOS UI suite | **12/12**, 0 fail (5 pre-existing + 7 new accessibility tests) |
| Android `MinVersionGateTest` | **9/9** |
| Android `:app:testDebugUnitTest` | **43/43**, 0 fail |
| Android `:app:assembleDebug` | BUILD SUCCESSFUL |
| Live route smoke | booted `src/server.js` with `MIN_APP_VERSION_IOS=1.5.0`: `1.4.0` → `update_required`, `1.5.0` → `ok`, no params → `ok` |

CI substitution per `Blueprints/definition-of-done.md`: backend **SUBSTITUTED** (`npm test`), iOS **SUBSTITUTED** on the founder's Mac, `xcodebuild -version` = **Xcode 26.6 (17F113)**, Android **SUBSTITUTED** (local Gradle). No CI-green claim is made anywhere.

## Visual evidence — and the defect only rendering could find

Registered `forced-update.blocked` in both `ScreenshotScenarios` registries and both `native-visual-evidence.yml` matrices, then rendered it on the iPhone 16 simulator and the `medium_phone` emulator.

Screenshots: `Direction/reviews/evidence/2026-08-19-o7/` — `ios-forced-update-light.png`, `ios-forced-update-dark.png`, `android-forced-update-light.png`.

**`ForcedUpdateView` had no explicit background and was inheriting the system default.** `OmenColor.bg` is `#0A0A0B` dark / `#FAFAF9` light; the system default is pure `#000000` / `#FFFFFF`. Close enough that a code read and 234 passing tests said nothing, and visibly off-brand on screen. Every other full-screen composition in the app sets this and this one didn't. Fixed with an explicit `.frame(maxWidth:maxHeight:) + .background(OmenColor.bg)`, then re-verified by sampling the rendered pixel:

| Mode | Sampled pixel | `OmenColor.bg` |
|---|---|---|
| iOS dark | `(10, 10, 11)` | `#0A0A0B` ✓ |
| iOS light | `(250, 250, 249)` | `#FAFAF9` ✓ |
| Android light | `(250, 250, 249)` | `#FAFAF9` ✓ |

**Android needed no fix** — `OmenAndroidApp` already hosts the gate inside `Surface(color = OmenTheme.color.bg)`, so it was correct from the start. The bug was iOS-only, which is exactly the kind of asymmetry a shared spec hides and a render exposes.

Carry forward: **a design-token defect is invisible to the type checker and to every unit test.** Two suites totalling 276 tests were green across both platforms while one of the two screens was drawing the wrong background. Render the screen.

### Pre-existing, not from O7: washed-out status bar in light mode

The Android light-mode capture shows the system status bar clock and icons in white on the `#FAFAF9` background — barely legible. **This is app-wide and pre-existing**, confirmed by rendering the already-shipped `command-center.disconnected` scenario in the same light mode and observing the identical washed-out status bar. It is an app-shell/edge-to-edge appearance concern (the light-mode status-bar icon appearance is never set), not a property of the gate screen, so it is deliberately not fixed here. Worth its own item — it affects every light-mode screen on Android.

*(The green rectangles in the Android captures are the emulator's accessibility-focus overlay, not app UI.)*

## Accessibility audit — the gate screen passes, and passes contrast

`ForcedUpdateAccessibilityUITests.swift` (5 tests), following the pattern M6 established. `performAccessibilityAudit()` is the executable stand-in for VoiceOver, which the simulator cannot run — it walks the same tree and reports unlabeled elements, contrast failures, undersized hit regions, and clipped text. It is **not** a human VoiceOver pass; it cannot judge whether an announcement is *useful*.

| Test | Result |
|---|---|
| Audit at default text size (all categories except `.dynamicType`) | pass |
| Audit at `AccessibilityExtraExtraExtraLarge` | pass |
| "Update now" exposed by name and hittable | pass |
| Prompt names the reason and the required version | pass |
| Unfiltered audit — pinned `XCTExpectFailure` | fails on exactly one finding |

**The unfiltered audit reports exactly one failure: "Dynamic Type font sizes are unsupported"** — the app-wide `OmenTypography` finding already recorded in `known_issues.md`, where every role is built as `Font(UIFontMetrics.scaledFont(for:))` and so resolves a point size at construction instead of vending a text-style-relative font. **Crucially it does *not* fail contrast**, unlike the Command Center screen, so this screen's colour pairings are genuinely sound rather than merely unaudited. That distinction is evidenced by running the unfiltered audit and reading its output, not asserted by analogy.

The pinned expectation means this test fails loudly the day `OmenTypography` is fixed, and can be retired then.

**Why this screen deserved the audit more than most:** a blocked user cannot navigate past it. If the prompt is unreadable or the update control is unreachable, there is no other route through the app.

iOS UI suite is now **10/10** (5 pre-existing + 5 new).


## Code review gate — four findings, three fixed before merge

DoD gate 15 calls for `slops-code-review`, which is not available in this session; the harness `/code-review` skill was run as the substitute at `medium`. It returned four findings against this diff. Three were fixed here rather than deferred, each with a test that fails without the fix:

1. **Android fail-open was narrower than iOS's, on a crash path.** `OkHttpFetcher` builds its `Request` *outside* its try block and catches `IOException` only, so a malformed base URL raises `IllegalArgumentException` instead. Because O7's check runs unconditionally at launch inside `LaunchedEffect`, that would **crash the app at startup for every user before sign-in** — the exact opposite of what a fail-open gate is for. Pre-existing in `OkHttpFetcher`, but O7 is what made it reachable at launch rather than behind an authenticated action. Wrapped the call in `runCatching`. Test: `a throwing fetcher fails open instead of propagating`.
2. **A suffixed or four-part version could never be blocked.** `parseVersion` required `^\d+(\.\d+){0,2}$`, so `1.0.0-rc1`, `1.0.0+build7`, and `1.0.0.4` were all unparseable — and unparseable fails open. Ship a beta named `1.0.0-rc1`, later need to force those users off it, and the gate silently never fires while returning a healthy 200. Now reads the leading numeric core. A pre-release compares equal to its release, which is the safe direction. Test: `can still block a suffixed or four-part version`.
3. **The iOS update button was a silent no-op whenever `storeURL` was nil** — which is its committed state. A control that does nothing is worse than no control on a screen that blocks the entire shell, because the user has no other route to discover it was a dead end. The button is now only drawn when there is somewhere to go; otherwise the screen says "Update Omen from the App Store to continue." Added `forced-update.no-store-link` (iOS-only — Android always derives a Play URL from the package name) with two tests and a captured screenshot, because **this is the state that actually ships today**.

**Not fixed, recorded instead:** `AppShellView.init` builds the gate client from `AppEnvironment.fromBundle` rather than the injected `\.omenEnvironment`. Both resolve to the same value today because `OmenIOSApp` injects `.fromBundle`, so nothing currently misbehaves; it is a latent inconsistency that would bite a future test or preview injecting a stub environment. The fix restructures `init`, which is not worth doing blind under a closing task.

## Procedure gap found — the documented iOS substitute command cannot pass a merged test

`definition-of-done.md` → "Local substitutes" prescribes `xcodebuild test … CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO`. Run exactly as written, **four tests fail**:

```
KeychainSessionStoreTests.testClearRemovesSession
KeychainSessionStoreTests.testSaveAndLoadRoundTrips
KeychainSessionStoreTests.testSavedTokensNeverAppearInUserDefaults
KeychainSessionStoreTests.testSaveOverwritesPreviousSession
```

All four fail with `unhandled(status: -34018)` — `errSecMissingEntitlement`. The Keychain requires a keychain-access-group entitlement, which only exists when the bundle is signed; disabling signing removes it. Re-running the identical command **without** the two signing flags passes all five. These tests were added by `S5` on 2026-08-18 and its evidence records them passing, so this is not a regression from O7 and not a defect in `KeychainSessionStore` — it is the documented command being wrong for the suite as it now stands.

**Recommended correction:** amend the iOS row in `definition-of-done.md` so the signing flags are dropped (or noted as incompatible with `KeychainSessionStoreTests`). Left unamended, the next agent following the doc literally will read four red Keychain tests as a real failure and either chase a non-bug or, worse, record a false red against unrelated work.

## Skills

- **Invoked:** none. The routing table in `skill-activation-runbook.md` maps this item's named skills to security/RBAC review work; O7 adds a public, unauthenticated, non-credential route.
- **Considered but N/A:** `security-privacy-evidence` — no token, credential, or PII is read, stored, logged, or transmitted by this feature; the route is public by design and its only input is a version string. `rbac-risk-review` — no role, permission, or access-control surface is touched.
- **Skill improvement:** see the procedure gap above — a concrete, reproducible correction to `definition-of-done.md`.

## Limitations and what is explicitly NOT done

- **The gate is inert as shipped.** Both minimums are `0.1.0`, equal to the current version, so nothing is blocked. This is deliberate: O7's own **Do not touch** forbids forcing an update without a working store listing to update to, and neither store listing is live (`R3`/`R4` are open).
- **The store URLs are blank** on both platforms. iOS reads `OMEN_IOS_APP_STORE_URL` (unset); Android derives the Play URL from the package name, which will 404 until the listing publishes. A blocked user would see the correct prompt and a button that goes nowhere — which is why the minimum must not be raised first.
- **Rendered on simulator/emulator, not on physical hardware.** The accessibility audit is done (see above) and passes, including at the largest Dynamic Type; a **human VoiceOver pass on a real device remains open**, since the audit can only prove an announcement exists and is well-formed, not that it is useful. Android has no equivalent audit in this pass — the screen was rendered and visually verified there, but not audited.
- **No deploy.** `MIN_APP_VERSION_*` are not set on KVM1. Setting them is a founder action.

## Next recommended step

Founder decision, not agent work: once `R3`/`R4` put listings live, fill `OMEN_IOS_APP_STORE_URL`, confirm the Play URL resolves, and only then consider raising the minimums. Until then O7's mechanism is in place and correctly does nothing.
