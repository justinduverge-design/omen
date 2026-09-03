package com.slopssaloon.omen.app.feature.connect

import com.slopssaloon.omen.core.session.InMemorySecureSessionStore
import com.slopssaloon.omen.core.session.Session
import com.slopssaloon.omen.core.session.SessionManager
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * W1-A on Android — parity with iOS `OmenIOSTests/ConnectFlowTests.swift`.
 *
 * The mechanism these tests sit on top of was proven before any of it was written:
 * `androidTest/.../HttpOnlyCookieSpikeTest` shows `CookieManager` returns HttpOnly cookie values.
 * These cover the flow and the promises, which is the half a spike cannot check.
 */
class EspnConnectFlowTest {

    private fun sessionManager(token: String? = "t"): SessionManager {
        val session = token?.let {
            Session(userId = "user-1", accessToken = it, refreshToken = "r", expiresAtEpochSeconds = 2_000)
        }
        return SessionManager(InMemorySecureSessionStore(session)) { 1_000 }
    }

    /** Records what the sheet reported without holding a real WebView. */
    private class FakeCookieReader(
        var session: Pair<String, String>? = "S2VALUE" to "{SWIDVALUE}",
    ) : EspnCookieReader {
        var takeCount = 0
        var cleared = 0
        override fun hasSession() = session != null
        override fun takeSession(): Pair<String, String>? {
            takeCount++
            return session
        }
        override fun sessionDiagnostic() =
            if (session == null) "espn_s2: not found · SWID: not found" else "espn_s2: www.espn.com"
        override fun clear() { cleared++ }
    }

    private suspend fun signedIn(
        repository: StubConnectRepository,
        reader: FakeCookieReader = FakeCookieReader(),
    ): ConnectViewModel {
        val viewModel = ConnectViewModel(repository, sessionManager(), StubProviderAuthSession())
        viewModel.selectProvider(ConnectProvider.Espn)
        viewModel.beginEspnSignIn(reader)
        viewModel.espnSignInProgressed(EspnSignInProgress.SignedIn("123456", "7"))
        return viewModel
    }

    // ---- Policy ----

    @Test
    fun `all three providers connect in the app`() {
        assertEquals(ConnectAvailability.Available, ConnectProvider.Sleeper.availability)
        assertEquals(ConnectAvailability.Available, ConnectProvider.Yahoo.availability)
        assertEquals(ConnectAvailability.Available, ConnectProvider.Espn.availability)
    }

    /** Choosing ESPN lands on consent — never straight into ESPN's sign-in. */
    @Test
    fun `choosing espn shows consent before anything opens`() = runTest {
        val viewModel = ConnectViewModel(StubConnectRepository(), sessionManager(), StubProviderAuthSession())

        viewModel.selectProvider(ConnectProvider.Espn)

        assertEquals(ConnectState.EspnConsent, viewModel.state)
        assertNull(viewModel.espnCookieReader)
    }

    /** The consent sentence is what App Review reads, on both stores. */
    @Test
    fun `consent copy names who the user signs in to and disclaims affiliation`() {
        val copy = EspnHandoffCopy.CONSENT_BODY

        assertTrue(copy.contains("ESPN's own sign-in"))
        assertTrue(copy.contains("never sees your ESPN password"))
        assertTrue(copy.lowercase().contains("not affiliated with"))
        assertTrue(copy.lowercase().contains("disconnect"))
    }

    /** Store-facing copy must never use credential vocabulary. */
    @Test
    fun `espn copy never uses credential vocabulary`() {
        val surfaces = listOf(
            EspnHandoffCopy.CONSENT_TITLE, EspnHandoffCopy.CONSENT_BODY,
            EspnHandoffCopy.CONSENT_CONTINUE, EspnHandoffCopy.SIGN_IN_WAITING,
            EspnHandoffCopy.SIGN_IN_READY, EspnHandoffCopy.SIGN_IN_CONNECT,
            EspnHandoffCopy.NO_LEAGUES_FOUND, EspnHandoffCopy.DISCOVERY_UNAVAILABLE,
            EspnHandoffCopy.SIGN_IN_FELL_BACK, EspnHandoffCopy.LEAGUE_ID_HINT,
        )

        for (copy in surfaces) {
            val lowered = copy.lowercase()
            for (banned in listOf("cookie", "espn_s2", "swid", "token", "credential")) {
                assertFalse("$banned must not appear in: $copy", lowered.contains(banned))
            }
            // The only permitted password sentence is the promise Omen never sees one.
            if (lowered.contains("password")) {
                assertTrue("only the never-sees promise is allowed: $copy", lowered.contains("never"))
            }
        }
    }

