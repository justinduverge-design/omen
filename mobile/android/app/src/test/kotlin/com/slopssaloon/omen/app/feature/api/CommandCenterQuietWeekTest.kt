package com.slopssaloon.omen.app.feature.api

import com.slopssaloon.omen.core.session.InMemorySecureSessionStore
import com.slopssaloon.omen.core.session.Session
import com.slopssaloon.omen.core.session.SessionManager
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Test

/**
 * `quiet-week.v1` wiring in [CommandCenterViewModel] — the reachability-closing case for
 * `OmenCommandQuietScreen`, which previously existed only in `ScreenshotScenarios.kt`.
 * iOS twin: the "Quiet week" section of `CommandCenterViewModelTests.swift`.
 */
class CommandCenterQuietWeekTest {

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

    private fun summary(omenStatus: String, week: Int): DashboardSummary = requireNotNull(
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
              },
              "game_week": { "week": $week, "phase": "preparing", "day": "tuesday", "is_off_season": false }
            }
            """.trimIndent(),
        ),
    )

    private fun quietWeek(
        eligible: Boolean,
        variant: String?,
        headline: String?,
        body: String?,
        nextRead: String?,
    ): QuietWeekResponse = requireNotNull(
        QuietWeekResponse.parse(
            """
            {
              "contract_version": "quiet-week.v1",
              "eligible": $eligible,
              "variant": ${variant?.let { "\"$it\"" } ?: "null"},
              "reasons": [],
              "source_state": "empty",
              "headline": ${headline?.let { "\"$it\"" } ?: "null"},
              "body": ${body?.let { "\"$it\"" } ?: "null"},
              "next_read": ${nextRead?.let { "\"$it\"" } ?: "null"}
            }
            """.trimIndent(),
        ),
    )

    private fun viewModel(
        omenStatus: String = "ready",
        week: Int = 9,
        quietWeekRepository: QuietWeekRepository,
    ) = CommandCenterViewModel(
        repository = StubDashboardRepository(OmenApiResult.Success(summary(omenStatus, week))),
        leagueRepository = StubLeagueRepository(result = OmenApiResult.Failure(OmenApiError.Network)),
        movesRepository = StubMovesRepository(OmenApiResult.Failure(OmenApiError.Network)),
        waiverRepository = StubWaiverAnalysisRepository(),
        quietWeekRepository = quietWeekRepository,
        sessionManager = sessionManager(),
    )

    @Test
    fun eligibleQuietWeekProducesQuietState() = runBlocking {
        val model = viewModel(
            quietWeekRepository = StubQuietWeekRepository(
                OmenApiResult.Success(
                    quietWeek(
                        eligible = true,
                        variant = "straight",
                        headline = "Nothing worth moving for.",
                        body = "Last week didn't go your way — but there's still nothing worth moving for. Holding is the call.",
                        nextRead = "Next read · Tuesday 3:00 AM waivers",
                    ),
                ),
            ),
        )

        model.load("user-1")

        val state = requireNotNull(model.quietWeekState) { "expected an eligible quiet-week answer to produce a quiet state" }
        assertEquals(com.slopssaloon.omen.app.feature.commandcenter.OmenQuietVariant.Straight, state.variant)
        assertEquals("Week 9", state.weekLabel)
        assertEquals("Nothing worth moving for.", state.headline)
        assertEquals("Next read · Tuesday 3:00 AM waivers", state.nextRead)
    }

    @Test
    fun ineligibleQuietWeekLeavesDeskInPlace() = runBlocking {
        val model = viewModel(
            quietWeekRepository = StubQuietWeekRepository(
                OmenApiResult.Success(
                    quietWeek(eligible = false, variant = null, headline = null, body = null, nextRead = null),
                ),
            ),
        )

        model.load("user-1")

        assertNull(model.quietWeekState)
    }

    @Test
    fun quietWeekTransportFailureLeavesDeskInPlace() = runBlocking {
        val model = viewModel(
            quietWeekRepository = StubQuietWeekRepository(OmenApiResult.Failure(OmenApiError.Network)),
        )

        model.load("user-1")

        assertNull(model.quietWeekState)
    }

    @Test
    fun quietWeekIsNotFetchedWithoutAConnectedPlatform() = runBlocking {
        var called = false
        val recording = object : QuietWeekRepository {
            override suspend fun fetchQuietWeek(accessToken: String): OmenApiResult<QuietWeekResponse> {
                called = true
                return OmenApiResult.Failure(OmenApiError.Network)
            }
        }
        val model = viewModel(omenStatus = "needs_platform", quietWeekRepository = recording)

        model.load("user-1")

        assertFalse("a disconnected user's dashboard load must not issue the opt-in quiet-week read", called)
        assertNull(model.quietWeekState)
    }
}
