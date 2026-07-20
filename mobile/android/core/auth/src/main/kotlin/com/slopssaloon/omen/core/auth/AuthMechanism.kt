package com.slopssaloon.omen.core.auth

/**
 * The Omen account sign-in mechanisms (M0c §2.1, M0a §4.2).
 *
 * Provider *connection* (Yahoo/Sleeper/ESPN) is deliberately NOT modeled here — that is a
 * separate concern gated behind M0-BE and out of M3-A scope.
 */
enum class AuthMechanism {
    /** Android Credential Manager → Google ID token → Supabase `signInWithIdToken`. No browser. */
    GOOGLE_ID_TOKEN,

    /** 6-digit email one-time code (not a magic link — avoids mobile deep-link fragility). */
    EMAIL_OTP,

    /** iOS Sign in with Apple. Declared for contract parity; not implemented on Android. */
    APPLE_ID_TOKEN,
}
