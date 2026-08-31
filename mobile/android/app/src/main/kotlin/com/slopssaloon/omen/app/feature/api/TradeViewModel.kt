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

    /**
     * The six honest content states, applied to autocomplete. iOS mirror:
     * `TradeViewModel.SearchState`.
     *
     * `F-BAR-34`: this used to be a bare `List<PlayerSearchResult>`, and **every** failure —
     * 429, offline, decode — collapsed into the empty list. On screen that is indistinguishable
     * from "this player does not exist", which is a claim the client had no basis to make.
     * `/api/players/search` shares a 30-request-per-minute-per-IP bucket with `/api/trade`,
     * `/api/demo` and `/api/draft-assistant`, so a normal typing session can and does hit it.
     * Silence about a failure is not neutral — it is a false answer.
     */
    sealed interface SearchState {
        /** Query too short to search. No surface at all. */
        data object Idle : SearchState
        data object Searching : SearchState
        data class Results(val rows: List<PlayerSearchResult>) : SearchState
        /** The server answered, and genuinely knows no such player. */
        data class Empty(val query: String) : SearchState
        data class Failed(val error: OmenApiError) : SearchState
    }

    var searchState: SearchState by mutableStateOf(SearchState.Idle)
        private set

    /**
     * Rows only when the server actually returned names. Derived so no caller can mistake a
     * failure for an empty result — the two are different cases of [SearchState].
     */
    val suggestions: List<PlayerSearchResult>
        get() = (searchState as? SearchState.Results)?.rows.orEmpty()

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
            searchState = SearchState.Idle
            searchingSide = null
            return
        }
        searchingSide = side
        searchState = SearchState.Searching
        searchJob = scope.launch {
            delay(SEARCH_DEBOUNCE_MS)
            when (val result = playerSearch.search(trimmed)) {
                // Zero rows is a real answer and gets its own state. It is never used to stand
                // in for a failure.
                is OmenApiResult.Success -> searchState = if (result.value.isEmpty()) {
                    SearchState.Empty(trimmed)
                } else {
                    SearchState.Results(result.value)
                }
                // A failed lookup still leaves the field usable — the user can type a name and
                // press Add — but the screen says so instead of implying the player is unknown.
                is OmenApiResult.Failure -> searchState = SearchState.Failed(result.error)
            }
        }
    }

    fun clearSuggestions() {
        searchJob?.cancel()
        searchState = SearchState.Idle
        searchingSide = null
    }

    /** Typed by hand. Name only, which the server accepts at lower confidence. */
    fun add(name: String, side: Side) {
        val trimmed = name.trim()
        if (trimmed.isEmpty()) return
        add(TradePlayer(trimmed), side)
    }

    /**
     * Picked from autocomplete. Keeps position, team and the provider id, all of which the
     * server scores on — a name-only player resolves to `position: "UNK"` and falls out of
     * scarcity and tier entirely. The rows already carried this and the client threw it away.
     */
    fun add(result: PlayerSearchResult, side: Side) = add(TradePlayer.of(result), side)

    private fun add(player: TradePlayer, side: Side) {
        offer = when (side) {
            Side.Send -> offer.copy(send = offer.send + player)
            Side.Receive -> offer.copy(receive = offer.receive + player)
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

        /**
         * Autocomplete-specific copy. Deliberately separate from [messageFor]: a failed
         * *search* must never read like a failed *verdict*, and the rate-limit case is the one
         * users actually hit, so it gets named at full volume rather than folded into "server".
         */
        fun searchTitleFor(error: OmenApiError): String =
            if (error is OmenApiError.Server && error.status == 429) {
                "Too many searches"
            } else {
                "Search unavailable"
            }

        fun searchMessageFor(error: OmenApiError): String = when {
            error is OmenApiError.Server && error.status == 429 ->
                "Omen limits searches to protect the service. Wait about a minute, " +
                    "or type the full name and press Add."
            error is OmenApiError.Network ->
                "Omen couldn't reach the server. Check your connection, " +
                    "or type the full name and press Add."
            error is OmenApiError.Unauthorized ->
                "Omen couldn't authorize this search. Type the full name and press Add."
            error is OmenApiError.Decode ->
                "Omen sent something this version of the app couldn't read. " +
                    "Type the full name and press Add."
            else ->
                "Omen is having trouble on our side. Type the full name and press Add."
        }

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
