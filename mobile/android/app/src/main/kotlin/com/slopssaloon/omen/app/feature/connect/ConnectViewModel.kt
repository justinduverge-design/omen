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
    private val authSession: ProviderAuthSessionPresenting,
    private val makeRequestId: () -> String = ::defaultRequestId,
) {
    var state: ConnectState by mutableStateOf(ConnectState.NotStarted)
        private set

    var selectedProvider: ConnectProvider? by mutableStateOf(null)
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

    suspend fun selectProvider(provider: ConnectProvider) {
        when (provider.availability) {
            // Sleeper's next step is the username field the picker already renders beneath
            // itself; Yahoo's is a browser round trip that has to be started explicitly.
            is ConnectAvailability.Available ->
                if (provider == ConnectProvider.Yahoo) {
                    selectedProvider = provider
                    connectYahoo()
                } else {
                    selectedProvider = provider
                    state = ConnectState.NotStarted
                }
            // Not an error and not a dead end — the screen renders the provider's own reason
            // and a safe next action.
            else -> {
                selectedProvider = provider
                state = ConnectState.UnsupportedOnMobile(provider)
            }
        }
    }

    /** Spec §6: "Cancellation is normal, not an error." */
    fun cancel() {
        pendingRequestId = null
        state = ConnectState.Canceled
    }

    fun startOver() {
        pendingRequestId = null
        selectedProvider = null
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

    // ---- Yahoo ----

    /**
     * Yahoo's whole flow: authorize in the system browser, confirm with the server what was
     * actually connected, then let the user pick the league to bind.
     *
     * The `status=connected` on the deep link is **not** treated as proof. Any app on the
     * device can fire that URL at us, and more usefully, a user can approve in Yahoo while the
     * token exchange fails behind them. [ConnectRepository.yahooLeagues] is the confirmation,
     * because it can only answer once tokens are genuinely stored — which is also why there is
     * no "I've connected" button for the user to press on Omen's behalf.
     */
    suspend fun connectYahoo() {
        if (state.isBusy) return
        val accessToken = bearer() ?: return

        state = ConnectState.StartingYahooAuthorization
        val authorizationUrl = repository.startYahooAuthorization(accessToken)
            .getOrElse {
                state = ConnectState.RetryableError(it.asConnectFailure())
                return
            }

        state = ConnectState.AwaitingYahooReturn
        when (val outcome = authSession.authorize(authorizationUrl)) {
            // Contract §6: backing out of a provider's own sign-in is normal, not an error.
            is ProviderAuthOutcome.Canceled -> {
                state = ConnectState.Canceled
                return
            }
            is ProviderAuthOutcome.Failed -> {
                state = ConnectState.RetryableError(ConnectFailure.Server)
                return
            }
            is ProviderAuthOutcome.Returned -> {
                // `status=cancelled` means the user pressed Yahoo's own decline button. Same
                // meaning as dismissing the tab, so it reads the same way.
                if (outcome.status == "cancelled") {
                    state = ConnectState.Canceled
                    return
                }
            }
        }

        confirmYahooConnection()
    }

    /**
     * Re-reads the connection from the server. Also the retry target after a transient failure,
     * so a user who really is connected is not sent back through the browser.
     */
    suspend fun confirmYahooConnection() {
        val accessToken = bearer() ?: return

        state = ConnectState.ConfirmingYahooConnection
        repository.yahooLeagues(accessToken)
            .onSuccess { leagues ->
                // One league is not a choice. Binding it directly removes a screen whose only
                // possible answer was already known.
                val only = leagues.singleOrNull()
                if (only != null) bindYahooLeague(only) else state = ConnectState.ChoosingYahooLeague(leagues)
            }
            .onFailure { state = ConnectState.RetryableError(it.asConnectFailure()) }
    }

    suspend fun bindYahooLeague(league: YahooLeague) {
        val accessToken = bearer() ?: return

        state = ConnectState.BindingYahooLeague(league)
        repository.bindYahooLeague(league.id, accessToken)
            .onSuccess { state = ConnectState.YahooConnected(league) }
            .onFailure { state = ConnectState.RetryableError(it.asConnectFailure()) }
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
