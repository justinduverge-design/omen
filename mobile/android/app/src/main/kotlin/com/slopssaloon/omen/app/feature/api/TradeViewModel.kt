package com.slopssaloon.omen.app.feature.api

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.slopssaloon.omen.core.session.SessionManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * M5 slice G — drives the Trade destination from `trade-compare.v2`.
 * iOS mirror: `App/Api/TradeViewModel.swift`.
 */
class TradeViewModel(
    private val repository: TradeRepository,
    private val playerSearch: PlayerSearchRepository,
    private val sessionManager: SessionManager,
    private val accessTokenProvider: () -> String?,
    private val scope: CoroutineScope,
) {
    sealed interface ViewState {
        /**
         * Nothing asked yet. Distinct from [Loading] and from an empty result: the screen must
         * not show a verdict surface before the user has offered anything.
         */
        data object Idle : ViewState
        data object Loading : ViewState
        data class Loaded(val result: TradeCompare) : ViewState
        data class Failed(val error: OmenApiError) : ViewState
        data object Demo : ViewState
    }

    enum class Side { Send, Receive }

    var viewState: ViewState by mutableStateOf(ViewState.Idle)
        private set

    var offer: TradeOffer by mutableStateOf(TradeOffer())
        private set

    /** Autocomplete rows for the side currently being typed into. Empty hides the picker. */
    var suggestions: List<PlayerSearchResult> by mutableStateOf(emptyList())
        private set

    /**
     * Which field the rows belong to. Without this, two fields with text in them would show one
     * list between them and the user could add a player to the wrong side of the offer.
     */
    var searchingSide: Side? by mutableStateOf(null)
        private set

    private var searchJob: Job? = null

    /**
     * Debounced so a fast typist does not fire one request per keystroke against the route's
     * 30-per-minute-per-IP limit — "Justin Jefferson" is 16 keystrokes and would burn half of it.
     */
    fun search(query: String, side: Side) {
        searchJob?.cancel()
        val trimmed = query.trim()
        if (trimmed.length < ApiPlayerSearchRepository.MIN_QUERY_LENGTH) {
            suggestions = emptyList()
            searchingSide = null
            return
        }
        searchingSide = side
        searchJob = scope.launch {
            delay(SEARCH_DEBOUNCE_MS)
            when (val result = playerSearch.search(trimmed)) {
                is OmenApiResult.Success -> suggestions = result.value
                // A failed lookup leaves the field usable: the user can still type a name and
                // press Add. Autocomplete is an accelerator, never a gate.
                is OmenApiResult.Failure -> suggestions = emptyList()
            }
        }
    }

    fun clearSuggestions() {
        searchJob?.cancel()
        suggestions = emptyList()
        searchingSide = null
    }

    fun add(name: String, side: Side) {
        val trimmed = name.trim()
        if (trimmed.isEmpty()) return
        offer = when (side) {
            Side.Send -> offer.copy(send = offer.send + trimmed)
            Side.Receive -> offer.copy(receive = offer.receive + trimmed)
        }
        clearSuggestions()
        // Any edit invalidates the standing verdict. Leaving it on screen beside a changed
        // offer would show an answer to a question the user is no longer asking.
        viewState = ViewState.Idle
    }

    fun remove(index: Int, side: Side) {
        offer = when (side) {
            Side.Send -> if (index in offer.send.indices) {
                offer.copy(send = offer.send.filterIndexed { i, _ -> i != index })
            } else {
                return
            }
            Side.Receive -> if (index in offer.receive.indices) {
                offer.copy(receive = offer.receive.filterIndexed { i, _ -> i != index })
            } else {
                return
            }
        }
        viewState = ViewState.Idle
    }

    /**
     * The league to personalize against, when the caller has one. Set by the shell from the
     * same `league-overview.v1` read the League destination uses — never guessed here.
     */
    fun useLeague(platform: String?, leagueId: String?) {
        offer = if (platform.isNullOrEmpty() || leagueId.isNullOrEmpty()) {
            offer.copy(leagueContext = null)
        } else {
            offer.copy(leagueContext = TradeOffer.LeagueContext(platform, leagueId))
        }
    }

    suspend fun compare(userId: String) {
        if (userId == SessionManager.DEMO_USER_ID) {
            viewState = ViewState.Demo
            return
        }
        if (!offer.isComparable) {
            viewState = ViewState.Idle
            return
        }

        // `/compare` degrades an unauthenticated caller to a 200 neutral answer rather than a
        // 401, so a missing token is not a failure here — it just means no personalization.
        val accessToken = accessTokenProvider()

        viewState = ViewState.Loading
        viewState = when (val result = repository.compare(offer, accessToken)) {
            is OmenApiResult.Success -> ViewState.Loaded(result.value)
            is OmenApiResult.Failure -> {
                if (result.error is OmenApiError.Unauthorized) sessionManager.onRefreshFailed()
                ViewState.Failed(result.error)
            }
        }
    }

    companion object {
        const val SEARCH_DEBOUNCE_MS = 250L

        fun messageFor(error: OmenApiError): String = when (error) {
            is OmenApiError.Network ->
                "Omen couldn't reach the server. Check your connection and try again."
            is OmenApiError.Unauthorized ->
                "Your session expired. Sign in again to compare with your league's settings."
            is OmenApiError.Server -> "Omen is having trouble on our side. Try again in a moment."
            is OmenApiError.Decode -> "Omen sent something this version of the app couldn't read."
        }
    }
}
