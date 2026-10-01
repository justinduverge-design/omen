package com.slopssaloon.omen.app.feature.api

import com.slopssaloon.omen.core.session.InMemorySecureSessionStore
import com.slopssaloon.omen.core.session.Session
import com.slopssaloon.omen.core.session.SessionManager
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * T3 -- [TradeFindReviewViewModel], driving `TradeFindReview` from `trade-find.v1`. Swift twin:
 * `TradeFindReviewViewModelTests.swift`.
 *
 * Pins: a real batch resolves into [TradeFindReviewViewModel.ViewState.Reviewing] with an honest
 * client-side pager; `Pass` never calls the save interface and empties the stack into
 * [TradeFindReviewViewModel.ViewState.BatchExhausted]; `Save` calls the interface with the
 * candidate's `id` and its `reasoning` **verbatim** and flips to `Saved` without advancing the
 * stack or navigating anywhere; a `status: "ok"` empty batch is `ZeroCandidates`, never confused
 * with `BatchExhausted`; and `status: "unavailable"` is answered honestly as `RouteElsewhere`
 * rather than rendered as either empty state.
 */
class TradeFindReviewViewModelTest {

    private fun sessionManager(): SessionManager {
        val session = Session(userId = "user-1", accessToken = "t", refreshToken = "r", expiresAtEpochSeconds = 2_000)
        return SessionManager(InMemorySecureSessionStore(session)) { 1_000 }
    }

    private class SpySaveAction(private val outcome: TradeFindSaveOutcome = TradeFindSaveOutcome.Saved) : TradeFindSaveAction {
        val calls = mutableListOf<Pair<String, TradeFindReasoning>>()
        override suspend fun save(candidateId: String, reasoning: TradeFindReasoning): TradeFindSaveOutcome {
            calls += candidateId to reasoning
            return outcome
        }
    }

    private fun viewModel(
        findResult: OmenApiResult<TradeFindResponse>,
        saveAction: TradeFindSaveAction = StubTradeFindSaveAction(),
    ): TradeFindReviewViewModel = TradeFindReviewViewModel(
        repository = StubTradeFindRepository(findResult),
        saveAction = saveAction,
        sessionManager = sessionManager(),
    )

    private fun candidateJson(id: String, opponentName: String? = "Davante's Inferno"): String {
        val nameField = opponentName?.let { "\"$it\"" } ?: "null"
        return """
        {
          "id": "$id",
          "opponent_team_id": "2",
          "opponent_team_name": $nameField,
          "give": { "name": "Jaylen Waddle", "position": "WR", "team": "MIA", "projected_points": 14.8 },
          "receive": { "name": "Tony Pollard", "position": "RB", "team": "TEN", "projected_points": 16.2 },
          "user_lineup_delta": 4.2,
          "opponent_lineup_delta": 1.1,
          "reasoning": {
            "fills_need_for": ["user"],
            "user_receives": { "position": "RB", "need": { "status": "hole", "have": 2, "required": 3 } },
            "opponent_receives": { "position": "WR", "need": { "status": "surplus", "have": 6, "required": 3 } },
            "evidence": ["live_roster_depth", "live_lineup_projection_delta"]
          }
        }
        """.trimIndent()
    }

    private fun batchFixture(
        status: String = "ok",
        candidateIds: List<String> = listOf("c1", "c2"),
        degradedTeams: String = "[]",
        teamsSkippedForCap: String = "[]",
        budgetExceeded: Boolean = false,
        teamsConsidered: Int = 5,
        reason: String? = null,
    ): TradeFindResponse {
        val candidates = candidateIds.joinToString(",") { candidateJson(it) }
        val reasonField = reason?.let { "\"reason\": \"$it\"," } ?: ""
        val json = """
        {
          "contract_version": "trade-find.v1",
          "status": "$status",
          "platform": "sleeper",
          "league_id": "league-1",
          "team_id": "1",
          "week": 3,
          $reasonField
          "bounds": {
            "max_opponent_teams": 16,
            "max_candidates": 10,
            "teams_considered": $teamsConsidered,
            "teams_skipped_for_cap": $teamsSkippedForCap
          },
          "degraded_teams": $degradedTeams,
          "budget_exceeded": $budgetExceeded,
          "candidates": [$candidates]
        }
        """.trimIndent()
        return requireNotNull(TradeFindResponse.parse(json))
    }

    @Test
    fun `loading a real batch resolves to Reviewing with an honest pager`() = runTest {
        val sut = viewModel(OmenApiResult.Success(batchFixture()))
        sut.load("sleeper", "league-1", "1", 3)

        assertEquals(TradeFindReviewViewModel.ViewState.Reviewing, sut.viewState)
        assertEquals(2, sut.candidates.size)
        assertEquals("1 of 2", sut.positionLabel)
        assertEquals("c1", sut.currentCandidate?.id)
    }

