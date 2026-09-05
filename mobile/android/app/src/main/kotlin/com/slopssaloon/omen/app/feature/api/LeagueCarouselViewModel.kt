package com.slopssaloon.omen.app.feature.api

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.slopssaloon.omen.core.designsystem.component.OmenMatchupHeroState
import com.slopssaloon.omen.core.session.SessionAuthorization
import com.slopssaloon.omen.core.session.SessionManager

/**
 * Drives the Command Center league carousel — the widget that replaced a switcher button the
 * user had to go find. iOS mirror: `App/Api/LeagueCarouselViewModel.swift`.
 *
 * The old shape was two disconnected things: a context strip saying which league you were on,
 * and a modal sheet you opened to change it. A user with five leagues had to open the sheet,
 * read a list, tap, wait, and read the screen again to learn anything about any league but
 * one. The carousel collapses that: each league is a page, you swipe, and the page you rest on
 * becomes the league Omen is talking about.
 *
 * Two rules from the founder, encoded here so iOS and Android cannot drift:
 *
 *  1. **Provider order is by league count, most first; ties alphabetical.** Three ESPN, one
 *     Yahoo, one Sleeper puts ESPN first, then Sleeper before Yahoo. The server already sorts
 *     `platforms` this way and this class does not re-sort it — one authority, not two
 *     implementations of the same rule.
 *  2. **A provider filter, plus All.** With All on, the swipe runs through every league in
 *     that same order.
 *
 * Each page loads its own `league-overview.v1`, lazily and cached, so swiping back to a league
 * you already saw is instant and costs no provider call.
 */
