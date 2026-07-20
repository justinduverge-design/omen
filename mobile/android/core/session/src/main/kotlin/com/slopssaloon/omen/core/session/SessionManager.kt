package com.slopssaloon.omen.core.session

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

    /** Read secure storage and resolve the launch state. Call once at app start. */
    fun restore() {
        val session = store.load()
        _state.value = when {
            session == null -> SessionState.SignedOut
            isExpired(session) -> SessionState.NeedsReauth
            else -> SessionState.SignedIn(session.userId)
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

    companion object {
        /** Well-known id for the isolated Demo Mode session. */
        const val DEMO_USER_ID = "demo-local"
    }
}
