package com.slopssaloon.omen.app.feature.api

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.slopssaloon.omen.core.session.SessionManager

/**
 * M5 slice F — drives the League destination from `league-overview.v1`.
 * iOS mirror: `App/Api/LeagueViewModel.swift`.
 *
 * Demo is not a load state and never touches the network, failure is rendered honestly, and no
 * path falls back to a fixture (facts-of-record #7).
 */
class LeagueViewModel(
    private val repository: LeagueRepository,
    private val sessionManager: SessionManager,
) {
    sealed interface ViewState {
        data object Idle : ViewState
        data object Loading : ViewState
        data class Loaded(val overview: LeagueOverview) : ViewState
        data class Failed(val error: OmenApiError) : ViewState
        data object Demo : ViewState
    }

    var viewState: ViewState by mutableStateOf(ViewState.Idle)
        private set

    suspend fun load(userId: String) {
        if (userId == SessionManager.DEMO_USER_ID) {
            viewState = ViewState.Demo
            return
        }
        reload()
    }

    suspend fun reload() {
        viewState = ViewState.Loading
        // `authorized` renews an expiring token first and retries once on a 401, so an
        // Unauthorized arriving here has already survived a forced refresh and has already
        // routed the session to re-auth.
        viewState = when (val result = sessionManager.authorized { repository.fetchOverview(it) }) {
            is OmenApiResult.Success -> ViewState.Loaded(result.value)
            is OmenApiResult.Failure -> ViewState.Failed(result.error)
        }
    }

    companion object {
        /**
         * Transport failures only. The contract's own section states carry everything else and
         * are rendered per section rather than as a whole-screen error.
         */
        fun messageFor(error: OmenApiError): String = when (error) {
            is OmenApiError.Network ->
                "Omen couldn't reach the server. Check your connection and try again."
            is OmenApiError.Unauthorized ->
                "Your session expired. Sign in again to see your league."
            // The status code is deliberately not shown; it tells a user nothing actionable.
            is OmenApiError.Server -> "Omen is having trouble on our side. Try again in a moment."
            is OmenApiError.Decode ->
                "Your league came back in a format this version of the app couldn't read."
        }
    }
}
