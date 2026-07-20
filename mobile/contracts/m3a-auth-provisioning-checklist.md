# M3-A — Auth Provisioning Checklist (Founder actions)

**Status:** ✅ Provisioned + live-wired — 2026-07-19. Supabase URL + anon key + Email/OTP + Google Web client ID (`40496165411-…`) all provisioned; the Web client ID is in Supabase Google "Client IDs". Android live auth (`SupabaseAuthRepository` + `CredentialManagerGoogleIdTokenProvider`) is wired and build-verified. Remaining is real-device interactive proof (Play-services Google account / real inbox) + iOS — see `Blueprints/handoffs/2026-07-19-m3a-native-auth-scaffolding.md`.
**Owner:** Justin (external dashboards); agent builds native code once public values returned.
**Scope:** Supabase auth config + Google OAuth client + (later) Apple. No secret is committed to the repo — the client ships only *public* config (Supabase URL, anon key, OAuth client IDs).

Grounded in `omen-native-app-shell-auth-api-contract-v1.md` (M0c §2–§3) and `omen-mobile-onboarding-connection-contract-v1.md` (§4.2).

---

## Values the agent needs back (all public / non-secret)

| # | Value | Where you get it |
|---|---|---|
| 1 | **Supabase Project URL** (`https://<ref>.supabase.co`) | Supabase → Project Settings → API |
| 2 | **Supabase anon / public key** (`anon` `public`, NOT `service_role`) | Supabase → Project Settings → API |
| 3 | **Google OAuth *Web* client ID** (`…apps.googleusercontent.com`) | Google Cloud Console (step B) |

> ⚠️ Do **not** paste the `service_role` key, any OAuth **client secret**, or the Supabase JWT secret. Those stay in the Supabase/Google dashboards only. If you paste one by accident, rotate it.

Pre-generated for you (local, safe):
- **Android package name:** `com.slopssaloon.omen`
- **Debug keystore SHA-1:** `F0:85:1A:13:EE:DC:D7:8E:C8:71:4F:F8:F7:CA:89:05:AC:F0:C0:37`
- **Deep-link scheme (M0c §3):** `com.slopssaloon.omen://` — callback `com.slopssaloon.omen://auth/callback`, verify `com.slopssaloon.omen://auth/verify`

---

## A. Supabase — auth configuration

1. Open the Supabase project used by Omen (same project the web app/API uses).
2. **Authentication → Providers → Email:** ensure Email is enabled. Turn **"Confirm email"** on; we use **OTP code**, so no magic-link dependency. (Optional: set OTP length 6, expiry ~10 min.)
3. **Authentication → Providers → Google:** enable it. Paste the Google **Web client ID** and **Web client secret** from step B here (secret stays in Supabase). Add the Google Web client ID to the **"Authorized Client IDs"** list too (needed for native ID-token sign-in via `signInWithIdToken`).
4. **Authentication → URL Configuration → Redirect URLs:** add
   - `com.slopssaloon.omen://auth/callback`
   - `com.slopssaloon.omen://auth/verify`
5. **(iOS, later) Authentication → Providers → Apple:** enable when the macOS/iOS path is authorized. Not required for the Android proof.
6. Copy **values #1 and #2** from the table above.

## B. Google Cloud Console — OAuth clients

1. Console → **APIs & Services → OAuth consent screen:** configure (External, app name "Omen", your support email). No sensitive scopes needed — default profile/email.
2. **Credentials → Create Credentials → OAuth client ID → Web application:** name it "Omen Supabase Web". Under **Authorized redirect URIs** add your Supabase callback: `https://<ref>.supabase.co/auth/v1/callback`. Save. → this gives **value #3 (Web client ID)** and a Web client secret (secret → paste into Supabase step A.3, do not send to agent).
3. **Credentials → Create Credentials → OAuth client ID → Android:** name "Omen Android debug". Package name `com.slopssaloon.omen`, SHA-1 `F0:85:1A:13:EE:DC:D7:8E:C8:71:4F:F8:F7:CA:89:05:AC:F0:C0:37`. Save. (No value needed back — Google links it by package+SHA. A production/release SHA-1 gets added later before store release.)

> Android Credential Manager + Supabase `signInWithIdToken` uses the **Web client ID** (#3) as the server client ID, with the Android client authorizing the app. That is why both clients exist but only the Web client ID is returned.

## C. What the agent does after you return #1–#3

- Injects the three public values via `BuildConfig` (from a git-ignored `local.properties` / CI secret, never committed).
- Builds: Credential Manager Google sign-in → Supabase `signInWithIdToken`; email OTP request + 6-digit verify; Keystore-backed encrypted session storage; expanded session state machine (`Loading / SignedOut / SigningIn / AwaitingOtp / SignedIn / NeedsReauth / RetryableError / Canceled`); named recovery states.
- JVM unit tests RED→GREEN, `assembleDebug` + emulator install, state screenshots.
- iOS auth remains deferred to authorized non-signing macOS CI (flagged, not built).

## D. Still gated (not part of this proof)

- Provider (Yahoo/Sleeper/ESPN) connection — separate M0-BE work.
- Apple Developer / App Store / Play Console / signing keys — founder-controlled, later.
- Production Supabase schema changes — none required for M3-A.
