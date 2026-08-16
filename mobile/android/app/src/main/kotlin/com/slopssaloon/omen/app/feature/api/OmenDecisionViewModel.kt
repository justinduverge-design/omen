package com.slopssaloon.omen.app.feature.api

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.slopssaloon.omen.app.feature.omen.OmenDecisionFixtures
import com.slopssaloon.omen.core.designsystem.component.OmenDecisionBriefState
import com.slopssaloon.omen.core.session.SessionManager

/**
 * M5-Native-API-Client slice D — drives the Omen destination from the live engine.
 * iOS mirror: `App/Api/OmenDecisionViewModel.swift`.
 *
 * Replaces the fixture selection that showed `realDisconnected` to every real signed-in user
 * regardless of their actual leagues. Demo is not a load state and never touches the network
 * (facts-of-record #7), failure renders honestly, and no path falls back to a fixture.
 */
class OmenDecisionViewModel(
    private val repository: OmenDecisionRepository,
    private val sessionManager: SessionManager,
    private val accessTokenProvider: () -> String?,
) {
    sealed interface ViewState {
        data object Idle : ViewState
        data object Loading : ViewState
        data class Loaded(val envelope: OmenDecisionEnvelope) : ViewState
        data class Failed(val error: OmenApiError) : ViewState
        data object Demo : ViewState
    }

    var viewState: ViewState by mutableStateOf(ViewState.Idle)
        private set

    /**
     * Injected so the brief's Connect affordance reaches the app's existing connect flow
     * rather than this screen minting a second entry point.
     */
    var onConnect: (() -> Unit)? = null

    /**
     * Idle and Loading render the same surface on purpose — before the first request
     * resolves there is nothing truthful to show but a spinner. An empty state would read as
     * "Omen has no move for you", a claim we have not earned yet.
     *
     * [onReload] is supplied by the screen because retry needs a coroutine scope, which this
     * view model deliberately does not own (matching `CommandCenterViewModel`).
     */
    fun briefState(onReload: (() -> Unit)? = null): OmenDecisionBriefState =
        when (val state = viewState) {
            is ViewState.Idle, is ViewState.Loading -> OmenDecisionBriefState.Loading
            is ViewState.Demo -> OmenDecisionFixtures.demo
            is ViewState.Loaded -> state.envelope.briefState(onRetry = onReload, onConnect = onConnect)
            is ViewState.Failed -> OmenDecisionBriefState.Error(messageFor(state.error), onReload)
        }

    suspend fun load(userId: String) {
        if (userId == SessionManager.DEMO_USER_ID) {
            viewState = ViewState.Demo
            return
        }
        reload()
    }

    suspend fun reload() {
        val accessToken = accessTokenProvider()
        if (accessToken.isNullOrEmpty()) {
            viewState = ViewState.Failed(OmenApiError.Unauthorized)
            return
        }

        viewState = ViewState.Loading
        when (val result = repository.fetchDecision(accessToken)) {
            is OmenApiResult.Success -> viewState = ViewState.Loaded(result.value)
            is OmenApiResult.Failure -> {
                if (result.error is OmenApiError.Unauthorized) sessionManager.onRefreshFailed()
                viewState = ViewState.Failed(result.error)
            }
        }
    }

    /**
     * Transport failures only. Contract states carry the server's own recovery sentence and
     * are mapped in [OmenDecisionEnvelope.briefState]; this covers the cases where no
     * envelope arrived at all, so there is no server message to defer to.
     */
    private fun messageFor(error: OmenApiError): String = when (error) {
        is OmenApiError.Network -> "Omen couldn't reach the server. Check your connection and try again."
        is OmenApiError.Unauthorized -> "Your session expired. Sign in again to see this week's move."
        // The status code is deliberately not shown: it tells a user nothing they can act on,
        // and OmenApiError carries it for logs rather than for display.
        is OmenApiError.Server -> "Omen is having trouble on our side. Try again in a moment."
        is OmenApiError.Decode ->
            "Omen sent something this version of the app couldn't read. Updating the app may fix it."
    }
}
