# M3A-QA — Native Auth Interactive Real-Device QA Matrix

**Date:** 2026-08-01
**Authority:** ATA-20260801-04 — sanitized QA matrix/checklist preparation only. No real device, no real credentials, no account actions performed by this pass.
**Why this can't be agent-run:** requires a physical iOS device with a real Apple ID and a physical/emulated Android device with real Google account access — genuinely yours to run, not delegable. This document is the checklist so you don't have to reconstruct scope from the specs yourself.

**Sources:** `Direction/current_sprint.md` M3A-QA done-when; `Blueprints/specs/mobile/omen-mobile-onboarding-connection-contract-v1.md` §5 (provider policy), §6 (connection state machine), §9 (acceptance test matrix); `Blueprints/specs/mobile/omen-native-mobile-foundation-v1.md` §12 (mobile DoD).

**Partial evidence update — 2026-08-12:** the founder observed the real native Apple authorization sheet, completed authorization, and Omen reached authenticated state on the physical iPhone. This proves the core happy path but does not, by itself, prove whether the account was fresh versus returning or satisfy A2–A6, so no scenario row is silently marked Pass. Complete those rows deliberately without recording identity/token values.

## Safety rules — read before starting

- **Never** paste a real OTP code, session token, Apple/Google identity token, or password into a screenshot, log excerpt, or this matrix's notes. Record pass/fail and behavior only.
- If you need to capture a screenshot for a bug report, crop or redact any account email/name before saving it anywhere shared.
- "Log safety" checks below mean: open the device console (Xcode console for iOS, `adb logcat` for Android) during the flow and confirm no token/credential value appears in plaintext — not that logging is silent.

## A. iOS — Sign in with Apple

| # | Scenario | Steps | Expected | Pass/Fail | Notes |
|---|---|---|---|---|---|
| A1 | Fresh install, new account | Install app → Welcome → Get started → Sign in with Apple | Native Apple sheet appears (not a WebView); after Apple auth, app returns to a signed-in state without manual copy/paste | | |
| A2 | Existing account, return sign-in | Sign out (or fresh install with the same Apple ID) → Sign in with Apple again | Signs in immediately, no duplicate account created | | |
| A3 | Cancel mid-flow | Start Sign in with Apple → cancel at the system sheet | Returns to Welcome/sign-in screen cleanly; no error state, no crash | | |
| A4 | Background during auth | Start Sign in with Apple → background the app before completing → foreground again | Either resumes cleanly or safely resets to a retryable state; never stuck on an indefinite spinner | | |
| A5 | App termination during return | Start Sign in with Apple → force-quit the app before the callback returns | Relaunching the app does not show a corrupted/partial session; safe to retry from Welcome | | |
| A6 | Log safety | Repeat A1 with Xcode console open | No Apple identity token, email, or session value appears in plaintext console output | | |

## B. iOS / Android — Email OTP fallback

| # | Scenario | Steps | Expected | Pass/Fail | Notes |
|---|---|---|---|---|---|
| B1 | Fresh install, OTP path | Welcome → Get started → choose email OTP instead of Apple/Google | Enter email → receive OTP code (not a magic link) → enter code → signed in | | |
| B2 | Wrong code | Enter an intentionally wrong OTP code | Clear error state, retry allowed, no lockout on first wrong attempt | | |
| B3 | Expired/stale code | Wait past the code's expiry window, then enter it | Named "expired" error, safe path to request a new code | | |
| B4 | No network | Airplane mode on before submitting email | Clear network-error state, not an indefinite spinner | | |
| B5 | Log safety | Repeat B1 with console open | OTP code itself never appears in plaintext console output | | |

## C. Android — Google Sign-In (Credential Manager)

**Confirm before starting:** the app uses Android's **Credential Manager** API, not the deprecated legacy Google Sign-In SDK (per `omen-mobile-onboarding-connection-contract-v1.md` §4). If you see the old-style Google button/flow, that's a finding on its own — flag it, don't just proceed.

| # | Scenario | Steps | Expected | Pass/Fail | Notes |
|---|---|---|---|---|---|
| C1 | Fresh install, new account (needs Play services) | Install on an AVD/device **with Google Play services** (per the known constraint that the Codex-sandbox Medium_Phone AVD lacks Play services — use a real device or a Play-services-enabled AVD) → Get started → Google sign-in | Native Credential Manager account picker appears; after selection, signed-in state reached | | |
| C2 | Existing account, return sign-in | Repeat with the same Google account | Signs in immediately, no duplicate account | | |
| C3 | Cancel mid-flow | Start Google sign-in → dismiss the account picker | Returns cleanly to sign-in screen | | |
| C4 | No Play services available | If testing on a device/AVD without Play services | Confirm what actually happens — should be a named unsupported/fallback state, not a silent crash. **This is worth checking explicitly** since the dev-machine AVD is known to lack Play services. | | |
| C5 | Log safety | Repeat C1 with `adb logcat` running | No Google ID token or account identifier appears in plaintext logcat output | | |

## D. Session restore (both platforms)

| # | Scenario | Steps | Expected | Pass/Fail | Notes |
|---|---|---|---|---|---|
| D1 | Kill and relaunch | Sign in successfully → force-quit the app → relaunch | Restores to signed-in state without re-prompting for auth | | |
| D2 | Expired session | Sign in → wait out or otherwise invalidate the session server-side (if you have a safe way to do this) → relaunch | Detects the expired session and returns to a clear re-auth prompt, not a broken/blank screen | | |
| D3 | Airplane-mode relaunch | Sign in → enable airplane mode → force-quit → relaunch | Local UI renders before remote work begins (per foundation §"Reliability contract"); doesn't hang on a blank screen waiting for network | | |

## E. Account deletion (both platforms)

**Confirmation phrase must be exactly** `DELETE MY OMEN DATA` (per `Blueprints/specs/mobile/omen-mobile-onboarding-connection-contract-v1.md` §10 store-compliance note). Do this on a genuinely disposable/test account, not your primary one.

| # | Scenario | Steps | Expected | Pass/Fail | Notes |
|---|---|---|---|---|---|
| E1 | Full deletion flow | Sign in → navigate to account deletion → enter confirmation phrase → confirm | Requires the exact phrase (typos rejected); on success, account is deleted and app returns to a signed-out state | | |
| E2 | Wrong phrase | Enter a near-miss phrase (wrong case, missing word) | Rejected, no deletion occurs | | |
| E3 | Cancel before confirming | Start deletion flow, back out before entering the phrase | No deletion occurs, account remains intact | | |

## F. Cross-cutting — accessibility and device matrix

Run at minimum flows A1, B1, C1, and E1 across this matrix:

| | Compact phone (iPhone SE-class / Pixel-6a-class) | Large phone (iPhone Pro Max-class / large Android) |
|---|---|---|
| VoiceOver / TalkBack on | | |
| Large text / Dynamic Type at max | | |

## What "done" looks like for this task

Per `Direction/current_sprint.md` M3A-QA done-when: Android proves Google sign-in + email OTP + session restore + account deletion + log safety; iOS proves Sign in with Apple + email OTP + session restore + account deletion + log safety. Fill in every Pass/Fail cell above (or mark N/A with a reason), and write the result as a **sanitized** evidence record — no real credentials, tokens, or account-specific data in whatever you save.

## What did NOT happen in this pass

No device was used. No real Apple ID, Google account, or OTP code was involved. This is the checklist only — you run it when you have device time.
