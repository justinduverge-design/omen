package com.slopssaloon.omen.core.auth

/**
 * Seam over the platform passkey (WebAuthn) API — Android Credential Manager on this platform
 * (M4-Auth-Providers-v1 §3.1). Distinct from [SupabaseOAuthProvider] because passkeys use
 * `signInWithWebAuthn` (not `signInWithOAuth`) and never involve a browser deep link.
 *
 * The real Credential Manager wiring lives in the app module because it depends on the app's
 * Activity context; keeping this as an interface means the flow reducer, repository, and UI can
 * be built and JVM-tested with a fake before the platform impl exists.
 */
interface PasskeyProvider {

    /** True only when the device has a platform authenticator and the API is available. */
    val isSupported: Boolean

    /**
     * Present the platform passkey UI for sign-in against [challenge] (base64url from Supabase).
     * The returned [PasskeyResult.Assertion] fields are forwarded verbatim to the Supabase
     * `verifyWebAuthn` endpoint; the app never inspects, logs, or stores them.
     */
    suspend fun getAssertion(challenge: String): PasskeyResult

    /**
     * Present the platform passkey registration UI to create a new credential for [userId] against
     * [challenge]. Used for post-sign-in pairing (brief §3.4) and Account settings "Add a passkey".
     */
    suspend fun register(challenge: String, userId: String): PasskeyResult
}

/**
 * Passkey ceremony result. All string fields carry opaque WebAuthn payloads the app must NOT
 * inspect, log, or persist beyond the immediate `verifyWebAuthn` call (M0c §8 opaque-error rule
 * applies to credentials in the same spirit).
 */
sealed interface PasskeyResult {
    data class Assertion(
        val credentialId: String,
        val clientDataJson: String,
        val authenticatorData: String,
        val signature: String,
        val userHandle: String?,
    ) : PasskeyResult

    /** User dismissed the passkey sheet. Normal, not an error. */
    data object Canceled : PasskeyResult

    /** Device has no platform authenticator or the Credential Manager API is unavailable. */
    data object Unavailable : PasskeyResult

    /** No passkey is registered for this account on this device. UI should offer another method. */
    data object NoCredential : PasskeyResult

    /** Ceremony failed for a reason the app should not surface verbatim. */
    data object Failed : PasskeyResult
}

/**
 * Default provider used until the real Credential Manager wiring lands. Reports unsupported so
 * the UI can hide the "Sign in with a passkey" button entirely instead of surfacing a broken CTA.
 */
class UnsupportedPasskeyProvider : PasskeyProvider {
    override val isSupported: Boolean = false
    override suspend fun getAssertion(challenge: String): PasskeyResult = PasskeyResult.Unavailable
    override suspend fun register(challenge: String, userId: String): PasskeyResult = PasskeyResult.Unavailable
}
