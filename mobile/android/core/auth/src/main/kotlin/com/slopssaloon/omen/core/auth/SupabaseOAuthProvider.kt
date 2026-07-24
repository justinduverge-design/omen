package com.slopssaloon.omen.core.auth

/**
 * Provider-agnostic seam over Supabase's `signInWithOAuth` browser handoff
 * (M4-Auth-Providers-v1 §3.1). The concrete Chrome Custom Tabs launcher lives in the app module
 * because it depends on `androidx.browser`; keeping this as an interface means the flow reducer,
 * repository, and UI can be built and JVM-tested with a fake before the platform impl exists.
 *
 * "Provider-agnostic" means adding a future OAuth provider (GitHub, Slack, …) is a config +
 * one-button change on top of this seam — no new interfaces, no new state-machine branches.
 */
interface SupabaseOAuthProvider {

    /** True only when [providerId] is enabled in Supabase Studio for this build. */
    fun isConfigured(providerId: String): Boolean

    /**
     * Begin an OAuth ceremony for [providerId]. The implementation:
     *  1. generates a PKCE `code_verifier` + SHA-256 `code_challenge`,
     *  2. generates a random `state` (CSRF token) and stashes both server-side of the seam,
     *  3. opens the Custom Tabs / `ASWebAuthenticationSession` to Supabase's authorize URL,
     *  4. returns [OAuthLaunchResult.Launched] on success or a named failure otherwise.
     *
     * The deep-link callback is handled out-of-band (Activity `onNewIntent` on Android,
     * `.onOpenURL` on iOS) and dispatched into the state machine via
     * [AuthEvent.OAuthCallbackReceived]. The stashed `state` + `code_verifier` are consumed by
     * [parseCallback] and [AuthRepository.exchangeOAuthCode] respectively.
     */
    suspend fun launch(providerId: String): OAuthLaunchResult

    /**
     * Validate an incoming deep-link callback and extract the `code` + `state`. Compares [state]
     * against the value stashed by [launch] (CSRF defense per brief §2.3). Returns
     * [OAuthCallback.Valid] with the exchange inputs on match, or a named rejection on mismatch.
     *
     * The returned `codeVerifier` is the PKCE verifier the caller must pass to
     * [AuthRepository.exchangeOAuthCode].
     */
    fun parseCallback(providerId: String, code: String?, state: String?): OAuthCallback
}

sealed interface OAuthLaunchResult {
    data object Launched : OAuthLaunchResult
    data object NotConfigured : OAuthLaunchResult
    data object Unavailable : OAuthLaunchResult
    data object Failed : OAuthLaunchResult
}

sealed interface OAuthCallback {
    /** State matched; ready to exchange the code for a session. */
    data class Valid(val code: String, val codeVerifier: String) : OAuthCallback

    /** State mismatch (CSRF) or a callback for a provider we didn't launch. */
    data object Mismatch : OAuthCallback

    /** Missing `code` / `state` parameters, or malformed callback URL. */
    data object Malformed : OAuthCallback
}

/**
 * Default provider used until the real Custom Tabs / `ASWebAuthenticationSession` wiring lands.
 * Reports every provider unconfigured so the UI hides OAuth buttons cleanly instead of surfacing
 * broken CTAs.
 */
class UnconfiguredSupabaseOAuthProvider : SupabaseOAuthProvider {
    override fun isConfigured(providerId: String): Boolean = false
    override suspend fun launch(providerId: String): OAuthLaunchResult = OAuthLaunchResult.NotConfigured
    override fun parseCallback(providerId: String, code: String?, state: String?): OAuthCallback =
        OAuthCallback.Malformed
}
