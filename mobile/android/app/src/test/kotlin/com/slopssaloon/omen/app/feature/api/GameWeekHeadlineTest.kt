package com.slopssaloon.omen.app.feature.api

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The Command Center headline moves with the NFL game week.
 * Swift twin: `DashboardSummaryTests` game-week section.
 *
 * Founder direction 2026-09-04: Tuesday prepares the plan, Wednesday has it ready, Thursday
 * through Monday is game mode.
 */
class GameWeekHeadlineTest {

    private fun gameWeek(
        phase: DashboardSummary.GameWeek.Phase,
        day: String?,
        week: Int? = 3,
    ) = DashboardSummary.GameWeek(
        week = week,
        phase = phase,
        day = day,
        isOffSeason = week == null,
    )

    @Test
    fun `tuesday prepares and wednesday is ready`() {
        assertEquals(
            "Preparing your Week 3 game plan.",
            greetingFor(
                DashboardSummary.ToolStatus.Ready,
                gameWeek(DashboardSummary.GameWeek.Phase.Preparing, "tuesday"),
            ),
        )
        assertEquals(
            "Your Week 3 game plan is ready.",
            greetingFor(
                DashboardSummary.ToolStatus.Ready,
                gameWeek(DashboardSummary.GameWeek.Phase.Ready, "wednesday"),
            ),
        )
    }

    @Test
    fun `the live window reads differently each day`() {
        val lines = listOf("thursday", "friday", "saturday", "sunday", "monday").map {
            greetingFor(
                DashboardSummary.ToolStatus.Ready,
                gameWeek(DashboardSummary.GameWeek.Phase.Live, it),
            )
        }

        assertEquals("Week 3 is live. Thursday night is on.", lines[0])
        assertEquals("Sunday. Week 3 is in play.", lines[3])
        assertEquals("Monday night closes out Week 3.", lines[4])
        // Rotation is the point — five identical lines would be the static headline again.
        assertEquals(5, lines.toSet().size)
    }

    @Test
    fun `an unknown day still gets a true sentence`() {
        // The contract may grow, and one unrecognised string must not blank the headline.
        assertEquals(
            "Week 3 is live.",
            greetingFor(
                DashboardSummary.ToolStatus.Ready,
                gameWeek(DashboardSummary.GameWeek.Phase.Live, "caturday"),
            ),
        )
    }

    /**
     * Status beats the calendar. A disconnected user must never be told "Sunday, Week 3 is in
     * play" — that is a claim about a week Omen cannot see for them.
     */
    @Test
    fun `setup status outranks the game week`() {
        val statuses = listOf(
            DashboardSummary.ToolStatus.NeedsPlatform,
            DashboardSummary.ToolStatus.OffSeason,
            DashboardSummary.ToolStatus.Unknown,
            DashboardSummary.ToolStatus.PendingLiveEngine,
        )
        for (status in statuses) {
            val line = greetingFor(status, gameWeek(DashboardSummary.GameWeek.Phase.Live, "sunday"))
            assertFalse("$status leaked a week number", line.contains("Week 3"))
            assertFalse("$status leaked a game-week day", line.contains("Sunday"))
        }
    }

    /**
     * A headline naming a week that has not arrived is a lie the user can see — the same class
     * of error as the clamped `week: 1` that made the off-season look like Week 1.
     */
    @Test
    fun `no week number means no week in the copy`() {
        assertEquals(
            "Your game plan is ready.",
            greetingFor(
                DashboardSummary.ToolStatus.Ready,
                gameWeek(DashboardSummary.GameWeek.Phase.Live, "sunday", week = null),
            ),
        )
        // An older server sends no `game_week` at all; same outcome, no invented number.
        assertEquals(
            "Your game plan is ready.",
            greetingFor(DashboardSummary.ToolStatus.Ready, null),
        )
    }

    @Test
    fun `game_week parses, and its absence is not a parse failure`() {
        val withWeek = requireNotNull(
            DashboardSummary.parse(
                """
                {"contract_version":"dashboard-summary.v1","is_mock":false,
                 "game_week":{"season":2026,"week":3,"phase":"preparing","day":"tuesday","is_off_season":false},
                 "platforms":{},"tools":{}}
                """.trimIndent(),
            ),
        )
        assertEquals(3, withWeek.gameWeek?.week)
        assertEquals(DashboardSummary.GameWeek.Phase.Preparing, withWeek.gameWeek?.phase)
        assertEquals("tuesday", withWeek.gameWeek?.day)

        val without = requireNotNull(
            DashboardSummary.parse(
                """{"contract_version":"dashboard-summary.v1","is_mock":false,"platforms":{},"tools":{}}""",
            ),
        )
        assertNull(without.gameWeek)

        // Off-season sends a null week rather than omitting the object, and `optIntOrNull` has
        // to tell that apart from a zero — which is exactly why it is not `optInt`.
        val offSeason = requireNotNull(
            DashboardSummary.parse(
                """
                {"contract_version":"dashboard-summary.v1","is_mock":false,
                 "game_week":{"season":2026,"week":null,"phase":"off_season","day":"sunday","is_off_season":true},
                 "platforms":{},"tools":{}}
                """.trimIndent(),
            ),
        )
        assertNull(offSeason.gameWeek?.week)
        assertTrue(offSeason.gameWeek?.isOffSeason == true)
    }
}
