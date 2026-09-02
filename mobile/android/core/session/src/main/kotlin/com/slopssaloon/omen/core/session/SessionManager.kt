package com.slopssaloon.omen.core.session

import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Owns the persistent [SessionState] and its transitions, independent of any provider sync
 * (M0c §2.2). Backed by a [SecureSessionStore] so a killed/relaunched app restores locally
 * before any network work.
 *
 * `nowEpochSeconds` is injected so expiry logic is deterministic in unit tests.
 */
class SessionManager(
    private val store: SecureSessionStore,
    private val nowEpochSeconds: () -> Long,
) {
    private val _state = MutableStateFlow<SessionState>(SessionState.Loading)
    val state: StateFlow<SessionState> = _state.asStateFlow()

    /**
     * Set once at app construction. Null in unit tests and previews, where [authorization]
     * degrades to reading the stored token directly.
     */
    private var refresher: SessionRefreshing? = null

    /**
     * Serializes refreshes. The Command Center fires summary, standings and moves at once;
     * without this an expired token would start three refresh round trips, and Supabase
     * rotates the refresh token on every success — two of the three would present a token the
     * server had already retired and sign out a user whose session was fine.
     */
    private val refreshLock = Mutex()

    /**
     * Installs the token-renewal seam. Called once from the app shell, after the auth
     * repository exists — the repository reads the same secure store this manager writes, so
     * it cannot be constructed before the manager and has to be attached rather than injected.
     */
    fun attach(refresher: SessionRefreshing) {
        this.refresher = refresher
    }

    /** Read secure storage and resolve the launch state. Call once at app start. */
    fun restore() {
        val session = store.load()
        _state.value = when {
            session == null -> SessionState.SignedOut
            isExpired(session) -> SessionState.NeedsReauth
            else -> SessionState.SignedIn(session.userId)
        }
    }

    /**
     * Cold-start restore that renews before it judges.
     *
     * Plain [restore] marks any expired session [SessionState.NeedsReauth] on the spot. A
     * Supabase access token lives one hour, so a stored session is expired on essentially every
     * cold launch after the first — that one line was the most reliable way for a signed-in
     * user to be handed a sign-in screen.
     */
    suspend fun restoreRefreshing() {
        val session = store.load()
        when {
            session == null -> _state.value = SessionState.SignedOut
            !needsRefresh(session) -> _state.value = SessionState.SignedIn(session.userId)
            else -> when (authorization()) {
                is SessionAuthorization.Token -> Unit // onAuthenticated already signed us in.
                // Offline at launch holding a stale token is not evidence the session is dead.
                // Show the shell and let the first request that reaches the server decide.
                SessionAuthorization.Unavailable -> _state.value = SessionState.SignedIn(session.userId)
                SessionAuthorization.NeedsReauth -> _state.value = SessionState.NeedsReauth
            }
        }
    }

    /**
     * A bearer good for at least [REFRESH_LEEWAY_SECONDS] more, renewing first if needed.
     *
     * Every authenticated request in the app goes through here. Before it existed, callers read
     * the stored access token raw and `AuthRepository.refresh()` — which was fully implemented
     * — was never called from anywhere in the app.
     */
    suspend fun authorization(): SessionAuthorization {
        val session = store.load() ?: return SessionAuthorization.NeedsReauth
        if (!needsRefresh(session)) return SessionAuthorization.Token(session.accessToken)
        val refresher = this.refresher ?: return if (isExpired(session)) {
            SessionAuthorization.NeedsReauth
        } else {
            // No renewal seam wired (tests, previews). Hand back what we have rather than
            // inventing a re-auth the caller cannot resolve.
            SessionAuthorization.Token(session.accessToken)
        }
        return renew(refresher) { !needsRefresh(it) }
    }

    /**
     * Forces renewal even when the stored token still looks alive. Used only on the 401-retry
     * path, where the server has already contradicted our clock.
     */
    suspend fun forceRefresh(): SessionAuthorization {
        store.load() ?: return SessionAuthorization.NeedsReauth
        val refresher = this.refresher ?: return SessionAuthorization.NeedsReauth
        return renew(refresher) { false }
    }

    /**
     * One refresh at a time. [alreadyGood] lets a caller that queued behind another refresh
     * take the freshly stored token instead of starting a second round trip.
     */
    private suspend fun renew(
        refresher: SessionRefreshing,
        alreadyGood: (Session) -> Boolean,
    ): SessionAuthorization = refreshLock.withLock {
        store.load()?.let { if (alreadyGood(it)) return@withLock SessionAuthorization.Token(it.accessToken) }
        when (val outcome = refresher.refreshedSession()) {
            is SessionRefreshOutcome.Renewed -> {
                onAuthenticated(outcome.session)
                SessionAuthorization.Token(outcome.session.accessToken)
            }
            SessionRefreshOutcome.Unavailable -> SessionAuthorization.Unavailable
            SessionRefreshOutcome.Rejected -> SessionAuthorization.NeedsReauth
        }
    }

    /** Persist a freshly obtained session and move to signed-in. */
    fun onAuthenticated(session: Session) {
        store.save(session)
        _state.value = SessionState.SignedIn(session.userId)
    }

    /**
     * A refresh attempt failed. Keep the stored session (so the user id is known for the
     * re-auth prompt) but surface [SessionState.NeedsReauth]. Never crash or hang.
     */
    fun onRefreshFailed() {
        _state.value = SessionState.NeedsReauth
    }

    /**
     * Enter Demo Mode (M0c §6): a labeled, reviewer-safe signed-in state with NO stored
     * session and no real credentials. Isolated from real user data; not persisted to secure
     * storage. Reachable before any real sign-in.
     */
    fun onDemo() {
        _state.value = SessionState.SignedIn(DEMO_USER_ID)
    }

    /** Explicit sign-out or post-deletion: clear storage and return to first-run. */
    fun signOut() {
        store.clear()
        _state.value = SessionState.SignedOut
    }

    private fun isExpired(session: Session): Boolean = session.expiresAtEpochSeconds <= nowEpochSeconds()

    private fun needsRefresh(session: Session): Boolean =
        session.expiresAtEpochSeconds <= nowEpochSeconds() + REFRESH_LEEWAY_SECONDS

    companion object {
        /** Well-known id for the isolated Demo Mode session. */
        const val DEMO_USER_ID = "demo-local"

        /**
         * Renew this many seconds *before* the token actually dies. A request that starts with
         * five seconds left can easily land after expiry, and the round trip back to sign-in
         * costs the user far more than a proactive refresh costs us.
         */
        const val REFRESH_LEEWAY_SECONDS = 120L
    }
}
