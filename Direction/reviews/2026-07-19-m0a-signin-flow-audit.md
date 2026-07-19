# M0a — Sign-in Flow Audit & Reference Recommendations

**Date:** 2026-07-19
**Author:** Claude (frontend/spec lane)
**Scope:** The Omen-account sign-in path defined in `Blueprints/specs/mobile/omen-mobile-onboarding-connection-contract-v1.md` (§4.2, §5 Yahoo, §6, §7, §8). Companion to `2026-07-19-m0a-onboarding-connection-contract-review.md`.
**Nature:** Research + audit only. No code, deploy, secret, or provider behavior touched. References verified against current primary docs on 2026-07-19.

---

## 1. Flow under audit

Welcome → **Omen account** (iOS: Sign in with Apple first, email/magic-link fallback; Android: Google Credential Manager first, email/magic-link fallback) → **auth return via registered deep links** → **session restore** (independent from provider sync). The Yahoo provider OAuth return (§5) shares the deep-link mechanism and is included where it intersects sign-in.

## 2. What is already correct (keep)

- Demo reachable **before** any sign-in (also serves App Review).
- No ESPN password/cookie collection; no secret/token in view state, logs, screenshots, or analytics.
- Session restore kept **independent** from provider sync.
- Explicit "never embed the login in an unsafe fake web view."
- Native-first intent (Apple / Google) with an email fallback.

## 3. Findings — thin spots and the reference that strengthens each