    // ---- Discovery ----

    /** Signing in should produce a list, not a homework assignment. */
    @Test
    fun `signing in discovers the account's leagues without the user typing anything`() = runTest {
        val repository = StubConnectRepository()
        repository.espnDiscoverResult = Result.success(
            listOf(
                EspnLeagueOption("1", "Slops Saloon FF Showdown", 2026, "3", "Titans"),
                EspnLeagueOption("2", "Everything Backwards", 2026, "5", "Justin's Scary Team"),
            ),
        )
        val viewModel = signedIn(repository)

        val state = viewModel.state
        assertTrue("expected a picker, got $state", state is ConnectState.ChoosingEspnLeague)
        assertEquals(2, (state as ConnectState.ChoosingEspnLeague).options.size)
        assertEquals(1, repository.espnDiscoveries)
        // Discovery must not bind a league on the user's behalf.
        assertTrue(repository.espnConnectAttempts.isEmpty())
    }

    @Test
    fun `picking a discovered league connects that league and its team`() = runTest {
        val repository = StubConnectRepository()
        val option = EspnLeagueOption("13338821", "Slops Saloon FF Showdown", 2026, "3", "Titans")
        repository.espnDiscoverResult = Result.success(listOf(option))
        repository.espnConnectResult = Result.success(Unit)
        repository.espnConnectionResult = Result.success(EspnConnection("Slops Saloon FF Showdown", "Titans"))
        val viewModel = signedIn(repository)

        viewModel.connectEspnLeague(option)

        assertTrue(viewModel.state is ConnectState.EspnConnected)
        assertEquals(1, repository.espnConnectAttempts.size)
        assertEquals("13338821", repository.espnConnectAttempts.first().first)
        assertEquals("3", repository.espnConnectAttempts.first().second)
        assertTrue("the session must actually have been sent", repository.espnConnectAttempts.first().third)
    }

    /** Discovery failing is not a failed connection — nothing was connected. */
    @Test
    fun `discovery failing falls back to manual entry rather than failing the connection`() = runTest {
        val repository = StubConnectRepository()
        repository.espnDiscoverResult = Result.failure(ConnectException(ConnectFailure.Network))
        val viewModel = signedIn(repository)

        assertEquals(ConnectState.EspnSigningIn, viewModel.state)
        assertEquals(EspnHandoffCopy.DISCOVERY_UNAVAILABLE, viewModel.espnNotice)
    }

    /** An account with no football leagues is an honest empty answer, not an error. */
    @Test
    fun `an account with no football leagues is not reported as a failure`() = runTest {
        val repository = StubConnectRepository()
        repository.espnDiscoverResult = Result.success(emptyList())
        val viewModel = signedIn(repository)

        assertEquals(ConnectState.EspnSigningIn, viewModel.state)
        assertEquals(EspnHandoffCopy.NO_LEAGUES_FOUND, viewModel.espnNotice)
    }

    // ---- Manual entry, and the dead-button bug ----

    /**
     * The fix for the dead ends found on a real iPhone: ESPN's landing pages carry no `leagueId`,
     * so a signed-in user could be stranded with a permanently disabled button.
     */
    @Test
    fun `a signed-in user can connect by typing the league id when espn reveals nothing`() = runTest {
        val repository = StubConnectRepository()
        repository.espnConnectResult = Result.success(Unit)
        val viewModel = ConnectViewModel(repository, sessionManager(), StubProviderAuthSession())
        viewModel.selectProvider(ConnectProvider.Espn)
        viewModel.beginEspnSignIn(FakeCookieReader())
        viewModel.espnSignInProgressed(EspnSignInProgress.SignedIn(null, null))

        viewModel.espnLeagueId = " 998877 "
        assertTrue(viewModel.canConnectEspn)
        viewModel.confirmEspnConnection()

        assertEquals(1, repository.espnConnectAttempts.size)
        // Trimmed — a trailing space from a paste must not become part of the id.
        assertEquals("998877", repository.espnConnectAttempts.first().first)
    }