class LeagueCarouselViewModel(
    private val directoryRepository: LeagueDirectoryRepository,
    private val leagueRepository: LeagueRepository,
    private val sessionManager: SessionManager,
) {
    /**
     * One page. Identity is platform + league, never the index — an index-keyed page would
     * swap its contents under the user when the filter changes the list length.
     */
    data class Page(
        val platform: String,
        val leagueId: String,
        val leagueName: String?,
        val teamName: String?,
        val isActive: Boolean,
    ) {
        val id: String get() = "$platform:$leagueId"

        /**
         * ESPN routinely omits a league name even on a healthy connection, so the id is the
         * fallback rather than a blank or an invented label.
         */
        val displayLeagueName: String
            get() = leagueName?.takeIf { it.isNotEmpty() } ?: "League $leagueId"

        val displayTeamName: String
            get() = teamName?.takeIf { it.isNotEmpty() } ?: "Your team"
    }

    /**
     * What one page's matchup read has produced. `Loading` is a real state here — unlike
     * League Pulse, where a spinner on a resting state was the F-HOT defect — because a page
     * genuinely is fetching the first time you swipe to it.
     */
    sealed interface PageState {
        data object Loading : PageState
        data class Loaded(val hero: OmenMatchupHeroState) : PageState
        data class Unavailable(val message: String) : PageState
    }

    sealed interface ViewState {
        data object Loading : ViewState
        data object Loaded : ViewState
        data class Failed(val error: OmenApiError) : ViewState

        /** Demo runs one mock league and never touches the network (facts-of-record #7). */
        data object Demo : ViewState

        /**
         * Signed in, nothing connected. Distinct from [Failed]: an honest "you have no
         * leagues" must never be an error surface.
         */
        data object Empty : ViewState
    }

    companion object {
        /**
         * The "All" chip. A sentinel rather than a null so the filter is one value with one
         * meaning, and the chip row has something concrete to compare against.
         */
        const val ALL_PLATFORMS = "__all__"
    }

    var viewState: ViewState by mutableStateOf(ViewState.Loading)
        private set

    var directory: LeagueDirectory? by mutableStateOf(null)
        private set

    /** Chip order comes from the server's `platforms` order and is not re-sorted here. */
    var availablePlatforms: List<String> by mutableStateOf(emptyList())
        private set

    var selectedPlatform: String by mutableStateOf(ALL_PLATFORMS)
        private set

    var selectedIndex: Int by mutableStateOf(0)
        private set

    /**
     * Set while a rest-on-page selection is being written, so the widget can say the context
     * is changing rather than appear to have changed already.
     */
    var committingPageId: String? by mutableStateOf(null)
        private set

    private val pageStates = mutableStateMapOf<String, PageState>()

    // region Derived

    /**
     * Every followed league, flattened in the server's provider order.
     *
     * `is_followed` is the filter. The server reports every league it discovered and marks the
     * ones the user chose; when no choice has been stored it marks them all, which is the
     * honest reading of "the user has not been able to choose yet".
     */
    val allPages: List<Page>
        get() = directory?.platforms.orEmpty().flatMap { group ->
            group.leagues.filter { it.isFollowed }.map { league ->
                Page(
                    platform = group.platform,
                    leagueId = league.leagueId,
                    leagueName = league.leagueName,
                    teamName = league.teamName,
                    isActive = league.isActive,
                )
            }
        }

    /** The pages actually on screen, after the provider chip. */
    val pages: List<Page>
        get() = if (selectedPlatform == ALL_PLATFORMS) {
            allPages
        } else {
            allPages.filter { it.platform == selectedPlatform }
        }

    val currentPage: Page?
        get() = pages.getOrNull(selectedIndex)

    /**
     * The chip row: All first, then providers in the server's order. Only providers that
     * actually have a followed league get a chip — a chip that filters to nothing is a control
     * that can only disappoint.
     */
    val chips: List<String>
        get() = if (availablePlatforms.isEmpty()) emptyList() else listOf(ALL_PLATFORMS) + availablePlatforms

    fun stateFor(page: Page): PageState = pageStates[page.id] ?: PageState.Loading

    fun leagueCountFor(chip: String): Int =
        if (chip == ALL_PLATFORMS) allPages.size else allPages.count { it.platform == chip }

    // endregion

    // region Loading

    suspend fun load(userId: String? = null) {
        if (userId == SessionManager.DEMO_USER_ID) {
            viewState = ViewState.Demo
            return
        }

        viewState = ViewState.Loading
        when (val result = sessionManager.authorized { directoryRepository.fetchDirectory(it) }) {
            is OmenApiResult.Success -> {
                directory = result.value
                availablePlatforms = result.value.platforms
                    .filter { group -> group.leagues.any { it.isFollowed } }
                    .map { it.platform }
                // Open on the league Omen is actually using, not on page one. Landing on a
                // different league than the rest of the screen describes would make the
                // carousel disagree with the Ledger and the Omen call beneath it.
                // The view model's decision, not a user swipe, so it must not be written
                // straight back to the server.
                selectIndexProgrammatically(allPages.indexOfFirst { it.isActive }.takeIf { it >= 0 } ?: 0)
                viewState = if (allPages.isEmpty()) ViewState.Empty else ViewState.Loaded
                loadCurrentPage()
            }
            is OmenApiResult.Failure -> viewState = ViewState.Failed(result.error)
        }
    }

    fun selectPlatform(chip: String) {
        selectedPlatform = chip
        clampSelection()
    }

    fun selectIndex(index: Int) {
        selectedIndex = index
    }

    /**
     * How many pending [selectedIndex] changes this view model made ITSELF, and which the
     * carousel must therefore not treat as the user resting on a new page.
     *
     * Swift twin: `LeagueCarouselViewModel.programmaticSelections`.
     *
     * Android did not originally need this. Its pager was never driven from [selectedIndex],
     * so `commit -> reload -> selectedIndex = it` simply terminated. The cost of that
     * one-way flow was the opposite defect: after a reload the view model followed the
     * resting league to its new index while the pager stayed put, so the two could drift and
     * the carousel would load, label and commit a league the user was not looking at.
     *
     * Fixing the drift means the pager has to follow [selectedIndex] — which closes exactly
     * the feedback path that took production down on iOS on 2026-09-05 (`.onChange ->
     * commitSelection -> reload -> writes selectedIndex -> .onChange`). So the guard has to
     * land in the same commit that adds the sync, not after it.
     *
     * A counter rather than a boolean, for the same reason as iOS: the pager settles
     * asynchronously, so a flag cleared at the end of the reload can be false again by the
     * time the change it caused is delivered.
     */
    private var programmaticSelections = 0

    /**
     * Moves the pager without arming a commit. Every [selectedIndex] write that is this view
     * model's own decision rather than the user's must go through here.
     */
    private fun selectIndexProgrammatically(index: Int) {
        if (selectedIndex == index) return
        programmaticSelections += 1
        selectedIndex = index
    }

    /**
     * Fetches the visible page's matchup if it has not been fetched. Idempotent: a page
     * already loaded, or already loading, is left alone.
     */
    suspend fun loadCurrentPage() {
        val page = currentPage ?: return
        if (pageStates.containsKey(page.id)) return

        pageStates[page.id] = PageState.Loading
        val token = (sessionManager.authorization() as? SessionAuthorization.Token)?.accessToken
        if (token == null) {
            pageStates[page.id] = PageState.Unavailable("Sign in again to read this league.")
            return
        }

        pageStates[page.id] = when (
            val result = leagueRepository.fetchOverview(token, page.platform, page.leagueId)
        ) {
            is OmenApiResult.Success -> {
                // Null means the payload cannot honestly support a hero — no matchup, or a
                // section the provider failed. An explicit reason beats a blank card.
                val hero = result.value.matchupHero
                    ?: OmenMatchupHeroState.NoMatchup(noMatchupReason(result.value))
                PageState.Loaded(hero)
            }
            is OmenApiResult.Failure -> PageState.Unavailable(
                "Omen couldn't read this league's week just now. Swipe back to try again.",
            )
        }
    }

    private fun noMatchupReason(overview: LeagueOverview): String = when (overview.matchup.status) {
        LeagueOverview.Matchup.Status.NoMatchup ->
            "No matchup scheduled for this league this week."
        LeagueOverview.Matchup.Status.Unavailable ->
            "This league's provider didn't return a matchup."
        else -> "No matchup to show for this league yet."
    }

    /**
     * Called when a swipe settles. Makes the rested-on league the one Omen uses.
     *
     * A no-op on the league that is already active, so dragging across a five-league carousel
     * does not fire five verified provider writes to land where one write reaches.
     *
     * Returns the surfaces §10.3 says the caller must refresh, or null when nothing was
     * written — the caller must not refresh on a failure, because re-reading for the old
     * context and calling it new is exactly the stale-context failure the contract names.
     */
    suspend fun commitSelection(): List<String>? {
        // A selection this view model made itself is not the user resting on a page, and must
        // not be written back to the server. See [programmaticSelections].
        if (programmaticSelections > 0) {
            programmaticSelections -= 1
            return null
        }
        val page = currentPage ?: return null
        // The carousel shows the page it is committing, so its matchup has to be in flight
        // before the write. The picker has no such page and skips this.
        loadCurrentPage()
        return commit(page)
    }

    /**
     * Makes one named league the active one, without touching [selectedIndex].
     *
     * The team picker on Omen, Trade and League calls this: those screens have no pager, so
     * they pick a league by name rather than by resting on it. Sharing the commit with the
     * carousel is the point — two implementations of "make this active" would eventually
     * disagree about what happens on failure, and the failure path is the one that matters.
     *
     * A no-op on the league that is already active, so a tap on the current chip costs nothing
     * and dragging across a five-league carousel does not fire five verified provider writes to
     * land where one reaches.
     *
     * Returns the surfaces §10.3 says the caller must refresh, or null when nothing was written
     * — the caller must not refresh on a failure, because re-reading for the old context and
     * calling it new is exactly the stale-context failure the contract names.
     */
    suspend fun commit(page: Page): List<String>? {
        if (page.isActive) return null

        committingPageId = page.id
        try {
            val result = sessionManager.authorized {
                directoryRepository.selectLeague(it, page.platform, page.leagueId, null)
            }
            return when (result) {
                is OmenApiResult.Success -> {
                    // Re-read rather than flipping `isActive` locally: the server decides what
                    // is active now, and a locally-invented active flag is how a switcher
                    // starts lying about what it switched. Page caches survive, so this costs
                    // no provider matchup calls.
                    reloadDirectoryPreservingPages()
                    result.value.refresh
                }
                is OmenApiResult.Failure -> null
            }
        } finally {
            committingPageId = null
        }
    }

    private suspend fun reloadDirectoryPreservingPages() {
        val result = sessionManager.authorized { directoryRepository.fetchDirectory(it) }
        if (result !is OmenApiResult.Success) return

        val restingId = currentPage?.id
        directory = result.value
        availablePlatforms = result.value.platforms
            .filter { group -> group.leagues.any { it.isFollowed } }
            .map { it.platform }
        // Stay on the page the user is looking at, by identity. Keeping the index would move
        // them if the refreshed directory changed the list at all.
        if (restingId != null) {
            pages.indexOfFirst { it.id == restingId }.takeIf { it >= 0 }?.let { selectIndexProgrammatically(it) }
        }
    }

    /**
     * Keeps [selectedIndex] inside the filtered list after a chip change. Filtering to a
     * provider with fewer leagues than the current index would otherwise leave the pager
     * pointing past the end, which renders nothing at all.
     */
    private fun clampSelection() {
        selectIndexProgrammatically(
            when {
                pages.isEmpty() -> 0
                selectedIndex >= pages.size -> pages.size - 1
                else -> selectedIndex
            }
        )
    }

    // endregion
}