### A. Sign in with Apple is "first," should be "required-if-Google-offered"
The contract frames SIWA as the first option on iOS. App Store Review Guideline **4.8** requires that any app offering a third-party/social login (e.g., Google) to establish the primary account **must also offer** an equivalent like Sign in with Apple. Since Omen intends Google on Android and likely cross-offers, SIWA becomes mandatory on iOS, not merely preferred.
- **Refs:** [App Store Review Guidelines §4.8](https://developer.apple.com/app-store/review/guidelines/) · [New Guidelines for Sign in with Apple](https://developer.apple.com/news/?id=09122019b)
- **Fix:** state SIWA as required on iOS whenever any third-party login is offered.

### B. "Google sign-in" wording targets a deprecated SDK
The legacy Google Sign-In for Android (`play-services-auth`) is deprecated and being removed. The supported path is **Credential Manager** (unifies passkey, password, and Sign in with Google).
- **Refs:** [Migrate from legacy Google Sign-In](https://developer.android.com/identity/sign-in/legacy-gsi-migration) · [Sign in with Google via Credential Manager](https://developer.android.com/identity/sign-in/credential-manager-siwg) · [Credential Manager overview](https://developer.android.com/identity/credential-manager)
- **Fix:** replace "Google Credential Manager / Google sign-in" with "Credential Manager (Sign in with Google)."

### C. One fuzzy "OAuth + deep link" idea is actually three mechanisms
The contract treats all auth as browser-redirect-with-deep-link-return. Supabase supports a **native ID-token** flow for Apple/Google with **no browser redirect at all** (smoother, safer). Only Yahoo (no native SDK) needs the browser redirect + deep-link return.
- **Refs:** [Supabase native mobile auth (Apple/Google ID token)](https://supabase.com/blog/native-mobile-auth) · [Supabase native mobile deep linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking)
- **Fix:** specify three distinct mechanisms (see §4).

### D. Yahoo OAuth names the anti-pattern but not the correct pattern
"No fake web view" is right, but the contract does not name the required mechanism. RFC 8252 mandates the **system browser via in-app browser tab**: `ASWebAuthenticationSession` (iOS) / Chrome Custom Tabs (Android), with **PKCE**.
- **Refs:** [RFC 8252 — OAuth 2.0 for Native Apps](https://datatracker.ietf.org/doc/html/rfc8252) · [oauth.net native apps](https://oauth.net/2/native-apps/)
- **Fix:** require `ASWebAuthenticationSession` / Custom Tabs + PKCE for Yahoo, and forbid embedded WebView explicitly by name.

### E. Email magic link is a fragile mobile fallback
Magic links can open in a different browser/app than the one that started sign-in, breaking the PKCE session. **Email OTP (6-digit code)** avoids the cross-app deep-link failure and is the more reliable mobile fallback.
- **Refs:** [Supabase native mobile deep linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking)
- **Fix:** change the email fallback from "magic link" to "email OTP code," or support both with OTP as the default on mobile.

### F. Session restore has no secure-storage reference
"Session restore" is specified behaviorally but not where the session lives. Tokens must sit in **Keychain** (iOS) / **Keystore-backed** storage (Android), never plain files or unencrypted prefs.
- **Refs:** [Android Credential Manager](https://developer.android.com/identity/credential-manager) (+ Apple Keychain Services)
- **Fix:** add a one-line secure-storage requirement to §7.

### G. Sign-in creates accounts, which triggers Apple's in-app deletion rule
An app that supports account creation must let users **delete the account from within the app** (Guideline 5.1.1). The web product already has "DELETE MY OMEN DATA"; the native app must expose an equivalent.
- **Refs:** [App Store Review Guidelines §5.1.1](https://developer.apple.com/app-store/review/guidelines/)
- **Fix:** note native in-app account deletion as a release-gate requirement tied to the existing web flow.

### H. Confirm demo = the App Review path
Demo-before-auth is good; make it explicit that Demo Mode **is** the reviewer's no-credentials path.
- **Refs:** [Apple app review](https://developer.apple.com/distribute/app-review/)
- **Fix:** one line stating Demo Mode satisfies the App Review demo requirement.

## 4. Recommended structural change (the big one)

Split the single "OAuth + deep link" concept into three named mechanisms so each is specified and testable:

| Mechanism | Providers | Pattern | Deep link needed? |
|---|---|---|---|
| Native ID-token | Apple, Google | Native sheet → ID token → Supabase `signInWithIdToken` | No |
| System-browser OAuth | Yahoo | `ASWebAuthenticationSession` / Custom Tabs + PKCE → deep-link return | Yes |
| Email fallback | Email | Email **OTP code** entry (preferred over magic link on mobile) | No |

This resolves findings C, D, and E together and gives M0c a precise API/auth contract to implement.

## 5. Curated reference set (primary sources only)

**Apple**
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) — §4.8 (login services), §5.1.1 (account deletion)
- [Sign in with Apple guidelines](https://developer.apple.com/news/?id=09122019b)
- [Onboarding HIG](https://developer.apple.com/design/human-interface-guidelines/onboarding) · [Managing accounts HIG](https://developer.apple.com/design/human-interface-guidelines/managing-accounts)
- [App review / demo path](https://developer.apple.com/distribute/app-review/)

**Android / Google**
- [Credential Manager overview](https://developer.android.com/identity/credential-manager)
- [Sign in with Google via Credential Manager](https://developer.android.com/identity/sign-in/credential-manager-siwg)
- [Legacy Google Sign-In migration](https://developer.android.com/identity/sign-in/legacy-gsi-migration)
- [Android onboarding guidance](https://developer.android.com/design/ui/mobile/guides/patterns/onboarding) · [Android quality](https://developer.android.com/quality/user-experience)

**Protocol / backend**
- [RFC 8252 — OAuth 2.0 for Native Apps](https://datatracker.ietf.org/doc/html/rfc8252) · [oauth.net native apps summary](https://oauth.net/2/native-apps/)
- [Supabase native mobile auth (Apple/Google ID token)](https://supabase.com/blog/native-mobile-auth)
- [Supabase native mobile deep linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking)

## 6. Effect on the mobile program

- Findings **A, B, G, H** → strengthen the M0a contract wording now (small edits, no design change).
- Findings **C, D, E, F** and §4 → belong in **M0c** (app-shell/auth/API contract) as the concrete auth spec.
- None of these change the product shape Justin approved; they make it App-Store-safe and secure.

## 7. Founder decision recorded

- **Canonical product promise:** "See the move before the league does." (Justin, 2026-07-19). The mobile contract §4.1 wording stands; the shipped web `Landing.jsx` line "See the result before it happens." becomes the one to realign when web work resumes (currently paused under the native pivot).
