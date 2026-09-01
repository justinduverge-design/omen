package com.slopssaloon.omen.app.feature.connect

import com.slopssaloon.omen.core.session.InMemorySecureSessionStore
import com.slopssaloon.omen.core.session.Session
import com.slopssaloon.omen.core.session.SessionManager
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Native Yahoo connect: browser authorization → server-confirmed connection → league bind.
 * Swift twin: `OmenIOSTests/ConnectFlowTests.swift` → `YahooConnectFlowTests`.
 *
 * The flow these cover is the one a beta tester could not complete. Every route already existed
 * server-side; the client refused to offer the provider at all.
 */
class YahooConnectFlowTest {

    private val authorizeUrl = "https://api.login.yahoo.com/oauth2/request_auth?client_id=x&state=y"

    private fun signedIn() = SessionManager(
        InMemorySecureSessionStore(Session("u1", "t", "r", 9_999_999_999)),
    ) { 1_000 }

    private fun leagues(count: Int) = (1..count).map { YahooLeague("nfl.l.$it", "League $it", 2026) }

    private fun viewModel(
        repository: ConnectRepository,
        authSession: ProviderAuthSessionPresenting,
    ) = ConnectViewModel(repository, signedIn(), authSession)

    /** The happy path with more than one league: the user is asked which one. */
    @Test
    fun `authorizing then confirming offers the league picker`() = runBlocking {
        val repository = StubConnectRepository(
            yahooAuthResult = Result.success(authorizeUrl),
            yahooLeaguesResult = Result.success(leagues(2)),
        )
        val authSession = StubProviderAuthSession(ProviderAuthOutcome.Returned("connected"))
        val vm = viewModel(repository, authSession)

        vm.connectYahoo()

        // The app must open the URL the *server* built, never one it assembled itself — the
        // CSRF state lives in that URL and is bound to a server-side `oauth_state` row.
        assertEquals(listOf(authorizeUrl), authSession.requestedUrls)
        val state = vm.state
        assertTrue("expected ChoosingYahooLeague, got $state", state is ConnectState.ChoosingYahooLeague)
        assertEquals(2, (state as ConnectState.ChoosingYahooLeague).leagues.size)
    }

    /** One league is not a choice — binding it removes a screen with one possible answer. */
    @Test
    fun `a single league is bound without asking the user to pick it`() = runBlocking {
        val repository = StubConnectRepository(
            yahooAuthResult = Result.success(authorizeUrl),
            yahooLeaguesResult = Result.success(leagues(1)),
            yahooBindResult = Result.success(Unit),
        )
        val vm = viewModel(repository, StubProviderAuthSession(ProviderAuthOutcome.Returned("connected")))

        vm.connectYahoo()

        val state = vm.state
        assertTrue("expected YahooConnected, got $state", state is ConnectState.YahooConnected)
        assertEquals("nfl.l.1", (state as ConnectState.YahooConnected).league.id)
        assertEquals(listOf("nfl.l.1"), repository.boundYahooLeagueIds)
    }

    /** Contract §6: cancellation is normal, not an error. Dismissing the Custom Tab. */
    @Test
    fun `dismissing the browser is cancellation not failure`() = runBlocking {
        val repository = StubConnectRepository(yahooAuthResult = Result.success(authorizeUrl))
        val vm = viewModel(repository, StubProviderAuthSession(ProviderAuthOutcome.Canceled))

        vm.connectYahoo()

        assertEquals(ConnectState.Canceled, vm.state)
    }

    /**
     * Declining inside Yahoo's own screen returns `status=cancelled`. Same meaning, so it must
     * read the same way — not as an error the user caused.
     */
    @Test
    fun `declining inside Yahoo reads as cancellation not failure`() = runBlocking {
        val repository = StubConnectRepository(yahooAuthResult = Result.success(authorizeUrl))
        val vm = viewModel(repository, StubProviderAuthSession(ProviderAuthOutcome.Returned("cancelled")))

        vm.connectYahoo()

        assertEquals(ConnectState.Canceled, vm.state)
    }

