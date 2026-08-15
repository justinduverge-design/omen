package com.slopssaloon.omen.app.feature.api

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.slopssaloon.omen.app.feature.commandcenter.OmenCommandCenterFixtures
import com.slopssaloon.omen.app.feature.commandcenter.OmenCommandCenterState
import com.slopssaloon.omen.core.designsystem.component.OmenContextStripState
import com.slopssaloon.omen.core.session.SessionManager

/**
 * M5-Native-API-Client slices B and C — drives the Command Center from real shell truth.
 * iOS mirror: `App/Api/CommandCenterViewModel.swift`.
 *
 * Demo is not a load state and never touches the network: [SessionManager.DEMO_USER_ID]
 * short-circuits straight to the labeled demo fixture, preserving facts-of-record #7 (mock data
 * is always labeled, never silently mixed with live).
 */
class CommandCenterViewModel(
    private val repository: DashboardRepository,
    private val leagueRepository: LeagueRepository,
    private val sessionManager: SessionManager,
    private val accessTokenProvider: () -> String?,
) {
    sealed interface ViewState {
        data object Loading : ViewState
        data class Loaded(val summary: DashboardSummary) : ViewState

        /**
         * Honest failure. The screen renders this explicitly; it never falls back to a fixture,
         * because showing demo content to a real user during an outage is the exact mock/live
         * mixing the doctrine forbids.
         */
        data class Failed(val error: OmenApiError) : ViewState
        data object Demo : ViewState
    }

    var viewState: ViewState by mutableStateOf(ViewState.Loading)
        private set

    /**
     * Slice C. Populated by a second, slower request after the shell is already on screen.
     * Null means "we have no verified provider identity" — which is also what it stays as if
     * standings fails, is empty, or names no team belonging to this user.
     */
    var context: OmenContextStripState? by mutableStateOf(null)
        private set

    /**
     * The Command Center state to render.
     *
     * Slice C overlays the verified context strip when — and only when — standings has produced
     * one. The screen therefore never regresses: it renders fully from shell truth first, then
     * upgrades in place if the slower provider call succeeds.
     */
    val commandCenterState: OmenCommandCenterState
        get() = when (val state = viewState) {
            is ViewState.Loading -> OmenCommandCenterFixtures.realLoading
            is ViewState.Demo -> OmenCommandCenterFixtures.demoConnected
            is ViewState.Loaded -> state.summary.toCommandCenterState(context)
            is ViewState.Failed -> OmenCommandCenterFixtures.realDisconnected
        }

    /**
     * True when the shell could not be read. The screen renders an explicit failure surface
     * rather than letting `realDisconnected` masquerade as a confirmed "no leagues" answer.
     */
    val failure: OmenApiError?
        get() = (viewState as? ViewState.Failed)?.error

    suspend fun load(userId: String) {
        if (userId == SessionManager.DEMO_USER_ID) {
            viewState = ViewState.Demo
            return
        }

        val accessToken = accessTokenProvider()
        if (accessToken.isNullOrEmpty()) {
            viewState = ViewState.Failed(OmenApiError.Unauthorized)
            return
        }

        viewState = ViewState.Loading
        context = null

        when (val result = repository.fetchSummary(accessToken)) {
            is OmenApiResult.Success -> {
                viewState = ViewState.Loaded(result.value)
                // Slice C runs only after the shell is renderable, and only when the shell says
                // a provider is actually connected — asking a disconnected user's provider for
                // standings is a guaranteed round-trip to an error.
                if (result.value.platforms.anyConnected) loadContext(accessToken)
            }
            is OmenApiResult.Failure -> {
                if (result.error is OmenApiError.Unauthorized) sessionManager.onRefreshFailed()
                viewState = ViewState.Failed(result.error)
            }
        }
    }

    /**
     * Upgrades the context strip if standings can support one.
     *
     * Every failure path here is deliberately silent to the user: the shell is already on screen
     * and correct, and a provider hiccup must not turn a working Command Center into an error
     * screen. A failed or empty standings call simply leaves the strip unfilled.
     */
    private suspend fun loadContext(accessToken: String) {
        context = leagueRepository.fetchStandings(accessToken).successOrNull()?.contextStrip
    }
}
