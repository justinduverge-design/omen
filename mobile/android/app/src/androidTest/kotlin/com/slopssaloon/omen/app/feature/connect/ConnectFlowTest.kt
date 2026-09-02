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
 * M5-NativeConnect — connection state machine and provider policy, Android.
 * Mirrors the iOS `ConnectFlowTests`.
 */
class ConnectFlowTest {

    private fun league(id: String = "L1") = SleeperLeague(
        id = id,
        name = "Slops Dynasty",
        season = 2026,
        scoringFormat = "PPR",
        teamName = "Team Slops",
    )

    private fun account() = ResolvedSleeperAccount(username = "slops", leagues = listOf(league()))

    /**
     * [token] null models a caller with no stored session. Bearers now come from
     * `SessionManager.authorization()`, which renews an expiring token before the request.
     */
    private fun viewModel(
        repository: ConnectRepository,
        token: String? = "t",
    ) = ConnectViewModel(
        repository = repository,
        sessionManager = SessionManager(
            InMemorySecureSessionStore(token?.let { Session("u1", it, "r", 100_000) }),
        ) { 1_000 },
        // Sleeper never opens a browser; a stub that would only report cancellation makes that
        // a provable property of these cases rather than an assumption.
        authSession = StubProviderAuthSession(),
    )

    // MARK: Provider policy

    /**
     * Sleeper and Yahoo both connect natively; ESPN is research-gated by the onboarding
     * contract §5 and stays on the web path.
     *
     * Yahoo read `OnHold` here for four days after the entitlement was restored on 2026-08-28
     * — Android was describing a state the system had already left, and the copy told testers
     * to wait for something that had happened.
     */
    @Test
    fun sleeperAndYahooAreConnectableInTheAppAndEspnIsNot() {
        assertTrue(ConnectProvider.Sleeper.availability is ConnectAvailability.Available)
        assertTrue(ConnectProvider.Yahoo.availability is ConnectAvailability.Available)
        assertTrue(ConnectProvider.Espn.availability is ConnectAvailability.UseWeb)
    }

    /** An unavailable provider must never dead-end. */
    @Test
    fun selectingAnUnavailableProviderExplainsRatherThanFailing() = runBlocking {
        val vm = viewModel(StubConnectRepository())

        vm.selectProvider(ConnectProvider.Espn)

        val state = vm.state
        assertTrue(state is ConnectState.UnsupportedOnMobile)
        assertEquals(ConnectProvider.Espn, (state as ConnectState.UnsupportedOnMobile).provider)
    }

    @Test
    fun espnCopyRoutesToTheWebPath() {
        val availability = ConnectProvider.Espn.availability as ConnectAvailability.UseWeb
        assertTrue(availability.reason.lowercase().contains("web"))
    }

    // MARK: Resolve

    @Test
    fun resolveMovesToLeagueChoice() = runBlocking {
        val vm = viewModel(StubConnectRepository(resolveResult = Result.success(account())))
        vm.username = "slops"

        vm.resolveUsername()

        assertTrue(vm.state is ConnectState.ChoosingLeague)
        assertEquals(1, (vm.state as ConnectState.ChoosingLeague).account.leagues.size)
    }

    @Test
    fun unknownUsernameIsRetryableWithActionableCopy() = runBlocking {
        val vm = viewModel(
            StubConnectRepository(
                resolveResult = Result.failure(ConnectException(ConnectFailure.UsernameNotFound)),
            ),
        )
        vm.username = "nope"

        vm.resolveUsername()

        val state = vm.state as ConnectState.RetryableError
        assertEquals(ConnectFailure.UsernameNotFound, state.failure)
        assertTrue(state.failure.message.contains("spelling"))
    }

    /** An account with no leagues must offer the demo, not a spinner. */
    @Test
    fun accountWithNoLeaguesOffersAnAlternative() {
        assertTrue(ConnectFailure.NoLeaguesForSeason.message.lowercase().contains("demo"))
    }

    @Test
    fun missingSessionAsksForReauthRatherThanFailingGenerically() = runBlocking {
        val vm = viewModel(StubConnectRepository(), token = null)
        vm.username = "slops"

        vm.resolveUsername()

        assertEquals(ConnectState.NeedsReauth, vm.state)
    }

