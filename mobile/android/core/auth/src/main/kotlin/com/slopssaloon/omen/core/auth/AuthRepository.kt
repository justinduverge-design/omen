package com.slopssaloon.omen.core.auth

/**
 * The Omen account authentication boundary (M0c §2). The concrete production implementation
 * (Supabase `signInWithIdToken` / `verifyOtp`) is a follow-up wiring task once the Google Web
 * client ID and Supabase client are injected; this interface + [FakeAuthRepository] let the
 * flow, session, and UI states be built and JVM-tested with no network and no live config.
 *
 * All methods return an [AuthOutcome] with opaque, safe categories — implementations must never
 * surface raw provider errors, tokens, or cookie values to the caller (M0c §8).
 */
interface AuthRepository {

    /** Send a 6-digit OTP to [email]. Returns [AuthOutcome.OtpSent] or a safe failure. */
    suspend fun requestEmailOtp(email: String): AuthOutcome

    /** Verify [code] for [email]. Returns [AuthOutcome.Success] or [AuthOutcome.InvalidCode]. */
    suspend fun verifyEmailOtp(email: String, code: String): AuthOutcome

    /**
     * Exchange a Google ID token (from Credential Manager) for an Omen session via Supabase.
     * [rawNonce] is the app-generated nonce whose SHA-256 was passed to Credential Manager.
     */
    suspend fun signInWithGoogleIdToken(idToken: String, rawNonce: String): AuthOutcome

    /** Attempt to refresh the current session; used on launch when a stored token is expired. */
    suspend fun refresh(): AuthOutcome

    /**
     * Exchange an OAuth authorization [code] (returned via the deep-link callback for
     * [providerId]) for an Omen session via Supabase. [codeVerifier] is the PKCE verifier the
     * app stashed before opening the browser (M4-Auth-Providers-v1 §2.4).
     */
    suspend fun exchangeOAuthCode(providerId: String, code: String, codeVerifier: String): AuthOutcome

    /**
     * Ask Supabase for a WebAuthn challenge to feed the platform passkey UI. Returns
     * [PasskeyChallenge.Ok] with the base64url challenge or a named failure.
     */
    suspend fun startPasskeyChallenge(): PasskeyChallenge

    /**
     * Verify a passkey [assertion] against Supabase and produce a session. The app never inspects
     * the assertion contents beyond forwarding them here (M4-Auth-Providers-v1 §3.1).
     */
    suspend fun signInWithPasskey(assertion: PasskeyResult.Assertion): AuthOutcome

    /**
     * Register a new passkey [credential] for the currently-authenticated user. Used for
     * post-sign-in pairing and the Account settings "Add a passkey" action (brief §3.3, §3.4).
     */
    suspend fun registerPasskey(credential: PasskeyResult.Assertion): AuthOutcome

    /** Invalidate the remote session (best-effort). Local secure storage is cleared separately. */
    suspend fun signOut()
}

/** Result of [AuthRepository.startPasskeyChallenge]. */
sealed interface PasskeyChallenge {
    data class Ok(val challenge: String) : PasskeyChallenge
    data class Failed(val code: RetryableCode) : PasskeyChallenge
}
