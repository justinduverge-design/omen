package com.slopssaloon.omen.core.session

import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNotNull
import org.junit.Test

/**
 * Covers the seam that renews an access token before every authenticated request.
 * Swift twin: `OmenIOSTests/SessionRefreshTests.swift`.
 *
 * The defect these exist to prevent: `AuthRepository.refresh()` shipped fully implemented and
 * was never called from anywhere in the app, so a Supabase access token — one hour of life —
 * simply went stale in secure storage and every signed-in user was handed the re-auth screen
 * an hour after signing in.
 */
class SessionRefreshTest {

    /** Counts attempts so the coalescing behavior is provable. */
    private class StubRefresher(
        private val outcomes: MutableList<SessionRefreshOutcome>,
        private val delayMs: Long = 0,
    ) : SessionRefreshing {
        var attempts = 0
            private set

        override suspend fun refreshedSession(): SessionRefreshOutcome {
            attempts++
            if (delayMs > 0) delay(delayMs)
            return if (outcomes.isEmpty()) SessionRefreshOutcome.Rejected else outcomes.removeAt(0)
        }
    }

    private fun renewed(token: String, expiresAt: Long = 100_000) =
        SessionRefreshOutcome.Renewed(Session("u1", token, "r2", expiresAt))

    private fun manager(
        expiresAt: Long,
        now: Long = 1_000,
        refresher: SessionRefreshing? = null,
    ): Pair<SessionManager, InMemorySecureSessionStore> {
        val store = InMemorySecureSessionStore(Session("u1", "stale", "r", expiresAt))
        val manager = SessionManager(store) { now }
        refresher?.let { manager.attach(it) }
        return manager to store
    }

    // ---- authorization() ----

    @Test
    fun `a fresh token is used without refreshing`() = runBlocking {
        val refresher = StubRefresher(mutableListOf(renewed("new")))
        val (manager, _) = manager(expiresAt = 100_000, refresher = refresher)

        assertEquals(SessionAuthorization.Token("stale"), manager.authorization())
        assertEquals(0, refresher.attempts)
    }

    /**
     * The leeway is the whole point: a token with seconds left is renewed *before* the request
     * rather than after the 401 it would otherwise earn.
     */
    @Test
    fun `a token inside the leeway is renewed before use`() = runBlocking {
        val refresher = StubRefresher(mutableListOf(renewed("new")))
        // 30s of life left, well inside the 120s leeway.
        val (manager, store) = manager(expiresAt = 1_030, refresher = refresher)

        assertEquals(SessionAuthorization.Token("new"), manager.authorization())
        assertEquals(1, refresher.attempts)
        assertEquals("new", store.load()?.accessToken)
        assertEquals(SessionState.SignedIn("u1"), manager.state.value)
    }

    /** The core regression: an expired token must produce a renewed one, not a sign-in screen. */
    @Test
    fun `an expired token is renewed rather than ejecting the user`() = runBlocking {
        val refresher = StubRefresher(mutableListOf(renewed("new")))
        val (manager, _) = manager(expiresAt = 500, refresher = refresher)

        assertEquals(SessionAuthorization.Token("new"), manager.authorization())
        assertNotEquals(SessionState.NeedsReauth, manager.state.value)
    }

    /** A network failure is not a signed-out user. */
    @Test
    fun `a transport failure does not sign the user out`() = runBlocking {
        val refresher = StubRefresher(mutableListOf(SessionRefreshOutcome.Unavailable))
        val (manager, store) = manager(expiresAt = 500, refresher = refresher)

        assertEquals(SessionAuthorization.Unavailable, manager.authorization())
        assertNotEquals(SessionState.NeedsReauth, manager.state.value)
        assertNotNull("an offline refresh must not discard the stored session", store.load())
    }

    @Test
    fun `a rejected refresh token needs reauth`() = runBlocking {
        val refresher = StubRefresher(mutableListOf(SessionRefreshOutcome.Rejected))
        val (manager, _) = manager(expiresAt = 500, refresher = refresher)

        assertEquals(SessionAuthorization.NeedsReauth, manager.authorization())
    }

    // ---- restoreRefreshing() ----

    /**
     * `restore()` alone marks any expired session NeedsReauth. Since an access token lives one
     * hour, that fired on essentially every cold launch after the first.
     */
    @Test
    fun `a cold launch with an expired token renews instead of demanding sign-in`() = runBlocking {
        val (manager, _) = manager(expiresAt = 500, refresher = StubRefresher(mutableListOf(renewed("new"))))

        manager.restoreRefreshing()

        assertEquals(SessionState.SignedIn("u1"), manager.state.value)
    }

    /** Launching offline holding a stale token is not evidence the session is dead. */
    @Test
    fun `a cold launch offline keeps the user signed in`() = runBlocking {
        val refresher = StubRefresher(mutableListOf(SessionRefreshOutcome.Unavailable))
        val (manager, _) = manager(expiresAt = 500, refresher = refresher)

        manager.restoreRefreshing()

        assertEquals(SessionState.SignedIn("u1"), manager.state.value)
    }

    @Test
    fun `a cold launch with a rejected refresh token asks for sign-in`() = runBlocking {
        val refresher = StubRefresher(mutableListOf(SessionRefreshOutcome.Rejected))
        val (manager, _) = manager(expiresAt = 500, refresher = refresher)

        manager.restoreRefreshing()

        assertEquals(SessionState.NeedsReauth, manager.state.value)
    }

    @Test
    fun `a cold launch with no stored session is signed out`() = runBlocking {
        val manager = SessionManager(InMemorySecureSessionStore()) { 1_000 }
        manager.restoreRefreshing()
        assertEquals(SessionState.SignedOut, manager.state.value)
    }

    // ---- Coalescing ----

    /**
     * Supabase rotates the refresh token on every successful refresh. The Command Center fires
     * three reads at once; without serialization two of them would present a token the server
     * had already retired and sign out a user whose session was fine.
     */
    @Test
    fun `concurrent callers share one refresh round trip`() = runBlocking {
        val refresher = StubRefresher(mutableListOf(renewed("new")), delayMs = 20)
        val (manager, _) = manager(expiresAt = 500, refresher = refresher)

        val results = coroutineScope {
            listOf(
                async { manager.authorization() },
                async { manager.authorization() },
                async { manager.authorization() },
            ).map { it.await() }
        }

        assertEquals(List(3) { SessionAuthorization.Token("new") }, results)
        assertEquals("three concurrent callers must share one refresh", 1, refresher.attempts)
    }
}