    /** Neither half alone is enough to send a request. */
    @Test
    fun `connect does nothing without both a session and a league`() = runTest {
        val repository = StubConnectRepository()
        repository.espnConnectResult = Result.success(Unit)
        val viewModel = ConnectViewModel(repository, sessionManager(), StubProviderAuthSession())
        viewModel.selectProvider(ConnectProvider.Espn)
        viewModel.beginEspnSignIn(FakeCookieReader())

        viewModel.espnLeagueId = "123456"
        assertFalse("signed out cannot connect", viewModel.canConnectEspn)

        viewModel.espnLeagueId = "   "
        viewModel.espnSignInProgressed(EspnSignInProgress.SignedIn(null, null))
        assertFalse("no league cannot connect", viewModel.canConnectEspn)
        viewModel.confirmEspnConnection()
        assertTrue(repository.espnConnectAttempts.isEmpty())
    }

    /** Detection pre-fills an empty field and must never overwrite what the user typed. */
    @Test
    fun `detection pre-fills but never overwrites the user's own entry`() = runTest {
        val viewModel = ConnectViewModel(StubConnectRepository(), sessionManager(), StubProviderAuthSession())
        viewModel.selectProvider(ConnectProvider.Espn)
        viewModel.beginEspnSignIn(FakeCookieReader(session = null))

        viewModel.espnSignInProgressed(EspnSignInProgress.SignedIn("111", null))
        assertEquals("111", viewModel.espnLeagueId)

        viewModel.espnLeagueId = "222"
        viewModel.espnSignInProgressed(EspnSignInProgress.SignedIn("333", null))
        assertEquals("ESPN navigating must not swap the user's entry", "222", viewModel.espnLeagueId)
    }

    // ---- Failure handling ----

    /** Contract §W1-A failure table: one retry, then the desktop path. Never a loop. */
    @Test
    fun `an unreadable session retries once then routes to the desktop path`() = runTest {
        val repository = StubConnectRepository()
        repository.espnConnectResult = Result.failure(ConnectException(ConnectFailure.EspnSessionUnreadable))
        repository.espnDiscoverResult = Result.success(
            listOf(EspnLeagueOption("1", "L", 2026, null, null)),
        )
        val viewModel = signedIn(repository)

        viewModel.connectEspnLeague(EspnLeagueOption("1", "L", 2026, null, null))
        assertTrue(viewModel.state is ConnectState.RetryableError)

        viewModel.beginEspnSignIn(FakeCookieReader())
        viewModel.espnSignInProgressed(EspnSignInProgress.SignedIn("1", null))
        viewModel.connectEspnLeague(EspnLeagueOption("1", "L", 2026, null, null))

        assertTrue(
            "second failure should route to the desktop path, got ${viewModel.state}",
            viewModel.state is ConnectState.UnsupportedOnMobile,
        )
        assertEquals(EspnHandoffCopy.SIGN_IN_FELL_BACK, viewModel.espnNotice)
    }

    /**
     * Regression, ported from the iOS bug: the sheet is shown while the state is `EspnSigningIn`,
     * so any move off it dismisses the sheet. An unguarded cancel meant a **successful** discovery
     * cancelled itself and the user landed on "Nothing was connected" with leagues already
     * fetched and thrown away.
     */
    @Test
    fun `a dismissal caused by moving on does not cancel the flow`() = runTest {
        val repository = StubConnectRepository()
        repository.espnDiscoverResult = Result.success(
            listOf(EspnLeagueOption("1", "Slops Saloon FF Showdown", 2026, "3", "Titans")),
        )
        val viewModel = signedIn(repository)
        assertTrue(viewModel.state is ConnectState.ChoosingEspnLeague)

        viewModel.cancelEspnSignIn()

        assertTrue(
            "moving on must not cancel: ${viewModel.state}",
            viewModel.state is ConnectState.ChoosingEspnLeague,
        )
    }

