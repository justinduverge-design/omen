package com.slopssaloon.omen.app.feature.api

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.slopssaloon.omen.core.session.SessionAuthorization
import com.slopssaloon.omen.core.session.SessionManager

/**
 * T3 -- drives `TradeFindReview` from `trade-find.v1`. iOS mirror:
 * `App/Api/TradeFindReviewViewModel.swift`.
 *
 * A client-side pager over a statically-fetched batch: T2 returns the whole batch in one call
 * (capped server-side at `MAX_CANDIDATES_RETURNED`), so "exhausted" is reached when the local
 * stack empties, never a second network call -- the contract's own data-binding note for the
 * batch-exhausted state.
 */
class TradeFindReviewViewModel(
    private val repository: TradeFindRepository,
    private val saveAction: TradeFindSaveAction = StubTradeFindSaveAction(),
    private val sessionManager: SessionManager,
) {
    sealed interface ViewState {
        data object Loading : ViewState
        data object Reviewing : ViewState
        data object BatchExhausted : ViewState

        /**
         * `status: "ok"` (or `"degraded"`) with an empty `candidates` array -- "a real, honest
         * positive state", never a variant of the degraded or exhausted copy.
         */
        data object ZeroCandidates : ViewState

        /**
         * `status: "unavailable"` -- own-roster-unreadable / league-not-active / team-not-found.
         * Per the contract's acceptance checks this is explicitly **not this screen's job** to
         * render; the hosting flow is expected to route elsewhere on seeing it.
         */
        data class RouteElsewhere(val reason: String) : ViewState
        data class Failed(val error: OmenApiError) : ViewState
    }

    enum class SaveState { Idle, Saving, Saved, Error }

    var viewState: ViewState by mutableStateOf(ViewState.Loading)
        private set

    var candidates: List<TradeFindCandidate> by mutableStateOf(emptyList())
        private set

    var currentIndex: Int by mutableStateOf(0)
        private set

    var response: TradeFindResponse? by mutableStateOf(null)
        private set

    private var saveStates: Map<String, SaveState> by mutableStateOf(emptyMap())

    val currentCandidate: TradeFindCandidate?
        get() = candidates.getOrNull(currentIndex)

    /** "3 of 6" -- one-indexed position in the batch actually returned. Client pager state. */
    val positionLabel: String?
        get() = if (candidates.isEmpty()) null else "${currentIndex + 1} of ${candidates.size}"

    /** "5 of 6 teams scanned" -- `bounds.teams_considered` against the reconstructed total. */
    val teamsScannedLabel: String?
        get() = response?.let { "${it.teamsConsidered} of ${it.totalOtherTeams} teams scanned" }

    /** "Showing 5 of 6 teams." -- the degraded banner's bold lead-in. */
    val degradedShowingLabel: String?
        get() = response?.takeIf { it.showsDegradedBanner }
            ?.let { "Showing ${it.teamsConsidered} of ${it.totalOtherTeams} teams." }

    /**
     * The named-gap sentence for the degraded banner. Handles the "more than one team degraded"
     * case the contract flags as unspecified by pluralizing rather than naming only the first
     * team and silently dropping the rest.
     */
    val degradedSentence: String?
        get() {
            val current = response?.takeIf { it.showsDegradedBanner } ?: return null
            val names = current.degradedTeams.mapNotNull { it.teamName?.trim()?.takeIf(String::isNotEmpty) }
            return when (names.size) {
                0 -> "Omen couldn't read every team's roster this week — Omen never proposes a trade against a roster it can't see."
                1 -> "ESPN couldn't read ${names[0]}'s roster this week — Omen never proposes a trade against a roster it can't see."
                else -> {
                    val joined = names.joinToString(", ")
                    "ESPN couldn't read ${names.size} teams' rosters this week ($joined) — Omen never proposes a trade against a roster it can't see."
                }
            }
        }

    fun saveState(candidateId: String): SaveState = saveStates[candidateId] ?: SaveState.Idle

    suspend fun load(platform: String, leagueId: String, teamId: String, week: Int?) {
        viewState = ViewState.Loading
        val accessToken = (sessionManager.authorization() as? SessionAuthorization.Token)?.accessToken
        if (accessToken == null) {
            viewState = ViewState.Failed(OmenApiError.Unauthorized)
            return
        }

        when (val result = repository.find(platform, leagueId, teamId, week, accessToken)) {
            is OmenApiResult.Success -> {
                val payload = result.value
                response = payload
                if (payload.status == "unavailable") {
                    candidates = emptyList()
                    currentIndex = 0
                    viewState = ViewState.RouteElsewhere(payload.reason ?: "own_roster_unavailable")
                    return
                }
                candidates = payload.candidates
                currentIndex = 0
                saveStates = emptyMap()
                viewState = if (candidates.isEmpty()) ViewState.ZeroCandidates else ViewState.Reviewing
            }
            is OmenApiResult.Failure -> {
                if (result.error == OmenApiError.Unauthorized) sessionManager.onRefreshFailed()
                viewState = ViewState.Failed(result.error)
            }
        }
    }

    /**
     * E069 -- `Pass`, and the swipe-left gesture's committed equivalent. Local only: "Pass never
     * calls a network endpoint" (acceptance check). Advances regardless of whether this
     * candidate was already saved.
     */
    fun pass() {
        if (currentIndex >= candidates.size) return
        currentIndex += 1
        if (currentIndex >= candidates.size) {
            viewState = ViewState.BatchExhausted
        }
    }

    /**
     * E070 -- `Save for later`, and the swipe-right gesture's committed equivalent. Calls the
     * save interface with the candidate's `id` and its `reasoning` verbatim, then flips that
     * candidate's button to `Saved ✓`. Never advances the stack and never navigates -- there is
     * no saved-trades destination yet (T4).
     */
    suspend fun save() {
        val candidate = currentCandidate ?: return
        saveStates = saveStates + (candidate.id to SaveState.Saving)
        val outcome = saveAction.save(candidate.id, candidate.reasoning)
        saveStates = saveStates + (candidate.id to (
            if (outcome == TradeFindSaveOutcome.Saved) SaveState.Saved else SaveState.Error
            ))
    }
}
