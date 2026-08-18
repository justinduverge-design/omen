# O6 — Native Crash Reporting: Android Half

**Date:** 2026-08-18
**Author:** Claude
**Scope:** Android half only. iOS half is untouched and remains gated on `TASK-R3-BUILD-iOS` (a signed build is needed for dSYM upload) — that gate is founder-only (Apple ID / App Store Connect credentials), not agent-buildable. `O6`'s overall `Status` stays `BLOCKED` because `Done when:` requires both platforms.
**Verdict:** Proven end-to-end with a real deliberate crash, independently confirmed in the Sentry dashboard.

## What O6 needed

Neither Kuma/Beszel (`O1`) nor GlitchTip (`O1b`) can see a native crash — a SwiftUI or Compose crash never touches KVM1, so every operational signal stays green while a tester's app dies on launch. `O6`'s `Done when:`: *a deliberate crash on iOS and on Android each appear in the error backend within 60 seconds, with symbolicated stack traces and no PII or token in the payload.*

## Where the DSN came from

The Android Sentry project (org `valor-ventures-llc`, per `O1b`'s ratified split-destination decision) was already provisioned before this session, but no DSN value existed anywhere in the repo — Sentry DSNs aren't secret in the way an API key is (write-only ingest identifier, safe to ship in a client binary), but there was still no way for an agent to read it from the Sentry dashboard. The founder supplied it directly; it now lives only in git-ignored `mobile/android/local.properties` (`omen.androidSentryDsn`), following the exact same pattern as `omen.supabaseUrl` and every other native client config value — never committed, never hardcoded.

## Wire format: envelope, not the legacy store endpoint

`O1b`'s proof against GlitchTip used the older `/api/PROJECT_ID/store/` endpoint with an `X-Sentry-Auth` header — GlitchTip accepts both for broad SDK compatibility. Checked Sentry's own current ingestion docs before building against Sentry SaaS directly (not GlitchTip): the `/store/` endpoint isn't in the current developer docs at all, and `sentry_timestamp`-based auth headers are explicitly documented as fully deprecated. Built against the current, documented shape instead — `POST /api/PROJECT_ID/envelope/`, `Content-Type: application/x-sentry-envelope`, DSN authentication embedded in the envelope header line rather than a separate auth header:

```
{"dsn":"<full dsn>","sent_at":"<ISO8601>"}
{"type":"event","length":<byte length of line 3>,"content_type":"application/json"}
{"event_id":"<32-hex>","timestamp":"...","platform":"android","level":"fatal","exception":{"values":[{"type":"...","value":"...","stacktrace":{"frames":[...]}}]}}
```

No Sentry SDK dependency — the same "direct HTTP integration over a new `build.gradle.kts` dependency" choice `O8` made for the backend half, avoiding the do-not-touch-package-files boundary entirely.

## Implementation

- [`SentryEnvelopeReporter.kt`](../../mobile/android/app/src/main/kotlin/com/slopssaloon/omen/app/crashreporting/SentryEnvelopeReporter.kt) — builds and sends the envelope for a given `Throwable`. Only code structure (exception type, message, stack frames — class/method/line) goes in the payload; no user data, provider token, or league identifier is ever touched, satisfying `O6`'s own boundary.
- [`MainActivity.kt`](../../mobile/android/app/src/main/kotlin/com/slopssaloon/omen/MainActivity.kt) — `installCrashReporter()`, called first thing in `onCreate()`, installs `Thread.setDefaultUncaughtExceptionHandler`, which reports then **chains to whatever handler was previously installed** so normal OS crash behavior (the "app has stopped" dialog, process teardown, Play's own vitals) is unaffected — this only observes, never intercepts or suppresses.
- `app/build.gradle.kts` — `OMEN_ANDROID_SENTRY_DSN` `buildConfigField`, resolved through the existing `cfg()` helper (env var → `local.properties` → blank). A blank DSN disables reporting entirely rather than sending anywhere, so this is safe by default on any machine without the value configured.
- No new UI surface. Verification used `adb shell am crash <package>` — a real OS-level forced crash — rather than adding a permanent debug-only trigger button; this exercises the actual installed handler with zero added app surface.

## Two real bugs found by testing on the actual device — not by reading the code

Both were caught because this was verified against the real emulator and a real Sentry endpoint, not assumed from the implementation alone.

1. **`NetworkOnMainThreadException` on the first live attempt.** An uncaught exception on the main thread is *handled* on the main thread, and Android's StrictMode forbids a synchronous network call there. The first real crash threw this immediately, was caught by the reporter's own `try/catch` (so the actual crash still proceeded normally — nothing was masked), but the event never left the device. **This is a class of bug a JVM unit test structurally cannot catch** — StrictMode doesn't exist off-device, so all 7 envelope-construction unit tests passed cleanly both before and after this bug existed. Fixed by moving the network call to a genuinely separate `Thread`, with the crash handler blocking on `Thread.join(timeout)` so the process isn't torn down before that thread gets a chance to finish. Confirmed fixed by distinct PID/TID in the retry's logcat (`6695`/`6766` — different thread) versus the failing attempt (`6284`/`6284` — same thread, i.e. main).
2. **Silent success is indistinguishable from silent failure without a success log.** The reporter only logged on the `catch` path initially, so a clean run produced zero log output — consistent with success, but not proof of it. Added a success-path log recording the HTTP response code, which is what actually produced the `response code 200` evidence below.

## Evidence

- **Unit:** `SentryEnvelopeReporterTest` 7/7 (`app/src/test`, pure JVM — envelope shape, item-header byte-length accuracy, exception type/message capture, null-message handling, special-character escaping, no-user-data stack frames). Regression coverage for the payload-construction logic; cannot and does not cover the threading bug above by design (see finding #1).
- **Build:** `:app:assembleDebug` green throughout, including after both fixes.
- **Real device, dry run (before a DSN was available):** `adb shell am crash com.slopssaloon.omen` confirmed to produce a genuine `FATAL EXCEPTION: main` / `CrashedByAdbException`, process confirmed terminated, reporter's blank-DSN guard confirmed to no-op cleanly.
- **Real device, live DSN, first attempt:** `NetworkOnMainThreadException`, caught, crash still proceeded normally, event not sent — see finding #1.
- **Real device, live DSN, after the threading fix:** no reporter error logged; process took slightly longer to tear down (ActivityManager binder-freeze timeout, expected for a process holding an active background thread) but was confirmed gone within 10s.
- **Real device, live DSN, final confirming run:** `SentryEnvelopeReporter: Reported crash to Sentry, response code 200`, on a distinct thread from main (`6766` vs main `6695`) — crash triggered 2026-08-18 21:33:14 UTC, response logged the same second.
- **Independent confirmation — the founder checked the Sentry dashboard directly** (I have no read access to Sentry myself): `valor-ventures-llc` → Android project → Issues feed shows `android.app.RemoteServiceException$CrashedByAdbException` / "shell-induced crash", tag `ANDROID-1`, culprit `android.app.ActivityThread in throwRemoteServiceException` (matches the actual crash site), first seen 2 minutes prior, **2 events** (both successful send attempts — the silent-success run and the explicitly-logged run both landed), **0 users** — confirming no PII/identifier was attached, consistent with the payload design.

## Symbolication note

This proof used an unminified debug build, so `frame.className`/`frame.methodName`/`frame.lineNumber` are already real, human-readable values — no ProGuard/R8 mapping upload was needed to satisfy "symbolicated" here. The `O1b` comparison memo flagged Android ProGuard/R8 mapping upload to GlitchTip as an *unresolved* risk; that risk is specific to a *minified release* build and to GlitchTip specifically, and doesn't apply to this debug-build proof against Sentry SaaS. Release-build symbolication (mapping file upload) is separate, unstarted work if/when this needs to prove itself against a minified build.

## What's still open

- **iOS half** — untouched, gated on `TASK-R3-BUILD-iOS`.
- **Release-build (minified) symbolication** — not proven; this pass used a debug build.
- **`O8`** (wire GlitchTip into real backend error paths) is separate, unrelated work — this item only touches the Android *client's own* crashes, not backend errors.

## Skill receipt

```text
Task: O6 — native crash reporting, Android half
Change type: New feature (native), security-adjacent (crash payload boundary)
Skills invoked: native mobile read gate (re-checked for Sentry/crash-specific guidance in
  omen-native-app-shell-auth-api-contract-v1.md §8 and omen-native-delivery-governance-v1.md —
  both already-known boundaries, no conflict found), pre-build-research (verified Sentry's
  current ingestion API before building against it, given O1b's proven format targeted a
  different backend), slops-tdd (envelope-construction unit tests before the real-device pass)
Conditional skills considered but not applicable: security-privacy-evidence as a standalone
  artifact — folded into this review doc instead, matching the S5 precedent
Evidence: this file; Blueprints/handoffs/2026-08-18-o6-android-crash-reporting.md
Procedure gap found: none — the two real bugs found were caught by exactly the discipline this
  playbook already asks for (verify on the real device, don't stop at a green unit suite)
```
