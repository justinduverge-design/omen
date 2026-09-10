package com.slopssaloon.omen.app.feature.api

import com.slopssaloon.omen.app.feature.commandcenter.OmenLedgerPreviewState
import com.slopssaloon.omen.app.feature.commandcenter.OmenWaiverWatchState
import com.slopssaloon.omen.core.session.InMemorySecureSessionStore
import com.slopssaloon.omen.core.session.Session
import com.slopssaloon.omen.core.session.SessionManager
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * M5-Native-API-Client slice E — Ledger wiring in [CommandCenterViewModel].
 * Swift twin: the "Slice E — Ledger" section of `CommandCenterViewModelTests.swift`.
 */
class CommandCenterLedgerTest {

    private fun sessionManager(): SessionManager = SessionManager(
        InMemorySecureSessionStore(
            Session(
                userId = "user-1",
                accessToken = "t",
                refreshToken = "refresh",
                expiresAtEpochSeconds = 2_000,
            ),
        ),
    ) { 1_000 }

    private fun summary(omenStatus: String): DashboardSummary = requireNotNull(
        DashboardSummary.parse(
            """
            {
              "contract_version": "dashboard-summary.v1",
              "is_mock": false,
              "user": { "favorite_team": null },
              "platforms": {
                "yahoo": { "connected": false },
                "sleeper": { "connected": true, "username": "slops" },
                "espn": { "connected": false }
              },
              "tools": {
                "omen_of_the_week": { "available": true, "status": "$omenStatus" },
                "waiver_wire": { "available": true, "status": "ready" }
              }
            }
            """.trimIndent(),
        ),
    )

    private fun history(json: String): MovesHistory = requireNotNull(MovesHistory.parse(json))
    private fun waiver(json: String): WaiverAnalysis = requireNotNull(WaiverAnalysis.parse(json))

    private fun viewModel(
        omenStatus: String = "ready",
        moves: MovesRepository,
        waiver: WaiverAnalysisRepository = StubWaiverAnalysisRepository(),
    ) = CommandCenterViewModel(
        repository = StubDashboardRepository(OmenApiResult.Success(summary(omenStatus))),
        leagueRepository = StubLeagueRepository(OmenApiResult.Failure(OmenApiError.Network)),
        movesRepository = moves,
        waiverRepository = waiver,
        sessionManager = sessionManager(),
    )

    private class CountingMovesRepository : MovesRepository {
        var calls = 0
        override suspend fun fetchMoves(accessToken: String): OmenApiResult<MovesHistory> {
            calls += 1
            return OmenApiResult.Failure(OmenApiError.Network)
        }
    }

    @Test
    fun movesFillTheLedgerSectionAfterTheShellLoads() = runBlocking {
        val model = viewModel(
            moves = StubMovesRepository(
                OmenApiResult.Success(
                    history(
                        """
                        {
                          "contract_version": "moves-history.v1", "season": 2026,
                          "summary": {"wins":1,"losses":0,"pending":0,"avg_effectiveness_pct":62,"followed_count":1,"total_count":1},
                          "moves": [{
                            "id": 41, "season": 2026, "week": 6, "move_type": "start_sit",
                            "recommendation": "Start DeVonta Smith over Chris Olave",
                            "followed": true, "stars": null, "outcome": "win",
                            "effectiveness_pct": 62.4, "created_at": "2026-10-14T12:00:00Z"
                          }]
                        }
                        """.trimIndent(),
                    ),
                ),
            ),
        )

        model.load("user-1")

        val state = model.commandCenterState.ledger as OmenLedgerPreviewState.Entries
        assertEquals("41", state.entries.single().id)
        assertEquals("WEEK 6", state.entries.single().period)
        assertEquals("Outcome: win · followed · 62% effective", state.entries.single().outcome)
    }

    /** A real user with a connected league and no recorded moves. Empty is a real answer. */
    @Test
    fun emptyMoveListRendersTheEmptyLedgerRatherThanAnError() = runBlocking {
        val model = viewModel(
            moves = StubMovesRepository(
                OmenApiResult.Success(
                    history("""{"contract_version":"moves-history.v1","season":2026,"summary":null,"moves":[]}"""),
                ),
            ),
        )

        model.load("user-1")

        assertTrue(model.commandCenterState.ledger is OmenLedgerPreviewState.Empty)
    }

