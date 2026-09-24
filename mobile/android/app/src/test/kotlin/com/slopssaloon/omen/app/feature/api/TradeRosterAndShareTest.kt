package com.slopssaloon.omen.app.feature.api

import com.slopssaloon.omen.app.feature.commandcenter.OmenTradeRosterState
import com.slopssaloon.omen.core.session.InMemorySecureSessionStore
import com.slopssaloon.omen.core.session.Session
import com.slopssaloon.omen.core.session.SessionManager
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * `GET /api/trade/roster` and `POST /api/trade/share` wired into [TradeViewModel].
 * Swift twin: `TradeRosterAndShareTests.swift`.
 *
 * Pins: a connected league resolves a real opponent roster into
 * `OmenTradeRosterState.Rosters.Read`; an unavailable answer (ESPN/Yahoo re-auth needed, a
 * league that hasn't drafted) renders `.PermanentlyUnavailable` with the server's own reason,
 * never a crash and never fabricated rows; and the share client actually calls the route and
 * handles both success and failure.
 */
class TradeRosterAndShareTest {

    private fun sessionManager(): SessionManager {
        val session = Session(userId = "user-1", accessToken = "t", refreshToken = "r", expiresAtEpochSeconds = 2_000)
        return SessionManager(InMemorySecureSessionStore(session)) { 1_000 }
    }

    private fun rosterFixture(
        status: String = "ok",
        reason: String? = null,
        platform: String = "sleeper",
    ): TradeRosterResponse {
        val reasonField = reason?.let { "\"reason\": \"$it\"," } ?: ""
        val json = """
            {
              "contract_version": "trade-roster.v1",
              "status": "$status",
              "platform": "$platform",
              $reasonField
              "week": 3,
              "teams": [
                { "team_id": "1", "team_name": "Own Team", "players": [] },
                { "team_id": "2", "team_name": "Rival Team", "players": [
                  { "player_key": "sleeper:200", "name": "Rival Player", "position": "WR", "team": "SEA" }
                ] }
              ]
            }
        """.trimIndent()
        return requireNotNull(TradeRosterResponse.parse(json))
    }

    private fun viewModel(
        rosterResult: OmenApiResult<TradeRosterResponse> = OmenApiResult.Failure(OmenApiError.Network),
        shareResult: OmenApiResult<TradeShareResponse> = OmenApiResult.Failure(OmenApiError.Network),
        compareResult: OmenApiResult<TradeCompare> = OmenApiResult.Failure(OmenApiError.Network),
        scope: kotlinx.coroutines.CoroutineScope,
    ): TradeViewModel {
        val vm = TradeViewModel(
            repository = StubTradeRepository(compareResult, rosterResult, shareResult),
            playerSearch = StubPlayerSearchRepository(OmenApiResult.Success(emptyList())),
            sessionManager = sessionManager(),
            scope = scope,
        )
        vm.useLeague("sleeper", "league-1")
        return vm
    }

    @Test
    fun `loading the roster resolves a real opponent roster`() = runTest {
        val sut = viewModel(rosterResult = OmenApiResult.Success(rosterFixture()), scope = this)
        sut.loadRoster("user-1")
        advanceUntilIdle()

        val loaded = sut.rosterBrowseState as? TradeViewModel.RosterBrowseState.Loaded
        assertTrue(loaded != null)
        assertTrue(loaded!!.response.isAvailable)
        assertEquals(2, loaded.response.teams.size)
        assertEquals("1", sut.selectedPartnerTeamId)

        sut.selectPartnerTeam("2")
        val screenState = sut.rosterScreenState
        val rosters = screenState?.rosters as? OmenTradeRosterState.Rosters.Read
        assertTrue(rosters != null)
        assertEquals("Rival Team", rosters!!.teamName)
        assertEquals(1, rosters.playerCount)
        assertEquals("Rival Player", rosters.rows.first().name)
        assertEquals(OmenTradeRosterState.Availability.Available, rosters.rows.first().availability)
    }

    @Test
    fun `adding a player from the roster marks that row Added`() = runTest {
        val sut = viewModel(rosterResult = OmenApiResult.Success(rosterFixture()), scope = this)
        sut.loadRoster("user-1")
        advanceUntilIdle()
        sut.selectPartnerTeam("2")

        val loaded = sut.rosterBrowseState as TradeViewModel.RosterBrowseState.Loaded
        val player = loaded.response.teams.first { it.id == "2" }.players.first()
        sut.addFromRoster(player)

        assertTrue(sut.offer.receive.any { it.playerKey == "sleeper:200" })
        val rosters = sut.rosterScreenState?.rosters as OmenTradeRosterState.Rosters.Read
        assertEquals(OmenTradeRosterState.Availability.Added, rosters.rows.first().availability)
    }

    @Test
    fun `an unavailable response renders PermanentlyUnavailable with the server reason`() = runTest {
        val sut = viewModel(
            rosterResult = OmenApiResult.Success(
                rosterFixture(status = "unavailable", reason = "provider_reauth_required", platform = "espn"),
            ),
            scope = this,
        )
        sut.loadRoster("user-1")
        advanceUntilIdle()

        val rosters = sut.rosterScreenState?.rosters as? OmenTradeRosterState.Rosters.PermanentlyUnavailable
        assertTrue(rosters != null)
        assertTrue(
            "Sentence should name the real reason, got: ${rosters!!.sentence}",
            rosters.sentence.contains("reconnected"),
        )
    }

    @Test
    fun `provider unsupported renders honestly rather than crashing`() = runTest {
        val sut = viewModel(
            rosterResult = OmenApiResult.Success(
                rosterFixture(status = "unavailable", reason = "provider_unsupported", platform = "yahoo"),
            ),
            scope = this,
        )
        sut.loadRoster("user-1")
        advanceUntilIdle()

        assertTrue(sut.rosterScreenState?.rosters is OmenTradeRosterState.Rosters.PermanentlyUnavailable)
    }

    @Test
    fun `a transport failure is distinct from the server's own honest unavailable answer`() = runTest {
        val sut = viewModel(rosterResult = OmenApiResult.Failure(OmenApiError.Server(503)), scope = this)
        sut.loadRoster("user-1")
        advanceUntilIdle()

        assertEquals(TradeViewModel.RosterBrowseState.Failed(OmenApiError.Server(503)), sut.rosterBrowseState)
        // The screen state itself models no failure case -- must be null rather than silently
        // rendering a stale or fabricated roster.
        assertNull(sut.rosterScreenState)
    }

    @Test
    fun `no league connected fails rather than guessing one`() = runTest {
        val vm = TradeViewModel(
            repository = StubTradeRepository(
                OmenApiResult.Failure(OmenApiError.Network),
                OmenApiResult.Success(rosterFixture()),
            ),
            playerSearch = StubPlayerSearchRepository(OmenApiResult.Success(emptyList())),
            sessionManager = sessionManager(),
            scope = this,
        )
        vm.loadRoster("user-1")
        advanceUntilIdle()
        assertEquals(TradeViewModel.RosterBrowseState.Failed(OmenApiError.Network), vm.rosterBrowseState)
    }

    @Test
    fun `share calls the route and handles success`() = runTest {
        val response = requireNotNull(
            TradeShareResponse.parse(
                """{"contract_version":"trade-share.v1","hash":"abc-123","api_path":"/api/trade/share/abc-123","expires_at":"2026-10-24T00:00:00Z"}""",
            ),
        )
        val sut = viewModel(shareResult = OmenApiResult.Success(response), scope = this)
        sut.add(PlayerSearchResult(id = "a", name = "A", position = "RB", team = "SEA"), TradeViewModel.Side.Send)
        sut.add(PlayerSearchResult(id = "b", name = "B", position = "WR", team = "DET"), TradeViewModel.Side.Receive)

        sut.share("user-1")
        advanceUntilIdle()

        assertEquals(TradeViewModel.ShareState.Shared(response), sut.shareState)
    }

    @Test
    fun `share failure is named rather than silent`() = runTest {
        val sut = viewModel(shareResult = OmenApiResult.Failure(OmenApiError.Server(503)), scope = this)
        sut.add(PlayerSearchResult(id = "a", name = "A", position = "RB", team = "SEA"), TradeViewModel.Side.Send)
        sut.add(PlayerSearchResult(id = "b", name = "B", position = "WR", team = "DET"), TradeViewModel.Side.Receive)

        sut.share("user-1")
        advanceUntilIdle()

        assertEquals(TradeViewModel.ShareState.Failed(OmenApiError.Server(503)), sut.shareState)
    }

    @Test
    fun `names are off by default and the toggle flips it`() = runTest {
        val sut = viewModel(scope = this)
        assertTrue(!sut.shareIncludeNames)
        sut.toggleShareInclusion("names")
        assertTrue(sut.shareIncludeNames)
    }
}
