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

    // ---- Multiselect ----
    //
    // A user with three ESPN leagues used to connect once and lose two of them: every picker
    // took a single tap and bound one league, and there was nowhere else to say the others
    // existed. The pickers now toggle, and the confirm step does two things — binds the first
    // pick as the ACTIVE league (the one Omen reasons about) and follows all of them (the ones
    // the carousel can swipe to). iOS mirror: `ConnectViewModel` multiselect section.

    /**
     * League ids ticked in the current picker. Empty means "nothing chosen yet", which is why
     * confirm is disabled rather than defaulting to the first row.
     */
    var selectedLeagueIds: Set<String> by mutableStateOf(emptySet())
        private set

    /**
     * Set after a multiselect the server accepted but could not store, so the copy can say
     * which leagues survive this session rather than claiming a save that did not happen.
     */
    var followsNotPersisted: Boolean by mutableStateOf(false)
        private set

    fun toggleLeague(id: String) {
        selectedLeagueIds = if (id in selectedLeagueIds) selectedLeagueIds - id else selectedLeagueIds + id
    }

    fun isLeagueSelected(id: String): Boolean = id in selectedLeagueIds

    /** At least one league, and nothing already in flight. */
    val canConfirmLeagueSelection: Boolean
        get() = selectedLeagueIds.isNotEmpty() && !state.isBusy

    /**
     * The confirm button's label. Says how many, because the count is the whole point of the
     * change and a bare "Connect" would hide it.
     */
    val confirmLeagueSelectionLabel: String
        get() = when (selectedLeagueIds.size) {
            0 -> "Pick a league"
            1 -> "Connect this league"
            else -> "Connect ${selectedLeagueIds.size} leagues"
        }

    private fun clearLeagueSelection() {
        selectedLeagueIds = emptySet()
    }

    /**
     * Records the followed set after the active league is bound.
     *
     * Runs AFTER the connect, never instead of it: following a league on a provider with no
     * stored credentials would be a row pointing at something Omen cannot read. A failure here
     * is deliberately not surfaced as a connect failure — the connection genuinely succeeded,
     * and turning a working connection into an error screen over the follow set would be the
     * worse outcome.
     */
    private suspend fun recordFollows(platform: String, leagues: List<FollowedLeague>) {
        if (leagues.size <= 1) return
        val accessToken = bearer() ?: return
        repository.followLeagues(platform, leagues, accessToken)
            .onSuccess { followsNotPersisted = !it }
    }

    /**
     * Confirms the Sleeper multiselect.
     *
     * The first ticked league in the picker's own order becomes the active one. "First in the
     * list the user was looking at" is the only ordering rule that needs no explanation on
     * screen — any other choice (most recent, alphabetical, largest) would have to be taught.
     */
    suspend fun confirmSleeperSelection() {
        val account = (state as? ConnectState.ChoosingLeague)?.account ?: return
        if (!canConfirmLeagueSelection) return
        val chosen = account.leagues.filter { it.id in selectedLeagueIds }
        val primary = chosen.firstOrNull() ?: return

        pendingRequestId = makeRequestId()
        connect(primary, account.username)

        // Only once the connection actually exists.
        if (state is ConnectState.Connected) {
            recordFollows(
                "sleeper",
                chosen.map { FollowedLeague(it.id, null, it.name, it.season) },
            )
        }
    }

    /** Confirms the ESPN multiselect. Same rule as Sleeper: first ticked becomes active. */
    suspend fun confirmEspnSelection() {
        val options = (state as? ConnectState.ChoosingEspnLeague)?.options ?: return
        if (!canConfirmLeagueSelection) return
        val chosen = options.filter { it.id in selectedLeagueIds }
        val primary = chosen.firstOrNull() ?: return

        connectEspnLeague(primary)

        if (state is ConnectState.EspnConnected) {
            recordFollows(
                "espn",
                chosen.map { FollowedLeague(it.id, it.teamId, it.name, it.season) },
            )
        }
    }

    /** Confirms the Yahoo multiselect. Same rule: first ticked becomes active. */
    suspend fun confirmYahooSelection() {
        val leagues = (state as? ConnectState.ChoosingYahooLeague)?.leagues ?: return
        if (!canConfirmLeagueSelection) return
        val chosen = leagues.filter { it.id in selectedLeagueIds }
        val primary = chosen.firstOrNull() ?: return

        bindYahooLeague(primary)

        if (state is ConnectState.YahooConnected) {
            recordFollows(
                "yahoo",
                chosen.map { FollowedLeague(it.id, null, it.name, it.season) },
            )
        }
    }

    // ---- ESPN (W1-A) ----

    /** What the ESPN sign-in sheet has observed. Drives whether Connect is offered. */
    var espnSignInProgress: EspnSignInProgress by mutableStateOf(EspnSignInProgress.SignedOut())
        private set

    /**
     * The league to connect. Pre-filled the moment ESPN's URL reveals one, editable throughout —
     * ESPN has no page Omen can rely on the user landing on, so a field the user can fill is the
     * floor this flow stands on rather than a fallback bolted to the side.
     */
    var espnLeagueId: String by mutableStateOf("")

    /** A status line under the sign-in sheet — "not yet", or "we couldn't check". */
    var espnNotice: String? by mutableStateOf(null)
        private set

    /** The cookie jar for the current sheet. Recreated per attempt. */
    var espnCookieReader: EspnCookieReader? by mutableStateOf(null)
        private set

    /**
     * The ESPN session, held only between sign-in and the connect that consumes it.
     *
     * Discovery made this necessary: the session has to survive from sign-in, through the league
     * lookup, to the connect the user picks. In memory only, never exposed as state, and cleared
     * on connect, cancel, failure and start-over.
     */
    private var espnSession: Pair<String, String>? = null

    /** Contract §W1-A allows one retry on an unreadable session, then the desktop path. */
    private var espnUnreadableRetries = 0

    val canSubmitUsername: Boolean
        get() = username.trim().isNotEmpty() && !state.isBusy

    suspend fun selectProvider(provider: ConnectProvider) {
        when (provider.availability) {
            // Sleeper's next step is the username field the picker already renders beneath
            // itself; Yahoo's is a browser round trip that has to be started explicitly.
            is ConnectAvailability.Available ->
                when (provider) {
                    ConnectProvider.Yahoo -> {
                        selectedProvider = provider
                        connectYahoo()
                    }
                    // Consent first, always. W1-A's binding constraint: the user is told what is
                    // about to open before it opens, and declining writes no state.
                    ConnectProvider.Espn -> {
                        selectedProvider = provider
                        espnNotice = null
                        espnUnreadableRetries = 0
                        state = ConnectState.EspnConsent
                    }
                    else -> {
                        selectedProvider = provider
                        state = ConnectState.NotStarted
                    }
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
        clearEspnSession()
        state = ConnectState.Canceled
    }

    fun startOver() {
        pendingRequestId = null
        clearEspnSession()
        espnNotice = null
        espnLeagueId = ""
        espnUnreadableRetries = 0
        selectedProvider = null
        state = ConnectState.NotStarted
    }

    // ---- ESPN (W1-A) ----

    /** Consent accepted. Opens ESPN's own sign-in in the in-app web view. */
    fun beginEspnSignIn(reader: EspnCookieReader = AndroidEspnCookieReader()) {
        espnSignInProgress = EspnSignInProgress.SignedOut()
        espnCookieReader = reader
        state = ConnectState.EspnSigningIn
    }

    /**
     * Connect is offered once ESPN has a session and a league has been named — by detection or by
     * the user. Both halves are required: a league id without a session cannot connect, and a
     * session without a league has nothing to connect to.
     */
    val canConnectEspn: Boolean
        get() = espnSignInProgress.isSignedIn && espnLeagueId.trim().isNotEmpty() && !state.isBusy

    /**
     * Reported by the sheet as the user moves through ESPN. Never auto-connects.
     *
     * Signed-in-ness and league detection are separate facts. Collapsing them stranded a
     * signed-in iOS user on a page with no league id, indistinguishable from signed out, with a
     * permanently dead button.
     */
    suspend fun espnSignInProgressed(progress: EspnSignInProgress) {
        if (state !is ConnectState.EspnSigningIn) return
        espnSignInProgress = progress

        // Pre-fill, never overwrite. Once the user has typed or corrected a league id, ESPN
        // navigating elsewhere must not silently swap it out from under them.
        progress.detectedLeagueIdOrNull?.let { detected ->
            if (espnLeagueId.trim().isEmpty()) espnLeagueId = detected
        }

        // The moment ESPN has a session, ask what leagues the account plays in. This is what
        // turns "go find your league id in a URL" into a list.
        if (progress.isSignedIn && espnSession == null) discoverEspnLeagues()
    }

    /**
     * Captures the session and asks ESPN for the account's leagues.
     *
     * A failure here is **not** a failed connection — nothing has been connected yet. It falls
     * back to the manual league-id field rather than throwing the user out of the flow, because a
     * lookup Omen could not perform is Omen's problem, not the user's.
     */
    suspend fun discoverEspnLeagues() {
        val reader = espnCookieReader ?: return
        if (espnSession != null) return
        val session = reader.takeSession() ?: return
        espnSession = session
        val accessToken = bearer() ?: return

        state = ConnectState.DiscoveringEspnLeagues
        repository.discoverEspnLeagues(session.first, session.second, accessToken)
            .onSuccess { leagues ->
                if (leagues.isNotEmpty()) {
                    clearLeagueSelection()
                    state = ConnectState.ChoosingEspnLeague(leagues)
                } else {
                    espnNotice = EspnHandoffCopy.NO_LEAGUES_FOUND
                    state = ConnectState.EspnSigningIn
                }
            }
            .onFailure {
                espnNotice = EspnHandoffCopy.DISCOVERY_UNAVAILABLE
                state = ConnectState.EspnSigningIn
            }
    }

    /** The user picked a league from the list ESPN reported. */
    suspend fun connectEspnLeague(option: EspnLeagueOption) {
        val session = espnSession ?: return
        if (state.isBusy) return
        val accessToken = bearer() ?: return

        state = ConnectState.ValidatingEspnConnection(option.id)
        sendEspnConnect(
            EspnCapture(session.first, session.second, option.id, option.teamId),
        )
    }

    /**
     * The user pressed Connect on the manual league-id field. The only moment the session is read
     * when discovery did not run, and the only request it is ever placed in.
     */
    suspend fun confirmEspnConnection() {
        if (!canConnectEspn) return
        val reader = espnCookieReader ?: return
        val leagueId = espnLeagueId.trim()
        // Only trust a detected team when it belongs to the league actually being connected.
        // Sending a team from a league the user browsed away from binds the wrong team silently.
        val teamId = if (espnSignInProgress.detectedLeagueIdOrNull == leagueId) {
            espnSignInProgress.detectedTeamIdOrNull
        } else {
            null
        }
        val accessToken = bearer() ?: return

        state = ConnectState.ValidatingEspnConnection(leagueId)
        val session = espnSession ?: reader.takeSession() ?: run {
            failEspnSignIn(ConnectFailure.EspnSessionUnreadable)
            return
        }
        sendEspnConnect(EspnCapture(session.first, session.second, leagueId, teamId))
    }

    private suspend fun sendEspnConnect(capture: EspnCapture) {
        val accessToken = bearer() ?: return
        repository.connectEspn(capture, accessToken)
            .onSuccess {
                // The session is dropped the instant it is no longer needed. Nothing in the app
                // holds an ESPN session past this line.
                clearEspnSession()
                confirmEspnFromServer()
            }
            .onFailure { error ->
                failEspnSignIn((error as? ConnectException)?.failure ?: ConnectFailure.Server)
            }
    }

    /**
     * After a successful connect the league label comes from the server rather than from anything
     * the client scraped.
     */
    private suspend fun confirmEspnFromServer() {
        val accessToken = bearer() ?: return
        repository.espnConnection(accessToken)
            .onSuccess { connection ->
                state = ConnectState.EspnConnected(connection ?: EspnConnection(null, null))
            }
            // The connect itself succeeded, so this is not a failure the user should see as one.
            .onFailure { state = ConnectState.EspnConnected(EspnConnection(null, null)) }
    }

    /**
     * Contract §W1-A failure table: one retry on an unreadable session, then the desktop path.
     * Never a loop, and never copy that blames the user.
     */
    private fun failEspnSignIn(failure: ConnectFailure) {
        clearEspnSession()

        if (failure == ConnectFailure.EspnSessionUnreadable) {
            espnUnreadableRetries++
            if (espnUnreadableRetries > 1) {
                espnNotice = EspnHandoffCopy.SIGN_IN_FELL_BACK
                state = ConnectState.UnsupportedOnMobile(ConnectProvider.Espn)
                return
            }
        }
        state = ConnectState.RetryableError(failure)
    }

    /**
     * Backing out of ESPN's sign-in. Normal, not an error, and nothing is written.
     *
     * Guarded: the sheet is shown while the state is [ConnectState.EspnSigningIn], so any move
     * off that state dismisses it, and an unguarded cancel meant a **successful** discovery
     * cancelled itself — on a real iPhone the ESPN sheet flashed for a second and the user landed
     * on "Nothing was connected" with their leagues already fetched and thrown away.
     */
    fun cancelEspnSignIn() {
        if (state !is ConnectState.EspnSigningIn) return
        clearEspnSession()
        state = ConnectState.Canceled
    }

    /** Drops every in-memory trace of the ESPN session. */
    private fun clearEspnSession() {
        espnSession = null
        espnCookieReader?.clear()
        espnCookieReader = null
        espnSignInProgress = EspnSignInProgress.SignedOut()
    }

    suspend fun resolveUsername() {
        val trimmed = username.trim()
        if (trimmed.isEmpty() || state.isBusy) return
        val accessToken = bearer() ?: return

        state = ConnectState.ResolvingAccount
        repository.resolveSleeper(trimmed, accessToken)
            .onSuccess { clearLeagueSelection(); state = ConnectState.ChoosingLeague(it) }
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
                if (only != null) {
                    bindYahooLeague(only)
                } else {
                    // Clear first, so a second run through the picker never inherits the
                    // ticks from the first.
                    clearLeagueSelection()
                    state = ConnectState.ChoosingYahooLeague(leagues)
                }
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
