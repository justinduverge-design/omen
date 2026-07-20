# M3-A — Interactive Real-Device Auth QA Runbook

**Status:** Ready for founder/manual QA — 2026-07-19
**Why manual:** interactive Google sign-in requires signing a real Google account into the device, and email-OTP requires reading a code from a real inbox. Agents must not enter Google/account credentials (hard prohibition) or read a personal inbox, so this pass is founder- or human-QA-run. The Android code, unit tests, build, and zero-side-effect connectivity smoke are already green (see `Blueprints/handoffs/2026-07-19-m3a-native-auth-scaffolding.md`).

## 0. One-time: Google Play emulator

The default `Medium_Phone` AVD is an AOSP image with **no Google Play services**, so Credential Manager Google sign-in cannot run there. A Play-services system image is installed (`system-images;android-37.1;google_apis_playstore_ps16k;x86_64`). Create a Play AVD:

```bash
SDK="$HOME/AppData/Local/Packages/OpenAI.Codex_2p2nqsd0c76g0/LocalCache/Local/Android/Sdk"
"$SDK/cmdline-tools/latest/bin/avdmanager" create avd -n Omen_Play \
  -k "system-images;android-37.1;google_apis_playstore_ps16k;x86_64" -d pixel_7
# boot:
"$SDK/emulator/emulator.exe" -avd Omen_Play
```

(Or in Android Studio → Device Manager → Create device → pick a Play-store-enabled image.) Then **Settings → Accounts → Add account → Google** and sign in with a test Google account. This account sign-in is the human step an agent cannot perform.

## 1. Build & install

```bash
cd mobile/android && ./gradlew :app:assembleDebug
"$SDK/platform-tools/adb.exe" install -r app/build/outputs/apk/debug/app-debug.apk
```

Confirm `local.properties` has real `omen.supabaseUrl`, `omen.supabaseAnonKey`, `omen.googleWebClientId` (already set) and — for account-deletion testing — a real `omen.apiBaseUrl` (currently the placeholder `https://example.invalid`; set to the KVM1 API base only when you intend live delete calls).

## 2. Cases to verify (from M0a §9 / M0c)

| # | Flow | Expected |
|---|---|---|
| 1 | Google sign-in success | Credential Manager sheet → account picker → lands on Command Center "Signed in as …"; session persists across app kill/relaunch (Keystore restore) |
| 2 | Google sign-in cancel | dismiss the sheet → "Sign-in canceled" message, no crash, returns to auth |
| 3 | Email OTP request | enter a real inbox address → "Enter the 6-digit code sent to …"; **check the inbox for the email** |
| 4 | Email OTP verify | enter the emailed code → Command Center; wrong code → "That code didn't match" |
| 5 | Session restore | kill app, relaunch → no re-login (until token expiry), then `NeedsReauth` prompt after expiry |
| 6 | Account deletion (needs real `apiBaseUrl`) | signed-in → Delete account → type `DELETE MY OMEN DATA` → success → signed out; wrong phrase → button disabled / "must exactly match" |
| 7 | Demo path | Try Demo → Command Center with **no** Delete-account button (demo is isolated) |

## 3. Security checks (must all pass)

- `adb logcat | grep -iE "token|bearer|id_token|refresh"` during sign-in → **no token/cookie values** in logs.
- Screenshots for evidence must not show token strings.
- Confirm no secret is written to `SharedPreferences` in cleartext (session prefs are Keystore-encrypted ciphertext only).

## 4. Record

Capture device, build, app version, per-case result, and any state deviation into a dated QA note or `06 — QA & Evidence` in the Figma Design House. File any failure as a bug; do not mark the Google/OTP path "ready" without this pass (delivery governance §5).
