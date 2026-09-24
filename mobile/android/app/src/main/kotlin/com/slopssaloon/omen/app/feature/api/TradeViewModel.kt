package com.slopssaloon.omen.app.feature.api

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.slopssaloon.omen.app.feature.commandcenter.OmenTradeBuildState
import com.slopssaloon.omen.app.feature.commandcenter.OmenTradeCapability
import com.slopssaloon.omen.app.feature.commandcenter.OmenTradePartner
import com.slopssaloon.omen.app.feature.commandcenter.OmenTradeRead
import com.slopssaloon.omen.app.feature.commandcenter.OmenTradeRosterState
import com.slopssaloon.omen.app.feature.commandcenter.OmenTradeShareState
import com.slopssaloon.omen.app.feature.commandcenter.omenTradeRead
import com.slopssaloon.omen.app.feature.commandcenter.omenTradeSides
import com.slopssaloon.omen.core.session.SessionAuthorization
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

    var capabilities: TradeCapabilities? by mutableStateOf(null)
        private set

    suspend fun loadCapabilities() {
        capabilities = repository.capabilities().successOrNull()
    }

    // MARK: - J4: TradeBuild / TradeRoster — a real opponent roster

    /**
     * `GET /api/trade/roster`. `TradeRoster.dc.html`'s own rule stands: no spinner modeled in
     * the screen state itself and no retry for a permanent provider limit — [Loading] and
     * [Failed] are handled by the flow that hosts these screens, not by the screens.
     */
    sealed interface RosterBrowseState {
        data object Idle : RosterBrowseState
        data object Loading : RosterBrowseState
        data class Loaded(val response: TradeRosterResponse) : RosterBrowseState
        data class Failed(val error: OmenApiError) : RosterBrowseState
    }

    var rosterBrowseState: RosterBrowseState by mutableStateOf(RosterBrowseState.Idle)
        private set

    var selectedPartnerTeamId: String? by mutableStateOf(null)
        private set

    /**
     * Loads every team's roster for the offer's connected league. `offer.leagueContext` is set
     * from the SAME `league-overview.v1` read the League destination uses — this never
     * discovers a league on its own.
     */
    suspend fun loadRoster(userId: String) {
        if (userId == SessionManager.DEMO_USER_ID) {
            rosterBrowseState = RosterBrowseState.Failed(OmenApiError.Network)
            return
        }
        val leagueContext = offer.leagueContext
        if (leagueContext == null) {
            rosterBrowseState = RosterBrowseState.Failed(OmenApiError.Network)
            return
        }
        val accessToken = (sessionManager.authorization() as? SessionAuthorization.Token)?.accessToken
        if (accessToken == null) {
            rosterBrowseState = RosterBrowseState.Failed(OmenApiError.Unauthorized)
            return
        }

        rosterBrowseState = RosterBrowseState.Loading
        selectedPartnerTeamId = null
        when (
            val result = repository.roster(
                platform = leagueContext.platform,
                leagueId = leagueContext.leagueId,
                teamId = null,
                week = null,
                accessToken = accessToken,
            )
        ) {
            is OmenApiResult.Success -> {
                rosterBrowseState = RosterBrowseState.Loaded(result.value)
                selectedPartnerTeamId = result.value.teams.firstOrNull()?.id
            }
            is OmenApiResult.Failure -> {
                if (result.error is OmenApiError.Unauthorized) sessionManager.onRefreshFailed()
                rosterBrowseState = RosterBrowseState.Failed(result.error)
            }
        }
    }

    fun selectPartnerTeam(id: String) {
        selectedPartnerTeamId = id
    }

    /**
     * Picked off a real roster. Keeps position, team and the provider id — the same fields
     * autocomplete already carries.
     */
    fun addFromRoster(player: TradeRosterResponse.Player) {
        add(
            TradePlayer(name = player.name, position = player.position, team = player.team, playerKey = player.playerKey),
            Side.Receive,
        )
    }

    fun dismissRosterBrowse() {
        rosterBrowseState = RosterBrowseState.Idle
        selectedPartnerTeamId = null
    }

    private fun crestFor(name: String?): String {
        if (name.isNullOrEmpty()) return "FT"
        val letters = name.split(" ").take(2).mapNotNull { it.firstOrNull() }
        return if (letters.isEmpty()) "FT" else letters.joinToString("").uppercase()
    }

    val rosterCapability: OmenTradeCapability?
        get() = capabilities?.let {
            OmenTradeCapability(
                maxTeams = it.maxTeams,
                threeTeamSupported = it.threeTeamSupported,
                threeTeamReason = it.threeTeamReason,
            )
        }

    val rosterPartners: List<OmenTradePartner>
        get() {
            val loaded = rosterBrowseState as? RosterBrowseState.Loaded ?: return emptyList()
            if (!loaded.response.isAvailable) return emptyList()
            return loaded.response.teams.map {
                OmenTradePartner(id = it.id, crest = crestFor(it.teamName), name = it.teamName ?: "Team ${it.id}", need = null)
            }
        }

    /**
     * `TradeBuild` — a real partner directory plus the offer built so far. Always constructible
     * once a league is connected, whether or not the roster read has landed yet.
     */
    val rosterBuildState: OmenTradeBuildState
        get() {
            val partners = rosterPartners
            val selectedId = selectedPartnerTeamId ?: partners.firstOrNull()?.id
            val primaryTitle = when (val state = rosterBrowseState) {
                is RosterBrowseState.Loading -> "Loading your league's teams…"
                is RosterBrowseState.Loaded -> when {
                    !state.response.isAvailable -> "See why rosters aren't available"
                    selectedId != null -> "View their roster"
                    else -> "Load your league's teams"
                }
                else -> "Load your league's teams"
            }
            return OmenTradeBuildState(
                kicker = "Two teams",
                title = "Trade with a real team",
                tabTitles = emptyList(),
                selectedTabIndex = 0,
                partners = partners,
                selectedPartnerId = selectedId,
                filters = emptyList(),
                selectedFilterId = null,
                capability = rosterCapability,
                sides = omenTradeSides(offer),
                read = null,
                submission = null,
                primaryActionTitle = primaryTitle,
            )
        }

    /**
     * `TradeRoster` — the selected partner's real roster, or the honest reason it can't be
     * read. Null only while the read is in flight or has not started; the hosting flow shows
     * its own loading/error surface for those, per this screen's own no-spinner rule.
     */
    val rosterScreenState: OmenTradeRosterState?
        get() {
            val loaded = rosterBrowseState as? RosterBrowseState.Loaded ?: return null
            val response = loaded.response
            val partners = rosterPartners
            val selectedId = selectedPartnerTeamId ?: partners.firstOrNull()?.id

            var note: String? = null
            val rosters: OmenTradeRosterState.Rosters = if (!response.isAvailable) {
                OmenTradeRosterState.Rosters.PermanentlyUnavailable("Opponent rosters", response.unavailableSentence)
            } else {
                val team = response.teams.firstOrNull { it.id == selectedId }
                if (team != null) {
                    val rows = team.players.map { player ->
                        val alreadyAdded = player.playerKey != null &&
                            offer.receive.any { it.playerKey == player.playerKey }
                        OmenTradeRosterState.Row(
                            id = player.id,
                            name = player.name,
                            meta = player.meta,
                            availability = if (alreadyAdded) {
                                OmenTradeRosterState.Availability.Added
                            } else {
                                OmenTradeRosterState.Availability.Available
                            },
                        )
                    }
                    if (rows.isEmpty()) note = "Omen didn't find any rostered players for this team."
                    OmenTradeRosterState.Rosters.Read(
                        teamName = team.teamName ?: "This team",
                        playerCount = rows.size,
                        rows = rows,
                        freshness = "Rosters read live from ${response.platform.replaceFirstChar(Char::uppercaseChar)} just now",
                    )
                } else {
                    OmenTradeRosterState.Rosters.PermanentlyUnavailable("Opponent rosters", "Pick a team to see their roster.")
                }
            }

            return OmenTradeRosterState(
                kicker = "Two teams",
                title = "Their roster",
                tabTitles = emptyList(),
                selectedTabIndex = 0,
                partners = partners,
                selectedPartnerId = selectedId,
                filters = emptyList(),
                selectedFilterId = null,
                capability = rosterCapability,
                rosters = rosters,
                note = note,
            )
        }

    // MARK: - J4: TradeShare

    sealed interface ShareState {
        data object Idle : ShareState
        data object Sharing : ShareState
        data class Shared(val response: TradeShareResponse) : ShareState
        data class Failed(val error: OmenApiError) : ShareState
    }

    var shareState: ShareState by mutableStateOf(ShareState.Idle)
        private set

    /**
     * `trade-share.v1`: names off by default. The one inclusion toggle the payload actually
     * supports — flipping it changes what is sent, not just what is displayed.
     */
    var shareIncludeNames: Boolean by mutableStateOf(false)
        private set

    fun toggleShareInclusion(id: String) {
        if (id != "names") return
        shareIncludeNames = !shareIncludeNames
    }

    /**
     * Card content always comes from the ALREADY-DISPLAYED `trade-compare.v2` read
     * ([viewState]), never from the share response — `POST /api/trade/share` returns the raw
     * `compareTrade()` shape (`trade.send/receive`, `result`), not `verdict_state` or
     * `explanation`. The response only mints the public hash and its expiry.
     */
    val shareScreenState: OmenTradeShareState?
        get() {
            val loaded = viewState as? ViewState.Loaded ?: return null
            val read: OmenTradeRead = omenTradeRead(loaded.result)

            val card = OmenTradeShareState.Card(
                eyebrow = "Omen's read",
                headline = read.headline,
                reasoning = read.reasoning,
                caveat = read.caveat,
                footer = "Shared from Omen. Not financial advice.",
            )
            val inclusions = listOf(
                OmenTradeShareState.Inclusion(
                    id = "names",
                    title = "Player names",
                    detail = if (shareIncludeNames) {
                        "Real player names are shown on the card."
                    } else {
                        "Positions only — names are off by default."
                    },
                    isOn = shareIncludeNames,
                ),
            )
            val failure = (shareState as? ShareState.Failed)?.let { shareFailureMessageFor(it.error) }

            return OmenTradeShareState(
                kicker = "Two teams",
                title = "Share this read",
                card = card,
                inclusions = inclusions,
                note = "This link is public for 30 days. Anyone with it can see the card above — " +
                    "nothing else about your league.",
                primaryActionTitle = if (shareState is ShareState.Sharing) "Sharing…" else "Get a share link",
                secondaryActionTitle = "Copy as text",
                failure = failure,
            )
        }

    /**
     * Replaces each player's name with its position (or "Player") when names are off — the
     * masking is applied to what is actually POSTed, not just to what the card displays.
     */
    private fun maskedForShare(source: TradeOffer): TradeOffer = source.copy(
        send = source.send.map { TradePlayer(it.position ?: "Player", it.position, it.team, it.playerKey) },
        receive = source.receive.map { TradePlayer(it.position ?: "Player", it.position, it.team, it.playerKey) },
    )

    suspend fun share(userId: String) {
        if (!offer.isComparable) return
        val accessToken = (sessionManager.authorization() as? SessionAuthorization.Token)?.accessToken
        val payloadOffer = if (shareIncludeNames) offer else maskedForShare(offer)
        shareState = ShareState.Sharing
        shareState = when (val result = repository.share(payloadOffer, accessToken)) {
            is OmenApiResult.Success -> ShareState.Shared(result.value)
            is OmenApiResult.Failure -> ShareState.Failed(result.error)
        }
    }

    fun copyShareText(): String? {
        val loaded = viewState as? ViewState.Loaded ?: return null
        val read = omenTradeRead(loaded.result)
        return "${read.headline}\n${read.reasoning}\n${read.caveat}\n— via Omen"
    }

    fun dismissShare() {
        shareState = ShareState.Idle
    }

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
        // A signed-in user still gets a renewed token: a stale bearer would silently downgrade
        // their verdict to the anonymous one.
        val accessToken = (sessionManager.authorization() as? SessionAuthorization.Token)?.accessToken

        viewState = ViewState.Loading
        viewState = when (val result = repository.compare(offer, accessToken)) {
            is OmenApiResult.Success -> ViewState.Loaded(result.value)
            is OmenApiResult.Failure -> {
                if (result.error is OmenApiError.Unauthorized) sessionManager.onRefreshFailed()
                ViewState.Failed(result.error)
            }
        }
    }

    /**
     * Back to the offer builder, keeping the offer itself.
     *
     * The J4 answer screens replace the builder while a verdict is on screen, so there has to be
     * a way back. [ViewState.Idle] rather than clearing [offer] is the point: a user who reads
     * "you give up too much" wants to change one player, not retype the deal.
     */
    fun dismissVerdict() {
        viewState = ViewState.Idle
    }

    companion object {
        const val SEARCH_DEBOUNCE_MS = 250L

        fun shareFailureMessageFor(error: OmenApiError): String = when {
            error is OmenApiError.Server && error.status == 503 ->
                "Omen couldn't create a share link right now. Try again in a moment."
            error is OmenApiError.Server && error.status == 413 ->
                "This offer is too large to share."
            error is OmenApiError.Network ->
                "Omen couldn't reach the server. Check your connection and try again."
            else -> "Omen couldn't create a share link. Try again."
        }

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
            is OmenApiError.Server -> if (error.status == 422) {
                "Omen couldn't verify one or more players. Remove them and choose from search suggestions."
            } else {
                "Omen is having trouble on our side. Try again in a moment."
            }
            is OmenApiError.Decode -> "Omen sent something this version of the app couldn't read."
        }
    }
}
