package com.slopssaloon.omen.app.feature.api

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
 * `start-sit-detail.v2` wiring in [OmenDecisionViewModel] — the reachability-closing case for
 * `OmenStartSitScreen`, carried over from J3 and never wired into production. iOS twin: the
 * "Start/sit wiring" section of `OmenDecisionTests.swift`.
 */
class OmenDecisionStartSitTest {

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

    private fun startSitEnvelope(): OmenDecisionEnvelope = requireNotNull(
        OmenDecisionEnvelope.parse(
            """
            {"state": "success", "mode": "live", "recommendation": {"type": "start_sit", "title": "Start McCaffrey", "move": "Bench Walker."}}
            """.trimIndent(),
        ),
    )

    private fun nonStartSitEnvelope(): OmenDecisionEnvelope = requireNotNull(
        OmenDecisionEnvelope.parse(
            """
            {"state": "success", "mode": "live", "recommendation": {"type": "trade_suggestion", "title": "Trade for McCaffrey", "move": "Send Walker."}}
            """.trimIndent(),
        ),
    )

    private fun startSitDetailFixture(): StartSitDetail = requireNotNull(
        StartSitDetail.parse(
            """
            {
              "contract_version": "start-sit-detail.v2",
              "state": "clear_decision",
              "week": 9,
              "recommendation": {
                "slot": "RB",
                "start": {"name": "McCaffrey", "position": "RB"},
                "over": {"name": "Walker", "position": "RB"},
                "points_delta": 4.2
              },
              "why": ["McCaffrey projects higher this week."],
              "what_could_change_this": [],
              "evidence": [],
              "alternatives": [],
              "capabilities": []
            }
            """.trimIndent(),
        ),
    )

    @Test
    fun liveStartSitCallFetchesStartSitDetail() = runBlocking {
        var calledWithSlot: String? = "not-called"
        val startSitRepo = object : StartSitDetailRepository {
            override suspend fun fetchDetail(accessToken: String, slot: String?): OmenApiResult<StartSitDetail> {
                calledWithSlot = slot
                return OmenApiResult.Success(startSitDetailFixture())
            }
        }
        val viewModel = OmenDecisionViewModel(
            repository = StubOmenDecisionRepository(OmenApiResult.Success(startSitEnvelope())),
            sessionManager = sessionManager(),
            startSitRepository = startSitRepo,
        )

        viewModel.load("real-user")

        assertTrue("a live start_sit call must fetch start-sit-detail.v2", calledWithSlot != "not-called")
        assertEquals("clear_decision", viewModel.startSitDetail?.state)
        assertEquals("McCaffrey", viewModel.startSitDetail?.recommendation?.start?.name)
    }

    @Test
    fun nonStartSitCallDoesNotFetchStartSitDetail() = runBlocking {
        var called = false
        val startSitRepo = object : StartSitDetailRepository {
            override suspend fun fetchDetail(accessToken: String, slot: String?): OmenApiResult<StartSitDetail> {
                called = true
                return OmenApiResult.Failure(OmenApiError.Network)
            }
        }
        val viewModel = OmenDecisionViewModel(
            repository = StubOmenDecisionRepository(OmenApiResult.Success(nonStartSitEnvelope())),
            sessionManager = sessionManager(),
            startSitRepository = startSitRepo,
        )

        viewModel.load("real-user")

        assertFalse("a non-start_sit call must not fetch start-sit-detail.v2", called)
        assertNull(viewModel.startSitDetail)
    }

    @Test
    fun startSitDetailFailureLeavesBriefStateInPlace() = runBlocking {
        val viewModel = OmenDecisionViewModel(
            repository = StubOmenDecisionRepository(OmenApiResult.Success(startSitEnvelope())),
            sessionManager = sessionManager(),
            startSitRepository = StubStartSitDetailRepository(OmenApiResult.Failure(OmenApiError.Network)),
        )

        viewModel.load("real-user")

        assertNull(viewModel.startSitDetail)
        assertTrue(
            "a failed detail read must not turn a successful brief into an error",
            viewModel.briefState() is com.slopssaloon.omen.core.designsystem.component.OmenDecisionBriefState.Success,
        )
    }
}
