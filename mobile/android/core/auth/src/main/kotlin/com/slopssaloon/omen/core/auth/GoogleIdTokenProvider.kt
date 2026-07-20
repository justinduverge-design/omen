package com.slopssaloon.omen.core.auth

/**
 * Seam over Android Credential Manager's Google ID-token retrieval (M0c §2.1).
 *
 * The real implementation (androidx.credentials + googleid) is added in the follow-up wiring
 * task once the **Google Web client ID** is provisioned — it is the server client ID passed to
 * `GetGoogleIdOption`. Keeping this as an interface means the flow reducer and UI can be built
 * and tested now with a fake, and the build carries no dependency on an unconfigured client ID.
 */
interface GoogleIdTokenProvider {
    /** True only when a Google Web client ID is configured for this build. */
    val isConfigured: Boolean

    /**
     * Launch the Credential Manager sheet and return a Google ID token result.
     * [rawNonce] is echoed back so the caller can pass it to Supabase for nonce verification.
     */
    suspend fun getIdToken(rawNonce: String): GoogleIdTokenResult
}

sealed interface GoogleIdTokenResult {
    data class Token(val idToken: String, val rawNonce: String) : GoogleIdTokenResult
    data object Canceled : GoogleIdTokenResult
    data object Unavailable : GoogleIdTokenResult
    data object Failed : GoogleIdTokenResult
}

/**
 * Default provider used until the real Credential Manager wiring lands. Reports unconfigured so
 * the UI shows an honest "Google sign-in not yet available on this build" state instead of a
 * broken button — never a silent failure.
 */
class UnconfiguredGoogleIdTokenProvider : GoogleIdTokenProvider {
    override val isConfigured: Boolean = false
    override suspend fun getIdToken(rawNonce: String): GoogleIdTokenResult = GoogleIdTokenResult.Unavailable
}