    /** Backing out really is normal, and leaves no session behind. */
    @Test
    fun `cancelling espn sign-in is not an error and clears the jar`() = runTest {
        val reader = FakeCookieReader()
        val viewModel = ConnectViewModel(StubConnectRepository(), sessionManager(), StubProviderAuthSession())
        viewModel.selectProvider(ConnectProvider.Espn)
        viewModel.beginEspnSignIn(reader)

        viewModel.cancelEspnSignIn()

        assertEquals(ConnectState.Canceled, viewModel.state)
        assertNull(viewModel.espnCookieReader)
        assertTrue("the cookie jar must be cleared on cancel", reader.cleared > 0)
    }

    // ---- Leak prevention ----

    /**
     * **`EspnCapture` must never render its session values.** A Kotlin data class prints every
     * property, so the generated `toString` would put a live ESPN session into any log line,
     * crash frame, or assertion message that touched it.
     */
    @Test
    fun `espn capture redacts itself when printed`() {
        val capture = EspnCapture("SECRET_S2", "{SECRET_SWID}", "123456", "7")

        for (rendered in listOf(capture.toString(), "$capture")) {
            assertFalse("leaked espn_s2: $rendered", rendered.contains("SECRET_S2"))
            assertFalse("leaked SWID: $rendered", rendered.contains("SECRET_SWID"))
            assertTrue(rendered.contains("redacted"))
        }
        // The non-secret half survives, because a type nobody can debug gets replaced by one
        // that logs everything.
        assertTrue(capture.toString().contains("123456"))
    }

    @Test
    fun `connect state never carries the espn session`() = runTest {
        val repository = StubConnectRepository()
        repository.espnConnectResult = Result.success(Unit)
        val viewModel = signedIn(repository, FakeCookieReader("SECRET_S2" to "{SECRET_SWID}"))

        val rendered = viewModel.state.toString()
        assertFalse(rendered.contains("SECRET_S2"))
        assertFalse(rendered.contains("SECRET_SWID"))
    }

    // ---- ESPN page parsing ----

    @Test
    fun `the entry page and the landing page are distinct`() {
        assertFalse(EspnWebSignIn.ENTRY_URL == EspnWebSignIn.AFTER_SIGN_IN_URL)
        // `/football/welcome` is ESPN's new-user signup pitch; it stranded an existing manager.
        assertFalse(EspnWebSignIn.ENTRY_URL.contains("welcome"))
        assertFalse(EspnWebSignIn.AFTER_SIGN_IN_URL.contains("welcome"))
    }

    /**
     * A stale cookie under one ESPN domain scope can coexist with a valid one under another, and
     * the server rejects the stale value without saying why. Exact host must win.
     */
    @Test
    fun `cookie selection prefers the same domain order as the desktop helper`() {
        val jar = mapOf(
            "https://espn.com" to "espn_s2=STALE",
            "https://fantasy.espn.com" to "espn_s2=ALSO_STALE",
            "https://www.espn.com" to "espn_s2=FRESH",
        )

        assertEquals("FRESH", EspnWebSignIn.cookieValue("espn_s2", jar))
        assertNull(EspnWebSignIn.cookieValue("SWID", jar))
    }

    @Test
    fun `cookie parsing is case-insensitive and ignores empty values`() {
        assertEquals("V", EspnWebSignIn.parseCookie("swid", "SWID=V; other=1"))
        assertNull(EspnWebSignIn.parseCookie("espn_s2", "espn_s2=; other=1"))
        assertNull(EspnWebSignIn.parseCookie("espn_s2", null))
    }

    @Test
    fun `a league with no name still renders something the user can pick`() {
        val unnamed = EspnLeagueOption("7", null, 2026, null, null)
        assertEquals("Untitled ESPN league", unnamed.displayName)
        assertEquals("2026", unnamed.subtitle)

        val bare = EspnLeagueOption("8", "Named", null, null, null)
        assertNull("an empty subtitle must be absent, not a placeholder", bare.subtitle)
    }

    @Test
    fun `found-leagues heading is singular for one league`() {
        assertEquals("Found your league", EspnHandoffCopy.foundLeaguesTitle(1))
        assertEquals("Found 3 leagues", EspnHandoffCopy.foundLeaguesTitle(3))
    }
}
