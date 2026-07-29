# Omen — App Store & Play Console Reviewer Notes v1

**Status:** Ready to paste. Not yet submitted — E2 app-store closeout remains gated.
**Date:** 2026-07-27
**Applies to:** iOS (App Store Connect → App Review Information → Notes) and Android (Play Console → App content → App access)
**Bundle / application id:** `com.slopssaloon.omen`

## Why Omen does not supply a demo account

Reviewers are **not** required to sign in. Omen exposes a labeled Demo Mode reachable from the first screen, before any authentication.

This is deliberate. A demo *account* is the single most common source of review rejection — credentials expire, one-time-passcode inboxes are unreachable by a reviewer, and passwords rotate between submission and review. Demo Mode removes all of it: there is nothing to expire and nothing to type.

Implementation, for our own reference — do not paste into the store fields:

- Android — `OmenAndroidApp.kt:197`, `OmenButton(text = "Try Demo")` → `SessionManager.onDemo()`
- iOS — `AppShellView.swift:28`, `onTryDemo` → `SessionManager.onDemo()`
- Both enter a `demo-local` session with no stored credentials and no real user data. Contract: M0c §6.

---

## PASTE BLOCK — App Store Connect "Notes"

```text
NO SIGN-IN REQUIRED FOR REVIEW.

On the first screen, tap "Try Demo". This opens the full app populated with
clearly-labeled sample data. No account, password, or verification code is
needed.

What Omen does:
Omen is a fantasy football decision assistant. It connects to a user's existing
fantasy league (Sleeper, ESPN, or Yahoo) and recommends one move per week —
a lineup change or a waiver-wire pickup — with plain-English reasoning, the
risk involved, and how confident the app is.

What you will see in Demo Mode:
- Command Center: the weekly decision summary
- Omen: the full recommendation with reasoning, risk, and confidence
- League, Trade, and account screens

All demo content is sample data and is labeled as such in the interface.
Player names are generic ("Sample QB Starter") specifically so that demo output
can never be mistaken for real fantasy advice.

Sign-in options (not required for review): Sign in with Apple, email one-time
passcode. Sign in with Apple is offered wherever any third-party sign-in is
offered.

Account deletion: available in-app under Account. Demo Mode has no account to
delete, so the option is correctly hidden in that state.

Omen is free. There are no purchases, subscriptions, or paywalls anywhere in
the app.
```

---

## PASTE BLOCK — Play Console "App access"

Select **"All or some functionality is restricted"**, then add one instruction set:

```text
Instruction name: Demo Mode (no credentials required)

Any other instructions:
No sign-in is required to review this app. On the first screen, tap "Try Demo".
This opens the full app with clearly-labeled sample data. No username,
password, or verification code is needed.

Sign-in (Google, email one-time passcode) is optional and only needed to
connect a real fantasy league. Reviewers do not need to do this.

All demo content is sample data and is labeled in the interface. Player names
are generic so demo output cannot be mistaken for real fantasy advice.

Account deletion is available in-app under Account, and a public deletion page
is linked from the store listing.
```

---

## Supporting answers reviewers commonly ask

| Question | Answer |
|---|---|
| Does the app require an account? | No. Demo Mode is reachable before sign-in. |
| Is there a paywall or IAP? | No. Omen is free indefinitely — no purchases, subscriptions, or restricted features. |
| Apple guideline 4.8 (Sign in with Apple) | Satisfied. SIWA is present on iOS alongside any other third-party sign-in. |
| Account deletion (Apple 5.1.1(v) / Play Data safety) | In-app under Account, plus a public deletion page. Confirmation phrase is required before deletion completes. |
| Third-party login providers | Google (Android), Sign in with Apple (iOS), email one-time passcode, Discord (pending). All optional. |
| What data is collected? | Fantasy league and roster data for connected leagues only, plus an account identifier. No data is collected in Demo Mode. |
| Does the app provide gambling or wagering? | No. Omen makes fantasy roster recommendations. There is no betting, wagering, odds, or real-money contest functionality. |
| Is user-generated content shown? | No. |

## Pre-submission checklist

Do not submit until every line is checked. Several are still gated.

- [ ] **Actions billing restored** — release builds run through CI (~2026-08-01)
- [ ] Demo Mode verified on a real device, both platforms, from a **cold install** — the reviewer's exact path
- [ ] "Try Demo" is visible without scrolling on the smallest supported screen (iPhone SE)
- [ ] Every demo screen shows its mock/sample label
- [ ] Account deletion verified end-to-end on a real device (M3A-QA — founder-gated)
- [ ] Privacy policy and support URLs resolve publicly
- [ ] Data safety form (Play) and privacy nutrition labels (Apple) match actual collection
- [ ] Screenshots captured from Demo Mode, not from a real connected league
- [ ] No screenshot, log, or asset contains an ESPN cookie, provider token, real league id, or real username
- [ ] E1 mobile-scope decision resolved; E2 closeout opened

## Standing constraints this document must respect

- Demo and mock data is labeled and never presented as live advice (`Direction/facts-of-record.md` #7).
- ESPN cookie values never appear in any artifact, including screenshots and reviewer notes.
- Store submission, signing, and provider configuration remain founder-gated. This document is preparation only.
