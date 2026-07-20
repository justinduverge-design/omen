package com.slopssaloon.omen.core.session

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlin.test.assertNull

class SessionManagerTest {

    private fun manager(store: SecureSessionStore, now: Long = 1_000L) =
        SessionManager(store, nowEpochSeconds = { now })

    @Test fun restoreSignedOutWhenEmpty() {
        val m = manager(InMemorySecureSessionStore())
        m.restore()
        assertEquals(SessionState.SignedOut, m.state.value)
    }

    @Test fun restoreSignedInForFreshSession() {
        val store = InMemorySecureSessionStore(Session("u1", "a", "r", expiresAtEpochSeconds = 5_000L))
        val m = manager(store, now = 1_000L)
        m.restore()
        assertEquals(SessionState.SignedIn("u1"), m.state.value)
    }

    @Test fun restoreNeedsReauthForExpiredSession() {
        val store = InMemorySecureSessionStore(Session("u1", "a", "r", expiresAtEpochSeconds = 500L))
        val m = manager(store, now = 1_000L)
        m.restore()
        assertEquals(SessionState.NeedsReauth, m.state.value)
    }

    @Test fun onAuthenticatedPersistsAndSignsIn() {
        val store = InMemorySecureSessionStore()
        val m = manager(store)
        m.onAuthenticated(Session("u2", "a", "r", Long.MAX_VALUE))
        assertEquals(SessionState.SignedIn("u2"), m.state.value)
        assertEquals("u2", store.load()?.userId)
    }

    @Test fun signOutClearsStore() {
        val store = InMemorySecureSessionStore(Session("u1", "a", "r", Long.MAX_VALUE))
        val m = manager(store)
        m.signOut()
        assertEquals(SessionState.SignedOut, m.state.value)
        assertNull(store.load())
    }

    @Test fun refreshFailureSurfacesNeedsReauth() {
        val m = manager(InMemorySecureSessionStore())
        m.onRefreshFailed()
        assertIs<SessionState.NeedsReauth>(m.state.value)
    }
}