    /**
     * "No Ledger entries yet" is a statement about the user's history. A failed read must never
     * be allowed to make it — and the shell must survive the failure.
     */
    @Test
    fun ledgerFailureRendersAnErrorRatherThanClaimingNoEntries() = runBlocking {
        val model = viewModel(
            moves = StubMovesRepository(OmenApiResult.Failure(OmenApiError.Server(500))),
        )

        model.load("user-1")

        assertNull("a Ledger failure must not fail the whole screen", model.failure)
        val state = model.commandCenterState.ledger as OmenLedgerPreviewState.Error
        assertFalse("status codes are for logs, not for users", state.message.contains("500"))
    }

    @Test
    fun needsPlatformSkipsTheMovesCallEntirely() = runBlocking {
        val moves = CountingMovesRepository()
        val model = viewModel(omenStatus = "needs_platform", moves = moves)

        model.load("user-1")

        assertEquals(0, moves.calls)
        assertTrue(model.commandCenterState.ledger is OmenLedgerPreviewState.NotConnected)
    }

    /**
     * facts-of-record #7. Demo renders labeled fixtures and the live Ledger path is unreachable
     * from it — no request, and no live rows mixed into the demo surface.
     */
    @Test
    fun demoNeverIssuesTheMovesCallAndKeepsLabeledFixtures() = runBlocking {
        val moves = CountingMovesRepository()
        val model = viewModel(moves = moves)

        model.load(SessionManager.DEMO_USER_ID)

        assertEquals("demo must not issue a network request", 0, moves.calls)
        assertNull("demo must not populate live Ledger state", model.ledger)
        val state = model.commandCenterState.ledger as OmenLedgerPreviewState.Entries
        assertTrue(
            "every demo Ledger row stays labeled as demo",
            state.entries.all { it.period.startsWith("DEMO") },
        )
    }

    @Test
    fun waiverAnalysisFillsWaiverWatchAfterTheShellLoads() = runBlocking {
        val model = viewModel(
            moves = StubMovesRepository(
                OmenApiResult.Success(history("""{"contract_version":"moves-history.v1","season":2026,"summary":null,"moves":[]}""")),
            ),
            waiver = StubWaiverAnalysisRepository(
                OmenApiResult.Success(
                    waiver(
                        """
                        {
                          "contract_version":"waiver-analysis.v1",
                          "state":"confirmed_opportunity",
                          "deadline":"Wed 3:00 AM",
                          "best_move":{
                            "add":{"name":"Sample Waiver RB","position":"RB","team":"NYG","projected_points":12.4,"status":"FA"},
                            "drop":{"name":"Bench Depth","position":"WR","team":"SEA","projected_points":4.1,"status":null},
                            "improvement":5.6,
                            "why_now":"Sample Waiver RB covers an unavailable starter.",
                            "bid":{"amount":7,"basis":"value"}
                          },
                          "alternatives":[
                            {"player":{"name":"Sample Pivot","position":"WR","team":"ATL","projected_points":9.1,"status":"FA"},"improvement":2.2,"tradeoff":"Lower projection, cleaner drop."}
                          ]
                        }
                        """.trimIndent(),
                    ),
                ),
            ),
        )

        model.load("user-1")

        val state = model.commandCenterState.waiverWatch as OmenWaiverWatchState.Urgent
        assertEquals("Deadline Wed 3:00 AM", state.deadlineText)
        assertEquals("Sample Waiver RB", state.bestMove.playerName)
        assertEquals("RB", state.bestMove.position)
        assertTrue(state.bestMove.availability.contains("Suggested bid 7"))
        assertEquals("Sample Pivot", state.longHorizonMoves.first().playerName)
    }

    @Test
    fun waiverAnalysisFailureLeavesDashboardWaiverStateInPlace() = runBlocking {
        val model = viewModel(
            moves = StubMovesRepository(
                OmenApiResult.Success(history("""{"contract_version":"moves-history.v1","season":2026,"summary":null,"moves":[]}""")),
            ),
            waiver = StubWaiverAnalysisRepository(OmenApiResult.Failure(OmenApiError.Server(503))),
        )

        model.load("user-1")

        assertTrue(model.commandCenterState.waiverWatch is OmenWaiverWatchState.AvailabilityUnknown)
    }
}
