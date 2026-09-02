package com.slopssaloon.omen.app.feature.connect

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import androidx.core.net.toUri
import com.slopssaloon.omen.app.auth.OAuthCallbackBus
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withTimeout

/** How a provider authorization round trip in the system browser ended. */
sealed interface ProviderAuthOutcome {
    /**
     * The browser returned to the app on the registered deep link.
     *
     * Carries the `status` the server put on that link, not the `Uri` itself: the view model
     * has no business parsing an Android framework type, and keeping it out means the whole
     * Yahoo flow is testable on a plain JVM without Robolectric.
     */
    data class Returned(val status: String?) : ProviderAuthOutcome

    /** The user dismissed the tab, or never finished. Normal, not an error (contract §6). */
    data object Canceled : ProviderAuthOutcome

    /** The tab could not be opened at all — no browser on the device. */
    data object Failed : ProviderAuthOutcome
}

/**
 * Opens a provider's own sign-in page in a Custom Tab and waits for the app's deep-link return.
 * iOS mirror: `App/Connect/ProviderAuthSession.swift`.
 *
 * Distinct from [com.slopssaloon.omen.app.auth.AndroidChromeTabsOAuthProvider], which builds a
 * Supabase authorize URL and validates a PKCE callback. This one opens a URL the **server**
 * built and hands back whatever comes home: for a Yahoo connect the CSRF `state` is minted,
 * stored, and consumed server-side in `oauth_state`, so there is nothing for the client to
 * validate and nothing worth pretending to.
 *
 * The onboarding contract §87 is explicit that the provider login is never embedded in a
 * WebView — an app-controlled web view can read what the user types into Yahoo's form.
 */
fun interface ProviderAuthSessionPresenting {
    suspend fun authorize(url: String): ProviderAuthOutcome
}

class CustomTabsProviderAuthSession(
    private val context: Context,
    /**
     * How long to wait for the deep link before giving up. Custom Tabs, unlike iOS's
     * `ASWebAuthenticationSession`, gives the app no dismissal callback: if the user backs out
     * of the tab we are told nothing at all. Without a bound the connect screen would sit on
     * "Waiting for Yahoo" forever, which is the endless-spinner state the contract forbids.
     * Timing out reads as cancellation, and the user can re-check or retry.
     */
    private val timeoutMillis: Long = 5 * 60 * 1000,
) : ProviderAuthSessionPresenting {

    override suspend fun authorize(url: String): ProviderAuthOutcome = coroutineScope {
        // Drop any buffered replay first: a callback from an earlier attempt would otherwise
        // resolve this one instantly with a stale result.
        OAuthCallbackBus.clear()

        // Subscribe BEFORE launching the tab. The sign-in collector on the same bus calls
        // `clear()` on every emission it sees, so relying on `replay = 1` to catch a callback
        // that lands first would be a race we lose intermittently — the worst kind.
        val callback = async {
            OAuthCallbackBus.callbacks.first { it.getQueryParameter("status") != null }
        }

        try {
            CustomTabsIntent.Builder().build().apply {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }.launchUrl(context, url.toUri())
        } catch (_: ActivityNotFoundException) {
            callback.cancel()
            return@coroutineScope ProviderAuthOutcome.Failed
        } catch (_: SecurityException) {
            callback.cancel()
            return@coroutineScope ProviderAuthOutcome.Failed
        }

        try {
            withTimeout(timeoutMillis) {
                ProviderAuthOutcome.Returned(callback.await().getQueryParameter("status"))
            }
        } catch (_: TimeoutCancellationException) {
            callback.cancel()
            ProviderAuthOutcome.Canceled
        }
    }
}

/**
 * Test double. Records what it was asked to open so a test can assert the app never sends the
 * user to a URL it invented itself.
 */
class StubProviderAuthSession(
    private val outcome: ProviderAuthOutcome = ProviderAuthOutcome.Canceled,
) : ProviderAuthSessionPresenting {
    val requestedUrls = mutableListOf<String>()

    override suspend fun authorize(url: String): ProviderAuthOutcome {
        requestedUrls.add(url)
        return outcome
    }
}