    /**
     * `status=connected` is not proof. Any app on the device can fire that deep link, and more
     * usefully, a user can approve in Yahoo while the token exchange fails behind them.
     */
    @Test
    fun `a connected status is not believed without server confirmation`() = runBlocking {
        val repository = StubConnectRepository(
            yahooAuthResult = Result.success(authorizeUrl),
            yahooLeaguesResult = Result.failure(ConnectException(ConnectFailure.ProviderNotConnected)),
        )
        val vm = viewModel(repository, StubProviderAuthSession(ProviderAuthOutcome.Returned("connected")))

        vm.connectYahoo()

        assertEquals(ConnectState.RetryableError(ConnectFailure.ProviderNotConnected), vm.state)
    }

    /**
     * The retry after a failed confirmation re-checks the server rather than reopening the
     * browser — sending a user who is in fact connected back through Yahoo is the loop this
     * flow exists to avoid.
     */
    @Test
    fun `checking again confirms without reopening the browser`() = runBlocking {
        val repository = StubConnectRepository(yahooLeaguesResult = Result.success(leagues(2)))
        val authSession = StubProviderAuthSession()
        val vm = viewModel(repository, authSession)

        vm.confirmYahooConnection()

        assertTrue("re-checking must not reopen the browser", authSession.requestedUrls.isEmpty())
        assertTrue(vm.state is ConnectState.ChoosingYahooLeague)
    }

    /**
     * A 503 from `requireYahooEnabled` is a product state with its own sentence, not the
     * generic "problem on our side".
     */
    @Test
    fun `a paused entitlement gets its own sentence`() = runBlocking {
        val repository = StubConnectRepository(
            yahooAuthResult = Result.failure(ConnectException(ConnectFailure.ProviderUnavailable)),
        )
        val vm = viewModel(repository, StubProviderAuthSession())

        vm.connectYahoo()

        assertEquals(ConnectState.RetryableError(ConnectFailure.ProviderUnavailable), vm.state)
        assertTrue(ConnectFailure.ProviderUnavailable.message.contains("Yahoo"))
        assertFalse(ConnectFailure.ProviderUnavailable.message.contains("our side"))
    }

    /**
     * Selecting Yahoo in the picker starts its own flow. It must not fall through to the
     * Sleeper username field, which is what `NotStarted` renders.
     */
    @Test
    fun `selecting Yahoo starts its own flow`() = runBlocking {
        val repository = StubConnectRepository(
            yahooAuthResult = Result.success(authorizeUrl),
            yahooLeaguesResult = Result.success(leagues(2)),
        )
        val vm = viewModel(repository, StubProviderAuthSession(ProviderAuthOutcome.Returned("connected")))

        vm.selectProvider(ConnectProvider.Yahoo)

        assertNotEquals(ConnectState.NotStarted, vm.state)
        assertTrue(vm.state is ConnectState.ChoosingYahooLeague)
    }

    /**
     * Android read `OnHold` for Yahoo for four days after the entitlement was restored on
     * 2026-08-28 — describing a state the system had already left, and telling testers to wait
     * for something that had happened.
     */
    @Test
    fun `sleeper and yahoo are connectable and espn is not`() {
        assertTrue(ConnectProvider.Sleeper.availability is ConnectAvailability.Available)
        assertTrue(ConnectProvider.Yahoo.availability is ConnectAvailability.Available)
        assertTrue(ConnectProvider.Espn.availability is ConnectAvailability.UseWeb)
    }

    /** Every waiting state names what is happening (contract §6: never a bare "Loading…"). */
    @Test
    fun `every Yahoo waiting state says what is happening`() {
        val waiting = listOf(
            ConnectState.StartingYahooAuthorization,
            ConnectState.AwaitingYahooReturn,
            ConnectState.ConfirmingYahooConnection,
            ConnectState.BindingYahooLeague(YahooLeague("nfl.l.1", "L", 2026)),
        )
        waiting.forEach { state ->
            assertTrue("$state should disable controls", state.isBusy)
            assertTrue("$state needs its own sentence", state.progressLabel != null)
        }
    }
}
