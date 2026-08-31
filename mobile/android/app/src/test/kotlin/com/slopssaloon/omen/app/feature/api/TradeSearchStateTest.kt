package com.slopssaloon.omen.app.feature.api

import com.slopssaloon.omen.core.session.InMemorySecureSessionStore
import com.slopssaloon.omen.core.session.SessionManager
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * `F-BAR-34` — a failed player search must never render as "no results".
 * Swift twin: `TradeSearchStateTests.swift`.
 *
 * The original code funnelled every `Failure` into `suggestions = emptyList()`, which is
 * pixel-identical on screen to a successful search that found nothing. `/api/players/search`
 * shares a 30-request-per-minute-per-IP bucket with `/api/trade`, `/api/demo` and
 * `/api/draft-assistant`, so 429 is not exotic — it is the failure real users hit, and it was
 * being reported to them as "this player does not exist".
 */
class TradeSearchStateTest {

    private fun sessionManager(): SessionManager =
        SessionManager(InMemorySecureSessionStore()) { 1_000 }

    private val row = PlayerSearchResult(
        id = "1",
        name = "Justin Jefferson",
        position = "WR",
        team = "MIN",
    )

    private fun viewModel(
        search: OmenApiResult<List<PlayerSearchResult>>,
        scope: kotlinx.coroutines.CoroutineScope,
    ) = TradeViewModel(
        repository = StubTradeRepository(OmenApiResult.Failure(OmenApiError.Network)),
        playerSearch = StubPlayerSearchRepository(search),
        sessionManager = sessionManager(),
        accessTokenProvider = { null },
        scope = scope,
    )

    @Test
    fun `a search that returns rows produces Results`() = runTest {
        val sut = viewModel(OmenApiResult.Success(listOf(row)), this)
        sut.search("Jeff", TradeViewModel.Side.Send)
        advanceUntilIdle()
        assertEquals(TradeViewModel.SearchState.Results(listOf(row)), sut.searchState)
        assertEquals(listOf(row), sut.suggestions)
    }

    /** The honest empty case: the server answered and knows no such player. */
    @Test
    fun `a search that returns nothing produces Empty, not Failed`() = runTest {
        val sut = viewModel(OmenApiResult.Success(emptyList()), this)
        sut.search("Zzzzzz", TradeViewModel.Side.Send)
        advanceUntilIdle()
        assertEquals(TradeViewModel.SearchState.Empty("Zzzzzz"), sut.searchState)
        assertTrue(sut.suggestions.isEmpty())
    }

    /** The regression this file exists for. 429 is a failure, not an absence. */
    @Test
    fun `a rate-limited search produces Failed, never Empty`() = runTest {
        val sut = viewModel(OmenApiResult.Failure(OmenApiError.Server(429)), this)
        sut.search("Jefferson", TradeViewModel.Side.Send)
        advanceUntilIdle()
        assertEquals(
            TradeViewModel.SearchState.Failed(OmenApiError.Server(429)),
            sut.searchState,
        )
        assertNotEquals(TradeViewModel.SearchState.Empty("Jefferson"), sut.searchState)
        assertTrue("A failure must not masquerade as rows.", sut.suggestions.isEmpty())
    }

    @Test
    fun `network and decode failures also produce Failed`() = runTest {
        for (error in listOf(OmenApiError.Network, OmenApiError.Decode, OmenApiError.Server(500))) {
            val sut = viewModel(OmenApiResult.Failure(error), this)
            sut.search("Jefferson", TradeViewModel.Side.Send)
            advanceUntilIdle()
            assertEquals(TradeViewModel.SearchState.Failed(error), sut.searchState)
        }
    }

    @Test
    fun `a query below the minimum length is Idle rather than Empty`() = runTest {
        val sut = viewModel(OmenApiResult.Success(emptyList()), this)
        sut.search("J", TradeViewModel.Side.Send)
        advanceUntilIdle()
        assertEquals(TradeViewModel.SearchState.Idle, sut.searchState)
        assertNull(sut.searchingSide)
    }

    @Test
    fun `clearing suggestions returns to Idle`() = runTest {
        val sut = viewModel(OmenApiResult.Success(listOf(row)), this)
        sut.search("Jeff", TradeViewModel.Side.Send)
        advanceUntilIdle()
        sut.clearSuggestions()
        assertEquals(TradeViewModel.SearchState.Idle, sut.searchState)
        assertNull(sut.searchingSide)
    }

    /**
     * The rate-limit copy has to be its own sentence. Folding 429 into the generic server
     * message is what made the limit invisible in the first place.
     */
    @Test
    fun `rate-limit copy is distinct and names the wait`() {
        val limited = OmenApiError.Server(429)
        val other = OmenApiError.Server(500)
        assertEquals("Too many searches", TradeViewModel.searchTitleFor(limited))
        assertNotEquals(
            TradeViewModel.searchMessageFor(limited),
            TradeViewModel.searchMessageFor(other),
        )
        assertTrue(TradeViewModel.searchMessageFor(limited).contains("minute"))
    }

    /** Every failure keeps the manual path open — autocomplete is an accelerator, never a gate. */
    @Test
    fun `every search failure message offers the manual path`() {
        val errors = listOf(
            OmenApiError.Network,
            OmenApiError.Unauthorized,
            OmenApiError.Decode,
            OmenApiError.Server(429),
            OmenApiError.Server(500),
        )
        for (error in errors) {
            assertTrue(
                "$error must still tell the user they can type the name.",
                TradeViewModel.searchMessageFor(error).contains("press Add"),
            )
        }
    }


    @Test
    fun `an unresolved player failure is an honest refusal`() {
        val message = TradeViewModel.messageFor(OmenApiError.Server(422))
        assertTrue(message.contains("couldn't verify"))
        assertTrue(message.contains("search suggestions"))
        assertNotEquals(message, TradeViewModel.messageFor(OmenApiError.Server(500)))
    }
}
