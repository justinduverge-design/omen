# Handoff — 2026-08-18 — O6: Native crash reporting, Android half

**Not deployed. Branch `claude/o6-android-crash-reporting`, not yet pushed.** Full findings and evidence: `Direction/reviews/2026-08-18-o6-android-crash-reporting.md`.

## Verdict

Android half proven end-to-end with a real deliberate crash, independently confirmed by the founder directly in the Sentry dashboard — not just inferred from client-side logs. **`O6` overall stays `BLOCKED`**: `Done when:` requires both platforms, and iOS is untouched, still gated on `TASK-R3-BUILD-iOS` (a founder-only Apple ID / App Store Connect action, unrelated to anything technical).

## Files changed

- **New:** `mobile/android/app/src/main/kotlin/com/slopssaloon/omen/app/crashreporting/SentryEnvelopeReporter.kt` — hand-rolled Sentry envelope sender, no SDK dependency.
- **New:** `mobile/android/app/src/test/kotlin/com/slopssaloon/omen/app/crashreporting/SentryEnvelopeReporterTest.kt` — 7 JVM unit tests on envelope construction.
- **Changed:** `mobile/android/app/src/main/kotlin/com/slopssaloon/omen/MainActivity.kt` — installs the crash handler first thing in `onCreate()`, chains to the previous handler afterward.
- **Changed:** `mobile/android/app/build.gradle.kts` — `OMEN_ANDROID_SENTRY_DSN` buildConfigField, resolved through the existing `cfg()` helper.
- **Changed:** `mobile/android/local.properties.example` — documents the new `omen.androidSentryDsn` key. The real value lives only in git-ignored `local.properties`, supplied directly by the founder — never committed, never agent-sourced.
- **New:** `Direction/reviews/2026-08-18-o6-android-crash-reporting.md` — full findings.
- **Changed:** `Direction/current_sprint.md` — O6 gets a 2026-08-18 evidence addendum; `Status` deliberately left `BLOCKED`.

## RED / GREEN

No classic RED — this is new functionality, not a bugfix. The real-world equivalent: the first live attempt against the real DSN *did* fail (`NetworkOnMainThreadException`), for a genuine reason unrelated to any assumption bug, and the fix is proven by a clean second run plus independent dashboard confirmation.

- Unit: `SentryEnvelopeReporterTest` 7/7.
- Build: `:app:assembleDebug` green.
- Real device (dry run, no DSN): crash trigger mechanism (`adb shell am crash`) confirmed to produce a real `FATAL EXCEPTION`, reporter's blank-DSN guard confirmed to no-op.
- Real device (live DSN, first attempt): `NetworkOnMainThreadException` — caught safely, crash still proceeded normally, but the event never sent. Root cause: an uncaught-exception handler runs on the thread that crashed, and Android's StrictMode forbids synchronous networking on the main thread. **A JVM unit test cannot catch this class of bug** — StrictMode doesn't exist off-device.
- Fix: network call moved to a dedicated background `Thread`, with `report()` blocking on `Thread.join(timeout)` so the process isn't torn down before the network attempt completes.
- Real device (live DSN, after fix): `Reported crash to Sentry, response code 200`, confirmed running on a distinct thread from main via PID/TID in logcat.
- **Independent confirmation:** founder checked the Sentry dashboard directly (`valor-ventures-llc` → Android project). `android.app.RemoteServiceException$CrashedByAdbException` / "shell-induced crash", tag `ANDROID-1`, 2 events, 0 users, first seen 2 minutes prior — timing and content match the triggered crash exactly.

## Skills

Invoked: native mobile read gate (re-checked, no conflict), `pre-build-research` (Sentry's current ingestion API verified before building — the store-endpoint format O1b proved against GlitchTip is documented deprecated for direct Sentry SaaS use), `slops-tdd` (unit tests before the real-device pass). No procedure gap found — both real bugs were caught by doing exactly what this playbook already asks: verifying on the real device rather than stopping at a green unit suite.

## Branch / commit / PR / deploy status

Local commit on `claude/o6-android-crash-reporting` (branched from `main`, independent of the separate `claude/s5-mobile-token-storage-review` branch), not yet pushed, no PR opened, nothing deployed.
