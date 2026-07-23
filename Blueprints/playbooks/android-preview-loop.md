# Android Preview Loop

## Purpose

Local, zero-CI, zero-Xcode way to see a native Omen feature screen on a phone-shaped surface. Use when iOS macOS CI is scoped to `main` (so feature branches don't auto-build), or when Xcode isn't available on this machine.

Android drives 95% of the visual QA loop today — iOS is verified separately by whoever has a Mac.

## When to use

- Verifying a design/UI change before opening a PR.
- Reproducing an issue on a phone-shaped viewport.
- Screenshot evidence for a PR description.
- Sanity-checking that a feature actually mounts (not just compiles).

Not for: real-provider QA (Sleeper / Yahoo / ESPN OAuth), Play services flows, release-signed builds, iOS-specific rendering (SwiftUI-only screens still need Xcode).

## Prereqs (one-time)

- Android Studio installed (uses its bundled JBR for Java). Path: `C:/Program Files/Android/Android Studio/jbr`.
- Android SDK (bundled with Codex sandbox): `C:/Users/JDuve/AppData/Local/Packages/OpenAI.Codex_2p2nqsd0c76g0/LocalCache/Local/Android/Sdk`.
- `Medium_Phone` AVD already provisioned. `emulator -list-avds` should list it.
- `mobile/android/local.properties` sets `sdk.dir` to the Codex SDK path (already committed as the default; git-ignored file so change locally if you use a different SDK).

## The loop

Fastest path: run the helper script.

```bash
bash scripts/preview-android.sh
```

The script:

1. Exports `JAVA_HOME` to the Android Studio JBR.
2. Cold-boots the `Medium_Phone` AVD in the background (no snapshot — see "Gotchas").
3. Waits for `sys.boot_completed`.
4. Runs `./gradlew :app:assembleDebug` in `mobile/android`.
5. `adb install -r` the resulting APK.
6. `adb shell am start` on `com.slopssaloon.omen/.MainActivity`.
7. Prints the emulator ID so follow-up `adb` commands are unambiguous.

To reach the M4 Command Center from the SignedOut welcome screen, tap **Try Demo** (this calls `sessionManager.onDemo()` and bypasses Supabase auth). The signed-in shell lands on the `Command` tab by default.

## Screenshot for evidence

```bash
ADB="C:/Users/JDuve/AppData/Local/Packages/OpenAI.Codex_2p2nqsd0c76g0/LocalCache/Local/Android/Sdk/platform-tools/adb.exe"
"$ADB" exec-out screencap -p > screen.png
```

Drop the PNG in the PR body. Native resolution is 1080x2400.

## Gotchas

- **Cold boot matters.** Always pass `-no-snapshot` (the helper script does). Resumed snapshots have wedged HWUI/gfxstream state that renders the app as a blank white screen with no crash log — the app is fine, the GPU driver is not.
- **One emulator per AVD.** Booting a second `Medium_Phone` instance while the first is alive fails with "Running multiple emulators with the same AVD is an experimental feature." Kill the first with `powershell Stop-Process -Name emulator,qemu-system-x86_64 -Force`.
- **No Play services on this AVD.** Anything that hard-requires GMS (Firebase, Google Sign-In production flow) will short-circuit. `FakeAuthRepository` is the default in this build when `AppEnvironment.supabaseConfigured` is false — that's why Try Demo works out of the box.
- **iOS is not this loop.** `mobile/ios` is native SwiftUI and needs Xcode. Nothing about the CI cost fix changed that.
- **CI is not this loop either.** iOS/Android CI now runs only on `main`-targeted pushes and PRs (see [PR #186](https://github.com/justinduverge-design/omen/pull/186)). Feature-branch verification is local.

## Cleanup

Emulator keeps running after the script exits. To shut down:

```bash
"$ADB" -s emulator-5554 emu kill
```

Or close the emulator window.

## Related

- [`scripts/preview-android.sh`](../../scripts/preview-android.sh) — the helper script.
- [`Blueprints/playbooks/native-mobile-design-delivery-workflow-v1.md`](native-mobile-design-delivery-workflow-v1.md) — broader native workflow this slots into.
- [`Blueprints/specs/mobile/omen-native-mobile-foundation-v1.md`](../specs/mobile/omen-native-mobile-foundation-v1.md) — the design foundation the previewed screens implement.
