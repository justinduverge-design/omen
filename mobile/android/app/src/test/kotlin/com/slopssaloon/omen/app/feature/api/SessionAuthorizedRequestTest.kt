package com.slopssaloon.omen.app.feature.api

import com.slopssaloon.omen.core.session.InMemorySecureSessionStore
import com.slopssaloon.omen.core.session.Session
import com.slopssaloon.omen.core.session.SessionManager
import com.slopssaloon.omen.core.session.SessionRefreshOutcome
import com.slopssaloon.omen.core.session.SessionRefreshing
import com.slopssaloon.omen.core.session.SessionState
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Test

/**
 * The request wrapper: renew before the call, and on a 401 against a token that looked alive,
 * force one refresh and retry exactly once. Swift twin: `SessionRefreshTests.swift`.
 */
class SessionAuthorizedRequestTest {

    private class StubRefresher(private val outcomes: MutableList<SessionRefreshOutcome>) : SessionRefreshing {
        override suspend fun refreshedSession(): SessionRefreshOutcome =
            if (outcomes.isEmpty()) SessionRefreshOutcome.Rejected else outcomes.removeAt(0)
    }

    private fun manager(expiresAt: Long, vararg outcomes: SessionRefreshOutcome): SessionManager {
        val store = InMemorySecureSessionStore(Session("u1", "stale", "r", expiresAt))
        return SessionManager(store) { 1_000 }.apply { attach(StubRefresher(outcomes.toMutableList())) }
    }

    private fun renewed(token: String) =
        SessionRefreshOutcome.Renewed(Session("u1", token, "r2", 100_000))

    @Test
    fun `a successful request receives the renewed token`() = runBlocking {
        val manager = manager(500, renewed("new"))
        val seen = mutableListOf<String>()

        val result = manager.authorized { token ->
            seen += token
            OmenApiResult.Success("ok")
        }

        assertEquals(listOf("new"), seen)
        assertEquals(OmenApiResult.Success("ok"), result)
    }

    /**
     * A 401 on a token that looked alive — revoked, rotated, clock skew — forces one refresh
     * and one retry.
     */
    @Test
    fun `an unauthorized response forces one refresh and one retry`() = runBlocking {
        val manager = manager(100_000, renewed("second"))
        val seen = mutableListOf<String>()

        val result = manager.authorized { token ->
            seen += token
            if (token == "stale") OmenApiResult.Failure(OmenApiError.Unauthorized) else OmenApiResult.Success("ok")
        }

        assertEquals("exactly one retry, with the renewed token", listOf("stale", "second"), seen)
        assertEquals(OmenApiResult.Success("ok"), result)
        assertNotEquals(SessionState.NeedsReauth, manager.state.value)
    }

    /**
     * One retry, never a loop. A freshly-minted token being refused is a real authorization
     * problem, and the second 401 is believed.
     */
    @Test
    fun `a second unauthorized is believed and does not loop`() = runBlocking {
        val manager = manager(100_000, renewed("second"))
        var attempts = 0

        val result = manager.authorized {
            attempts++
            OmenApiResult.Failure(OmenApiError.Unauthorized)
        }

        assertEquals(2, attempts)
        assertEquals(OmenApiResult.Failure(OmenApiError.Unauthorized), result)
        assertEquals(SessionState.NeedsReauth, manager.state.value)
    }

    /**
     * The rule that keeps an offline user out of the sign-in screen: a refresh that could not
     * reach the server resolves to Network, which call sites render as a retry.
     */
    @Test
    fun `an offline refresh surfaces network rather than unauthorized`() = runBlocking {
        val manager = manager(500, SessionRefreshOutcome.Unavailable)

        val result = manager.authorized { OmenApiResult.Success("unreached") }

        assertEquals(OmenApiResult.Failure(OmenApiError.Network), result)
        assertNotEquals(SessionState.NeedsReauth, manager.state.value)
    }
}
