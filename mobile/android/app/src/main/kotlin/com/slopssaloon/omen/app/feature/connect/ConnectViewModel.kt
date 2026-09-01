package com.slopssaloon.omen.app.feature.connect

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.slopssaloon.omen.core.session.SessionAuthorization
import com.slopssaloon.omen.core.session.SessionManager
import java.util.UUID

/**
 * M5-NativeConnect — drives onboarding steps 4–6. iOS mirror:
 * `App/Connect/ConnectViewModel.swift`.
 */
class ConnectViewModel(
    private val repository: ConnectRepository,
    private val sessionManager: SessionManager,
    private val makeRequestId: () -> String = ::defaultRequestId,
) {
    var state: ConnectState by mutableStateOf(ConnectState.NotStarted)
        private set

    var username: String by mutableStateOf("")

    /**
     * The id for the attempt currently being retried.
     *
     * Spec §7 requires a retry of the *same* attempt to be idempotent. Minting a fresh id on
     * every tap would defeat the backend replay guard, so the id is created once per league
     * selection and reused until that attempt succeeds or the user picks again.
     */
    private var pendingRequestId: String? = null

    val canSubmitUsername: Boolean
        get() = username.trim().isNotEmpty() && !state.isBusy

    fun selectProvider(provider: ConnectProvider) {
        state = when (provider.availability) {
            is ConnectAvailability.Available -> ConnectState.NotStarted
            // Not an error and not a dead end — the screen renders the provider's own reason
            // and a safe next action.
            else -> ConnectState.UnsupportedOnMobile(provider)
        }
    }

    /** Spec §6: "Cancellation is normal, not an error." */
    fun cancel() {
        pendingRequestId = null
        state = ConnectState.Canceled
    }

    fun startOver() {
        pendingRequestId = null
        state = ConnectState.NotStarted
    }

    suspend fun resolveUsername() {
        val trimmed = username.trim()
        if (trimmed.isEmpty() || state.isBusy) return
        val accessToken = bearer() ?: return

        state = ConnectState.ResolvingAccount
        repository.resolveSleeper(trimmed, accessToken)
            .onSuccess { state = ConnectState.ChoosingLeague(it) }
            .onFailure { state = ConnectState.RetryableError(it.asConnectFailure()) }
    }

    suspend fun selectLeague(league: SleeperLeague) {
        val account = (state as? ConnectState.ChoosingLeague)?.account ?: return
        pendingRequestId = makeRequestId()
        connect(league, account.username)
    }

    /** Retries the same attempt, reusing its request id so the replay guard still applies. */
    suspend fun retryConnect(league: SleeperLeague, username: String) {
        if (pendingRequestId == null) pendingRequestId = makeRequestId()
        connect(league, username)
    }

    /**
     * Renews an expiring access token before a connect round trip and sets the matching failure
     * state when there isn't one.
     *
     * Connect is where a stale token used to be most expensive: the user had just typed their
     * username, and a one-hour-old session turned that into "sign in again" with the typing
     * discarded. A transport failure is reported as a network problem — **not** as re-auth,
     * which would throw away a session that is still valid.
     */
    private suspend fun bearer(): String? = when (val authorization = sessionManager.authorization()) {
        is SessionAuthorization.Token -> authorization.accessToken
        SessionAuthorization.Unavailable -> {
            state = ConnectState.RetryableError(ConnectFailure.Network)
            null
        }
        SessionAuthorization.NeedsReauth -> {
            state = ConnectState.NeedsReauth
            null
        }
    }

    private suspend fun connect(league: SleeperLeague, username: String) {
        val accessToken = bearer() ?: return
        val requestId = pendingRequestId ?: return

        state = ConnectState.ValidatingConnection(league)
        repository.connectSleeper(username, league.id, requestId, accessToken)
            .onSuccess {
                pendingRequestId = null
                state = ConnectState.Connected(league)
            }
            .onFailure { state = ConnectState.RetryableError(it.asConnectFailure()) }
    }

    private fun Throwable.asConnectFailure(): ConnectFailure =
        (this as? ConnectException)?.failure ?: ConnectFailure.Server

    companion object {
        /**
         * Matches the backend's `NATIVE_REQUEST_ID_PATTERN` — `[A-Za-z0-9_-]{16,128}`. A UUID
         * with hyphens stripped is 32 safe characters, comfortably inside the range.
         */
        fun defaultRequestId(): String = UUID.randomUUID().toString().replace("-", "")
    }
}