    /** Spec §6: no generic endless "Loading…". */
    @Test
    fun everyWaitingStateCarriesItsOwnProgressSentence() {
        assertEquals("Looking up your Sleeper account…", ConnectState.ResolvingAccount.progressLabel)
        assertTrue(ConnectState.ValidatingConnection(league()).progressLabel != null)
        assertTrue(ConnectState.ResolvingAccount.isBusy)
        assertTrue(ConnectState.ValidatingConnection(league()).isBusy)
    }

    // MARK: Connect and idempotency

    @Test
    fun selectingALeagueConnectsAndReportsTheLeague() = runBlocking {
        val vm = viewModel(
            StubConnectRepository(
                resolveResult = Result.success(account()),
                connectResult = Result.success(Unit),
            ),
        )
        vm.username = "slops"
        vm.resolveUsername()

        vm.selectLeague(league())

        assertEquals("L1", (vm.state as ConnectState.Connected).league.id)
    }

    /**
     * Spec §7: retrying the *same* attempt must reuse its request id, or the backend replay
     * guard cannot recognize the retry and a duplicate connection becomes possible.
     */
    @Test
    fun retryingTheSameAttemptReusesTheRequestId() = runBlocking {
        val repository = StubConnectRepository(
            resolveResult = Result.success(account()),
            connectResult = Result.failure(ConnectException(ConnectFailure.Network)),
        )
        val vm = viewModel(repository)
        vm.username = "slops"
        vm.resolveUsername()

        vm.selectLeague(league())
        vm.retryConnect(league(), "slops")

        assertEquals(2, repository.requestIds.size)
        assertEquals(repository.requestIds[0], repository.requestIds[1])
    }

    /** Must satisfy the backend `NATIVE_REQUEST_ID_PATTERN` or the route 422s before Sleeper. */
    @Test
    fun generatedRequestIdMatchesTheBackendPattern() {
        val id = ConnectViewModel.defaultRequestId()

        assertTrue(id.length in 16..128)
        assertTrue(Regex("^[A-Za-z0-9_-]+$").matches(id))
    }

    @Test
    fun inProgressDuplicateIsSurfacedAsItsOwnFailure() = runBlocking {
        val vm = viewModel(
            StubConnectRepository(
                resolveResult = Result.success(account()),
                connectResult = Result.failure(ConnectException(ConnectFailure.AlreadyInProgress)),
            ),
        )
        vm.username = "slops"
        vm.resolveUsername()

        vm.selectLeague(league())

        assertEquals(ConnectFailure.AlreadyInProgress, (vm.state as ConnectState.RetryableError).failure)
    }

    // MARK: Cancellation

    /** Spec §6: "Cancellation is normal, not an error." */
    @Test
    fun cancellationIsItsOwnStateNotAnError() {
        val vm = viewModel(StubConnectRepository())

        vm.cancel()

        assertEquals(ConnectState.Canceled, vm.state)
        assertFalse(vm.state is ConnectState.RetryableError)
    }

    /** A new attempt after cancelling must not replay the abandoned request id. */
    @Test
    fun cancellingClearsThePendingAttempt() = runBlocking {
        val repository = StubConnectRepository(
            resolveResult = Result.success(account()),
            connectResult = Result.failure(ConnectException(ConnectFailure.Network)),
        )
        val vm = viewModel(repository)
        vm.username = "slops"
        vm.resolveUsername()
        vm.selectLeague(league())

        vm.cancel()
        vm.resolveUsername()
        vm.selectLeague(league())

        assertNotEquals(repository.requestIds.first(), repository.requestIds.last())
    }

    // MARK: Copy safety

    /** The contract forbids implying Omen collects a provider password or exposing raw detail. */
    @Test
    fun noFailureCopyMentionsPasswordsOrCookies() {
        ConnectFailure.entries.forEach { failure ->
            val lowered = failure.message.lowercase()
            assertFalse(lowered.contains("password"))
            assertFalse(lowered.contains("cookie"))
            assertFalse(lowered.contains("token"))
        }
    }

    @Test
    fun leagueSubtitleOmitsMissingFieldsRatherThanPrintingPlaceholders() {
        val sparse = SleeperLeague("L2", "Sparse", 2026, scoringFormat = null, teamName = null)

        assertEquals("2026", sparse.subtitle)
        assertFalse(sparse.subtitle.contains("null"))
    }
}
