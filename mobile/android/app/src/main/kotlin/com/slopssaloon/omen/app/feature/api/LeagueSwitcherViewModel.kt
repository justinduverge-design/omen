package com.slopssaloon.omen.app.feature.api

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

/**
 * Drives the approved team/league switcher sheet (visual briefs §10.2/§10.3).
 * iOS mirror: `App/Api/LeagueSwitcherViewModel.swift`.
 */
class LeagueSwitcherViewModel(
    private val repository: LeagueDirectoryRepository,
    private val accessTokenProvider: () -> String?,
) {
    sealed interface ViewState {
        data object Loading : ViewState
        data class Loaded(val directory: LeagueDirectory) : ViewState

        /**
         * Honest failure. §10.3 forbids a dead selector, and the doctrine forbids falling
         * back to a fixture — showing demo leagues to a real user during an outage is
         * exactly the mock/live mixing facts-of-record #7 rules out.
         */
        data class Failed(val error: OmenApiError) : ViewState
    }

    var viewState: ViewState by mutableStateOf(ViewState.Loading)
        private set

    /** Non-null only while a selection is in flight, so one row can show progress. */
    var selectingLeagueId: String? by mutableStateOf(null)
        private set

    /** Set when a selection fails. The selected row does not move. */
    var selectionError: OmenApiError? by mutableStateOf(null)
        private set

    suspend fun load() {
        viewState = ViewState.Loading
        val token = accessTokenProvider() ?: run {
            viewState = ViewState.Failed(OmenApiError.Unauthorized)
            return
        }
        viewState = when (val result = repository.fetchDirectory(token)) {
            is OmenApiResult.Success -> ViewState.Loaded(result.value)
            is OmenApiResult.Failure -> ViewState.Failed(result.error)
        }
    }

    /**
     * Applies a selection. Returns the surfaces §10.3 says the caller must refresh, or null
     * when the switch did not take — the caller must not refresh on failure, because
     * re-reading for the old context and presenting it as new is the stale-context failure
     * the contract names.
     */
    suspend fun select(platform: String, leagueId: String, teamId: String?): List<String>? {
        selectionError = null
        selectingLeagueId = leagueId
        try {
            val token = accessTokenProvider() ?: run {
                selectionError = OmenApiError.Unauthorized
                return null
            }
            return when (val result = repository.selectLeague(token, platform, leagueId, teamId)) {
                is OmenApiResult.Success -> {
                    // Re-read rather than mutating the local copy: the server decides what
                    // `is_active` and `selection_persistence` now are, and a locally-invented
                    // active flag is how a switcher starts lying about what it switched.
                    load()
                    result.value.refresh
                }
                is OmenApiResult.Failure -> {
                    selectionError = result.error
                    null
                }
            }
        } finally {
            selectingLeagueId = null
        }
    }
}
