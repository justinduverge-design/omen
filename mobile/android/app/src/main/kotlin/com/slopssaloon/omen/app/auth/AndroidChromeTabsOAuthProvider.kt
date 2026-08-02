package com.slopssaloon.omen.app.auth

import android.content.Context
import androidx.browser.customtabs.CustomTabsIntent
import androidx.core.net.toUri
import com.slopssaloon.omen.core.auth.OAuthCallback
import com.slopssaloon.omen.core.auth.OAuthLaunchResult
import com.slopssaloon.omen.core.auth.PkceCodes
import com.slopssaloon.omen.core.auth.SupabaseOAuthProvider
import java.util.concurrent.ConcurrentHashMap

/**
 * Concrete [SupabaseOAuthProvider] using AndroidX Custom Tabs (M4-Auth-Providers-v1 §3.1).
 *
 * Each `launch(providerId)` generates fresh PKCE + CSRF state, stashes them keyed by
 * providerId, and opens Supabase's `GET /auth/v1/authorize?provider=...&flow_type=pkce&
 * redirect_to=...&code_challenge=...&code_challenge_method=s256` in a Custom Tabs session.
 * Supabase in turn redirects to the third-party OAuth server (e.g. Discord); the third party
 * redirects back to Supabase's own `/auth/v1/callback`, which then redirects to our
 * `com.slopssaloon.omen://auth/callback?code=<pkce_code>&state=<echoed_state>` deep link.
 *
 * `parseCallback` validates the returned `state` against the value stashed at launch (CSRF
 * defense per RFC 6749 §10.12) and, on match, returns the PKCE `codeVerifier` for the caller
 * to hand to [com.slopssaloon.omen.core.auth.AuthRepository.exchangeOAuthCode].
 *
 * The Supabase project doesn't expose an "is provider X enabled" endpoint on the anon key,
 * so `isConfigured` is optimistic: any provider is considered configured as long as Supabase
 * itself is (the transport-layer 404 mapping in [com.slopssaloon.omen.core.auth.SupabaseAuthRepository.exchangeOAuthCode]
 * catches an actually-disabled provider and surfaces `OAuthProviderNotConfigured`, which the
 * UI maps to the "not available right now" copy). Callers that need a stricter gate should
 * consult Supabase Studio directly.
 */
class AndroidChromeTabsOAuthProvider(
    private val context: Context,
    private val supabaseUrl: String,
    /** The registered app-scheme deep link Supabase redirects to on completion. */
    private val redirectUri: String = "com.slopssaloon.omen://auth/callback",
) : SupabaseOAuthProvider {

    private data class Pending(val codeVerifier: String, val state: String)

    private val pending: MutableMap<String, Pending> = ConcurrentHashMap()

    override fun isConfigured(providerId: String): Boolean = supabaseUrl.isNotBlank()

    override suspend fun launch(providerId: String): OAuthLaunchResult {
        if (!isConfigured(providerId)) return OAuthLaunchResult.NotConfigured
        val pkce = PkceCodes.generate()
        pending[providerId] = Pending(codeVerifier = pkce.codeVerifier, state = pkce.state)
        val authorizeUri = buildAuthorizeUri(providerId = providerId, pkce = pkce)
        return try {
            val intent = CustomTabsIntent.Builder().build().apply {
                intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            intent.launchUrl(context, authorizeUri.toString().toUri())
            OAuthLaunchResult.Launched
        } catch (_: android.content.ActivityNotFoundException) {
            // No browser or Custom Tabs–capable app on the device. Surface as Unavailable so
            // the UI can steer the user to another sign-in method.
            OAuthLaunchResult.Unavailable
        } catch (_: SecurityException) {
            OAuthLaunchResult.Failed
        }
    }

    override fun parseCallback(providerId: String, code: String?, state: String?): OAuthCallback {
        val stashed = pending[providerId] ?: return OAuthCallback.Mismatch
        if (code.isNullOrBlank() || state.isNullOrBlank()) return OAuthCallback.Malformed
        if (state != stashed.state) return OAuthCallback.Mismatch
        // Single-use: consume the stash so a replayed callback can't succeed twice.
        pending.remove(providerId)
        return OAuthCallback.Valid(code = code, codeVerifier = stashed.codeVerifier)
    }

    private fun buildAuthorizeUri(providerId: String, pkce: com.slopssaloon.omen.core.auth.PkceParams): android.net.Uri {
        val base = supabaseUrl.trimEnd('/') + "/auth/v1/authorize"
        return base.toUri().buildUpon()
            .appendQueryParameter("provider", providerId)
            .appendQueryParameter("flow_type", "pkce")
            .appendQueryParameter("redirect_to", redirectUri)
            .appendQueryParameter("code_challenge", pkce.codeChallenge)
            .appendQueryParameter("code_challenge_method", pkce.codeChallengeMethod)
            .appendQueryParameter("state", pkce.state)
            .build()
    }
}
