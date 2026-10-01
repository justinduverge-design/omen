package com.slopssaloon.omen.app.feature.api

import com.slopssaloon.omen.app.feature.commandcenter.OmenTradePartner
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

    // -------------------------------------------------------------------------------------- T5

    /**
     * `GET /api/trade/roster`'s `teams` array is documented as opponent rosters only (the server
     * never lists the caller's own team) — the client has no `is_you` flag to filter on, so this
     * fixture intentionally lists only the two teams a real response would.
     */
    private fun threeTeamRosterFixture(): TradeRosterResponse = requireNotNull(
        TradeRosterResponse.parse(
            """
            {
              "contract_version": "trade-roster.v1", "status": "ok", "platform": "sleeper", "week": 3,
              "teams": [
                { "team_id": "2", "team_name": "Davante's Inferno", "players": [
                  { "player_key": "sleeper:200", "name": "Ja'Marr Chase", "position": "WR", "team": "CIN" }
                ] },
                { "team_id": "3", "team_name": "Chubb Rock", "players": [
                  { "player_key": "sleeper:300", "name": "Tyjae Spears", "position": "RB", "team": "TEN" }
                ] }
              ]
            }
            """.trimIndent(),
        ),
    )

    private fun threeTeamCapableViewModel(
        threeTeamResult: OmenApiResult<TradeThreeTeamCompare> = OmenApiResult.Failure(OmenApiError.Network),
        scope: kotlinx.coroutines.CoroutineScope,
    ): TradeViewModel {
        val repo = StubTradeRepository(
            OmenApiResult.Failure(OmenApiError.Network),
            OmenApiResult.Success(threeTeamRosterFixture()),
            OmenApiResult.Failure(OmenApiError.Network),
            threeTeamResult,
        )
        val vm = TradeViewModel(repo, StubPlayerSearchRepository(OmenApiResult.Success(emptyList())), sessionManager(), scope)
        vm.useLeague("sleeper", "league-1")
        return vm
    }

    /**
     * **The strict regression requirement.** A user without a third partner must see exactly
     * today's existing 2-team experience — `thirdPartner`/`removalDisclosure` null, `sides` built
     * from the plain 2-team `offer`, `read`/`submission` null, unchanged from before T5.
     */
    @Test
    fun `with no third partner the build state is exactly the existing 2-team shape`() = runTest {
        val sut = threeTeamCapableViewModel(scope = this)
        sut.loadRoster("user-1")
        advanceUntilIdle()
        sut.selectPartnerTeam("2")

        val state = sut.rosterBuildState
        assertNull(state.thirdPartner)
        assertNull(state.removalDisclosure)
        assertNull(state.read)
        assertNull(state.submission)
        assertEquals("Two teams", state.kicker)
        assertEquals(listOf("You send", "You receive"), state.sides.map { it.heading })
        assertTrue(sut.threeTeamRecipientChoices.isEmpty())

        val rosters = sut.rosterScreenState?.rosters as OmenTradeRosterState.Rosters.Read
        assertEquals("Davante's Inferno", rosters.teamName)
        assertEquals(1, rosters.playerCount)
        assertEquals(OmenTradeRosterState.Availability.Available, rosters.rows.first().availability)
        assertTrue(rosters.rows.first().recipients.isEmpty())
    }

    @Test
    fun `openPartnerPicker is a no-op without three-team support`() = runTest {
        val sut = threeTeamCapableViewModel(scope = this)
        sut.loadRoster("user-1")
        advanceUntilIdle()
        sut.selectPartnerTeam("2")

        sut.openPartnerPicker()
        assertTrue(!sut.isPartnerPickerPresented)
    }

    @Test
    fun `adding a third partner activates the three-team partners row and clears candidates`() = runTest {
        val sut = threeTeamCapableViewModel(scope = this)
        sut.loadRoster("user-1")
        advanceUntilIdle()
        sut.selectPartnerTeam("2")

        assertEquals(listOf("3"), sut.partnerPickerCandidates.map { it.id })

        val candidate = sut.partnerPickerCandidates.first()
        sut.addThirdPartner(candidate)

        assertEquals("3", sut.thirdPartnerTeamId)
        assertTrue(!sut.isPartnerPickerPresented)
        val state = sut.rosterBuildState
        assertEquals("3", state.thirdPartner?.id)
        assertEquals("Three teams", state.kicker)
        assertEquals(listOf("Send to you", "Send to Chubb Rock"), sut.threeTeamRecipientChoices.map { it.label })
    }

    @Test
    fun `choosing a recipient builds a leg and marks the row Added`() = runTest {
        val sut = threeTeamCapableViewModel(scope = this)
        sut.loadRoster("user-1")
        advanceUntilIdle()
        sut.selectPartnerTeam("2")
        sut.addThirdPartner(OmenTradePartner("3", "CHB", "Chubb Rock"))

        sut.chooseThreeTeamRecipient("sleeper:200", "3")

        assertEquals(1, sut.threeTeamLegs.size)
        assertEquals("2", sut.threeTeamLegs.first().from)
        assertEquals("3", sut.threeTeamLegs.first().to)
        assertEquals("Ja'Marr Chase", sut.threeTeamLegs.first().players.first().name)

        val rosters = sut.rosterScreenState?.rosters as OmenTradeRosterState.Rosters.Read
        assertEquals(OmenTradeRosterState.Availability.Added, rosters.rows.first().availability)
        assertTrue("an already-added row offers no further choice", rosters.rows.first().recipients.isEmpty())
    }

    @Test
    fun `removing the third partner discards its legs and returns to two-team state`() = runTest {
        val sut = threeTeamCapableViewModel(scope = this)
        sut.loadRoster("user-1")
        advanceUntilIdle()
        sut.selectPartnerTeam("2")
        sut.addThirdPartner(OmenTradePartner("3", "CHB", "Chubb Rock"))
        sut.chooseThreeTeamRecipient("sleeper:200", "3")
        assertEquals(1, sut.threeTeamLegs.size)

        sut.removeThirdPartner()

        assertNull(sut.thirdPartnerTeamId)
        assertTrue("every leg touching the removed team is discarded", sut.threeTeamLegs.isEmpty())
        assertEquals("Removed Chubb Rock. Any legs with them were cleared too.", sut.thirdPartnerRemovalDisclosure)
        assertNull(sut.rosterBuildState.thirdPartner)
    }

    @Test
    fun `compareThreeTeam refuses anything short of the three-team shape`() = runTest {
        val sut = threeTeamCapableViewModel(scope = this)
        sut.loadRoster("user-1")
        advanceUntilIdle()
        sut.selectPartnerTeam("2")
        sut.addThirdPartner(OmenTradePartner("3", "CHB", "Chubb Rock"))
        sut.chooseThreeTeamRecipient("sleeper:200", "3")
        // Only one leg so far -- T1 requires at least two.

        sut.compareThreeTeam("user-1")
        advanceUntilIdle()
        assertTrue(sut.threeTeamViewState is TradeViewModel.ThreeTeamViewState.Idle)
    }

    @Test
    fun `compareThreeTeam succeeds and builds the split-handoff checklist`() = runTest {
        val compareResponse = requireNotNull(
            TradeThreeTeamCompare.parse(
                """
                {
                  "contract_version": "trade-compare.v2", "trade_shape": "three_team", "team_count": 3,
                  "participants": [
                    {"team_id": "you", "team_name": null,
                     "sends": {"total_value": 4, "player_count": 1, "missing_projection_count": 0, "players": [{"name": "Jonathan Taylor", "position": "RB", "player_key": null}]},
                     "receives": {"total_value": 3, "player_count": 1, "missing_projection_count": 0, "players": [{"name": "Tyjae Spears", "position": "RB", "player_key": null}]},
                     "net_value": -1, "verdict_state": "favors_you", "acceptance_likelihood": "likely", "confidence": "medium",
                     "roster_fit": null, "evaluability": {"status": "evaluable", "reason": null, "missing_projection_count": 0, "total_player_count": 2}}
                  ],
                  "evaluability": {"status": "evaluable", "reason": null, "missing_projection_count": 0, "total_player_count": 2},
                  "verdict_state": "favors_you",
                  "analysis_context": {"mode": "neutral", "platform": "sleeper", "league_id": null, "league_name": null, "applied": [], "unavailable_reason": null},
                  "submission": {"mode": "split_handoff", "reason": null, "caption": "Submit it as linked two-team trades.", "steps": ["Leg 1: send X.", "Leg 2: send Y."]}
                }
                """.trimIndent(),
            ),
        )
        val sut = threeTeamCapableViewModel(threeTeamResult = OmenApiResult.Success(compareResponse), scope = this)
        sut.loadRoster("user-1")
        advanceUntilIdle()
        sut.selectPartnerTeam("2")
        sut.addThirdPartner(OmenTradePartner("3", "CHB", "Chubb Rock"))
        sut.chooseThreeTeamRecipient("sleeper:200", "3")
        sut.chooseThreeTeamRecipient("sleeper:200", "you")

        sut.compareThreeTeam("user-1")
        advanceUntilIdle()

        val loaded = sut.threeTeamViewState as? TradeViewModel.ThreeTeamViewState.Loaded
        assertTrue(loaded != null)
        assertEquals(TradeCompare.VerdictState.FavorsYou, loaded!!.result.verdictState)

        val state = sut.rosterBuildState
        assertEquals("This favors you", state.read?.headline)
        assertEquals(2, state.submission?.steps?.size)
        assertEquals("0 of 2 legs sent.", state.submission?.progressCaption)
        assertEquals(listOf(false, false), state.submission?.stepDone)

        sut.toggleThreeTeamSubmissionStep(0)
        assertEquals("1 of 2 legs sent.", sut.rosterBuildState.submission?.progressCaption)
        assertEquals(listOf(true, false), sut.rosterBuildState.submission?.stepDone)

        assertEquals("Ja'Marr Chase", sut.copyTextForThreeTeamStep(0))
    }

    @Test
    fun `compareThreeTeam failure is named`() = runTest {
        val sut = threeTeamCapableViewModel(threeTeamResult = OmenApiResult.Failure(OmenApiError.Server(503)), scope = this)
        sut.loadRoster("user-1")
        advanceUntilIdle()
        sut.selectPartnerTeam("2")
        sut.addThirdPartner(OmenTradePartner("3", "CHB", "Chubb Rock"))
        sut.chooseThreeTeamRecipient("sleeper:200", "3")
        sut.chooseThreeTeamRecipient("sleeper:200", "you")

        sut.compareThreeTeam("user-1")
        advanceUntilIdle()

        assertEquals(TradeViewModel.ThreeTeamViewState.Failed(OmenApiError.Server(503)), sut.threeTeamViewState)
    }
}
