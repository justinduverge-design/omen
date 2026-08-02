package com.slopssaloon.omen.core.auth

/**
 * Thin seam over the Supabase GoTrue REST endpoints (M0c §2). The concrete HTTP+JSON transport
 * ([app] `OkHttpGoTrueTransport`) lives in the app module so `core:auth` stays dependency-light
 * and JVM-unit-testable — [SupabaseAuthRepository]'s outcome mapping is verified here with a
 * fake transport, while the transport itself is proven by build + live smoke.
 *
 * The transport returns already-classified, **opaque** results: it never surfaces raw provider
 * bodies, tokens beyond the session fields, or identifiers (M0c §8).
 */
interface GoTrueTransport {
    suspend fun requestEmailOtp(email: String): TransportResult
    suspend fun verifyEmailOtp(email: String, code: String): TransportResult
    suspend fun signInWithGoogleIdToken(idToken: String, rawNonce: String): TransportResult
    suspend fun refresh(refreshToken: String): TransportResult

    // M4-Auth-Providers-v1 §3.2 — provider-agnostic OAuth code exchange.
    suspend fun exchangeOAuthCode(providerId: String, code: String, codeVerifier: String): TransportResult

    // M4-Auth-Providers-v1 §3.2 — WebAuthn challenge issue + assertion verify + registration.
    suspend fun startPasskeyChallenge(): TransportResult
    suspend fun verifyPasskeyAssertion(assertion: PasskeyResult.Assertion): TransportResult
    suspend fun registerPasskey(credential: PasskeyResult.Assertion): TransportResult
}

sealed interface TransportResult {
    /** 2xx with no session body (e.g. OTP send accepted). */
    data object Ok : TransportResult

    /**
     * 2xx returning a WebAuthn challenge (opaque base64url string). Only used by
     * `startPasskeyChallenge`; other endpoints never produce this variant.
     */
    data class Challenge(val challenge: String) : TransportResult

    /** 2xx with a session. [expiresInSeconds] is the token lifetime from `now`. */
    data class SessionTokens(
        val userId: String,
        val accessToken: String,
        val refreshToken: String,
        val expiresInSeconds: Long,
    ) : TransportResult

    /** Non-2xx HTTP status. Only the numeric [status] is carried — never the body. */
    data class HttpError(val status: Int) : TransportResult

    /** Transport-level failure (no response, socket, DNS, timeout). */
    data object NetworkError : TransportResult

    /** A 2xx body that could not be parsed into the expected shape. */
    data object Malformed : TransportResult
}
