package com.slopssaloon.omen.app.auth

import android.net.Uri
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow

/**
 * Single-writer bus that MainActivity feeds when a `com.slopssaloon.omen://auth/callback` deep
 * link arrives, and OmenAndroidApp collects to dispatch [com.slopssaloon.omen.core.auth.AuthEvent.OAuthCallbackReceived]
 * (M4-Auth-Providers-v1 §2.4). Kept intentionally global because the Activity's `onNewIntent`
 * lives outside the Compose tree; a shared flow gives us at-least-once delivery without any
 * DI framework.
 *
 * `replay = 1` lets the composable pick up a callback that arrived before it started
 * collecting (e.g. the Activity was recreated while Custom Tabs was still open).
 */
object OAuthCallbackBus {
    private val _callbacks = MutableSharedFlow<Uri>(replay = 1, extraBufferCapacity = 4)
    val callbacks: SharedFlow<Uri> get() = _callbacks.asSharedFlow()

    fun post(uri: Uri) {
        _callbacks.tryEmit(uri)
    }

    /** Test / recovery — clear the buffered replay so a stale callback can't refire. */
    @OptIn(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
    fun clear() {
        _callbacks.resetReplayCache()
    }
}