    @Test
    fun `opponent name falls back honestly when the provider named no opponent`() = runTest {
        val json = """
        {
          "contract_version": "trade-find.v1", "status": "ok", "platform": "sleeper",
          "league_id": "l", "team_id": "1", "week": 1,
          "bounds": { "max_opponent_teams": 16, "max_candidates": 10, "teams_considered": 1, "teams_skipped_for_cap": [] },
          "degraded_teams": [], "budget_exceeded": false,
          "candidates": [${candidateJson("c1", opponentName = null)}]
        }
        """.trimIndent()
        val sut = viewModel(OmenApiResult.Success(requireNotNull(TradeFindResponse.parse(json))))
        sut.load("sleeper", "l", "1", null)
        assertEquals("another team in your league", sut.currentCandidate?.opponentDisplayName)
    }

    @Test
    fun `pass advances the stack and never calls save`() = runTest {
        val spy = SpySaveAction()
        val sut = viewModel(OmenApiResult.Success(batchFixture()), spy)
        sut.load("sleeper", "league-1", "1", 3)

        sut.pass()
        assertEquals("c2", sut.currentCandidate?.id)
        assertEquals(TradeFindReviewViewModel.ViewState.Reviewing, sut.viewState)

        sut.pass()
        assertEquals(TradeFindReviewViewModel.ViewState.BatchExhausted, sut.viewState)
        assertNull(sut.currentCandidate)
        assertTrue("Pass must never call the save interface", spy.calls.isEmpty())
    }

    @Test
    fun `save calls the interface with candidate id and reasoning verbatim`() = runTest {
        val spy = SpySaveAction()
        val sut = viewModel(OmenApiResult.Success(batchFixture()), spy)
        sut.load("sleeper", "league-1", "1", 3)

        val candidateBeforeSave = sut.currentCandidate
        sut.save()

        assertEquals(1, spy.calls.size)
        assertEquals("c1", spy.calls.first().first)
        assertEquals(candidateBeforeSave?.reasoning, spy.calls.first().second)
        assertEquals(TradeFindReviewViewModel.SaveState.Saved, sut.saveState("c1"))
        // Never advances and never changes viewState -- no queue destination exists yet.
        assertEquals("c1", sut.currentCandidate?.id)
        assertEquals(TradeFindReviewViewModel.ViewState.Reviewing, sut.viewState)
    }

    @Test
    fun `save failure reverts rather than claiming success`() = runTest {
        val spy = SpySaveAction(TradeFindSaveOutcome.Error)
        val sut = viewModel(OmenApiResult.Success(batchFixture()), spy)
        sut.load("sleeper", "league-1", "1", 3)

        sut.save()
        assertEquals(TradeFindReviewViewModel.SaveState.Error, sut.saveState("c1"))

        val retrySpy = SpySaveAction(TradeFindSaveOutcome.Saved)
        val retrySut = viewModel(OmenApiResult.Success(batchFixture()), retrySpy)
        retrySut.load("sleeper", "league-1", "1", 3)
        retrySut.save()
        assertEquals(TradeFindReviewViewModel.SaveState.Saved, retrySut.saveState("c1"))
    }

    @Test
    fun `zero candidates found is distinct from batch exhausted`() = runTest {
        val sut = viewModel(OmenApiResult.Success(batchFixture(candidateIds = emptyList())))
        sut.load("sleeper", "league-1", "1", 3)

        assertEquals(TradeFindReviewViewModel.ViewState.ZeroCandidates, sut.viewState)
        assertNotEquals(TradeFindReviewViewModel.ViewState.BatchExhausted, sut.viewState)
    }

    @Test
    fun `unavailable status routes elsewhere rather than rendering an empty state`() = runTest {
        val sut = viewModel(
            OmenApiResult.Success(
                batchFixture(status = "unavailable", candidateIds = emptyList(), reason = "own_roster_unavailable"),
            ),
        )
        sut.load("sleeper", "league-1", "1", 3)

        val state = sut.viewState as? TradeFindReviewViewModel.ViewState.RouteElsewhere
        assertTrue(state != null)
        assertEquals("own_roster_unavailable", state!!.reason)
    }

    @Test
    fun `degraded banner renders only when a team was skipped or degraded`() = runTest {
        val clean = viewModel(OmenApiResult.Success(batchFixture()))
        clean.load("sleeper", "league-1", "1", 3)
        assertNull("A clean scan must show no banner", clean.degradedShowingLabel)

        val degraded = viewModel(
            OmenApiResult.Success(
                batchFixture(
                    degradedTeams = """[{"team_id":"9","team_name":"Chubb Rock","reason":"roster_unreadable"}]""",
                    teamsConsidered = 5,
                ),
            ),
        )
        degraded.load("sleeper", "league-1", "1", 3)
        assertEquals("Showing 5 of 6 teams.", degraded.degradedShowingLabel)
        assertEquals(
            "ESPN couldn't read Chubb Rock's roster this week — Omen never proposes a trade against a roster it can't see.",
            degraded.degradedSentence,
        )
    }

    @Test
    fun `transport failure is honest rather than fabricating a batch`() = runTest {
        val sut = viewModel(OmenApiResult.Failure(OmenApiError.Server(503)))
        sut.load("sleeper", "league-1", "1", 3)

        assertEquals(TradeFindReviewViewModel.ViewState.Failed(OmenApiError.Server(503)), sut.viewState)
        assertTrue(sut.candidates.isEmpty())
    }
}
