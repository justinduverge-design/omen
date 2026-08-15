# Omen — App Store & Play Console Reviewer Notes v1

**Status:** Ready to paste. Not yet submitted — store submission is founder-gated.
**Date:** 2026-07-27. **Reconciled 2026-08-05** — Discord shipped (#198), UGC answer corrected for public trade-share, stale billing/E1 gates cleared, Draft Assistant cut recorded.
**Companion:** `omen-store-privacy-and-rating-answers-v1.md` — R4 privacy labels and R5 age-rating answers.
**Applies to:** iOS (App Store Connect → App Review Information → Notes) and Android (Play Console → App content → App access)
**Bundle / application id:** `com.slopssaloon.omen`
**iOS embedded extension (from `M7-EspnSafariExtension`):** `com.slopssaloon.omen.espnconnect` — Safari Web Extension, team `6RWR5G9894`

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

Sign-in options (not required for review): Sign in with Apple, Discord, email
one-time passcode. Sign in with Apple is offered wherever any third-party
sign-in is offered.

Users may share a trade-comparison summary via a public link that expires
after 30 days. Sharing is optional, the input is limited to trade selections,
and there is no free text, image upload, profile, comment, or user-to-user
messaging anywhere in the app.

Account deletion: available in-app under Account. Demo Mode has no account to
delete, so the option is correctly hidden in that state.

Omen is free. There are no purchases, subscriptions, or paywalls anywhere in
the app.
```

---

## PASTE BLOCK addition — App Store Connect "Notes", Safari extension

**Paste this only once `M7-EspnSafariExtension` actually ships in the build being submitted.** If the extension is not in the binary, leave it out entirely — describing a feature that is not there is its own rejection risk.

```text
ABOUT THE INCLUDED SAFARI EXTENSION ("Omen ESPN Connect")

You do not need to use it to review the app. Demo Mode covers the full review
path and requires no account and no fantasy league.

Why it exists:
ESPN Fantasy has no public OAuth API. The only way a user can authorize Omen to
read their ESPN league is by supplying two of their own ESPN session cookies.
Those cookies are HttpOnly, so an ordinary web page cannot read them - which is
precisely why this is a browser extension rather than a web form.

What it does:
1. The user signs in to ESPN in Safari, as they normally would.
2. The user taps the extension, which reads only their own espn_s2 and SWID
   cookies for espn.com, after Safari's own per-site permission prompt.
3. It fills those values into Omen's connect form.
4. The USER taps Omen's own Connect button. The extension never submits on the
   user's behalf.

What it does not do:
- It makes no network request of its own. It has no server and no analytics.
- It reads no site other than espn.com.
- It never displays, logs, or stores those cookie values beyond the moment
  needed to fill the form, and it clears them immediately afterward.
- It holds no App Groups and shares no data with the Omen app.

The user can disable it at any time in Safari settings without affecting the
rest of the app.
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

Sign-in (Google, Discord, email one-time passcode) is optional and only needed
to connect a real fantasy league. Reviewers do not need to do this.

Users may share a trade-comparison summary via a public link that expires
after 30 days. Sharing is optional, input is limited to trade selections, and
there is no free text, image upload, profile, comment, or user-to-user
messaging anywhere in the app.

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
| Third-party login providers | Google (Android), Sign in with Apple (iOS), Discord (both platforms), email one-time passcode. All optional. |
| What data is collected? | Fantasy league and roster data for connected leagues only, plus an account identifier. No data is collected in Demo Mode. Full declarations: `omen-store-privacy-and-rating-answers-v1.md`. |
| Does the app provide gambling or wagering? | No. Omen makes fantasy roster recommendations. There is no betting, wagering, odds, entry fee, prize pool, cash-out, or real-money contest functionality. This is a standing product boundary recorded in `Direction/decision_log.md` (2026-08-02), not temporary launch copy. |
| Is user-generated content shown? | **Limited and bounded.** Users can generate a trade-comparison summary and share it via a public link that expires after 30 days (`POST /api/trade/share`). Input is constrained to trade selections — no free text, no image upload, no profile, no comments, and no user-to-user messaging. Nothing another user creates is displayed inside the app. |

## Pre-submission checklist

Do not submit until every line is checked. Several are still gated.

- [x] ~~**Actions billing restored**~~ — **retracted 2026-08-05.** The "billing hold" was a misdiagnosis; CI was failing on two config bugs, both fixed in #250. Not a gate.
- [ ] Demo Mode verified on a real device, both platforms, from a **cold install** — the reviewer's exact path
- [ ] "Try Demo" is visible without scrolling on the smallest supported screen (iPhone SE)
- [ ] Every demo screen shows its mock/sample label
- [ ] Account deletion verified end-to-end on a real device (M3A-QA — founder-gated)
- [ ] Privacy policy and support URLs resolve publicly
- [ ] Data safety form (Play) and privacy nutrition labels (Apple) match actual collection
- [ ] Screenshots captured from Demo Mode, not from a real connected league
- [ ] No screenshot, log, or asset contains an ESPN cookie, provider token, real league id, or real username
- [x] ~~E1 mobile-scope decision resolved; E2 closeout opened~~ — **resolved 2026-08-05.** Both platforms ship the beta together; store work is now lane **R** in `Direction/current_sprint.md`, which supersedes E2/E3.
- [ ] **Draft Assistant removed from all metadata** — cut from 1.0 on 2026-08-05 (**R7**). Advertising it would be a false claim.
- [ ] Store listing name is `Omen — Fantasy Football Tool`; in-app/product name remains **Omen**. Do not conflate them.

## Standing constraints this document must respect

- Demo and mock data is labeled and never presented as live advice (`Direction/facts-of-record.md` #7).
- ESPN cookie values never appear in any artifact, including screenshots and reviewer notes.
- Store submission, signing, and provider configuration remain founder-gated. This document is preparation only.
