package com.slopssaloon.omen.app.feature.api

import com.slopssaloon.omen.app.feature.commandcenter.OmenLeaguePulseState
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/**
 * League Pulse derivation from `league-standings.v1`.
 * Swift twin: the League Pulse tests in `LeagueStandingsTests.swift`.
 *
 * Regression context: League Pulse used to be derived from `dashboard-summary.v1`'s tool status
 * alone and returned Unavailable for every healthy league, while this payload — already fetched
 * for the context strip — carried the rank the section needed. It was then rendered with
 * `OmenStateSurfaceKind.Loading`, so the section spun forever on a state that never resolved.
 */
class LeagueStandingsPulseTest {

    private fun standings(rows: String): LeagueStandings = requireNotNull(
        LeagueStandings.parse(
            """
            {"contract_version":"league-standings.v1","platform":"sleeper",
             "league_name":"Dynasty Dogs","standings":$rows}
            """.trimIndent(),
        ),
    )

    @Test
    fun `pulse is derived from standings already fetched`() {
        val parsed = standings(
            """
            [{"team_name":"A","is_current_user":false,"rank":1,"wins":7,"losses":0},
             {"team_name":"B","is_current_user":false,"rank":2,"wins":6,"losses":1},
             {"team_name":"Mine","is_current_user":true,"rank":3,"wins":6,"losses":1}]
            """.trimIndent(),
        )

        val pulse = parsed.leaguePulse as OmenLeaguePulseState.Available
        assertEquals("3rd of 3 · 6-1", pulse.position)
        // This contract carries no playoff settings and no transaction feed.
        assertNull(pulse.cutLine)
        assertNull(pulse.activity)
    }

    @Test
    fun `pulse refuses to invent a rank`() {
        // Off-season returns an empty array — facts-of-record #10.
        assertNull(standings("[]").leaguePulse)
        // No row is the caller's.
        assertNull(standings("""[{"team_name":"A","is_current_user":false,"rank":1}]""").leaguePulse)
        // The caller's row carries no rank.
        assertNull(standings("""[{"team_name":"Mine","is_current_user":true}]""").leaguePulse)
    }

    /** A 12-team league is exactly where the naive last-digit ordinal rule breaks. */
    @Test
    fun `ordinal handles the teen exception`() {
        assertEquals("1st", LeagueStandings.ordinal(1))
        assertEquals("2nd", LeagueStandings.ordinal(2))
        assertEquals("3rd", LeagueStandings.ordinal(3))
        assertEquals("11th", LeagueStandings.ordinal(11))
        assertEquals("12th", LeagueStandings.ordinal(12))
        assertEquals("13th", LeagueStandings.ordinal(13))
        assertEquals("21st", LeagueStandings.ordinal(21))
    }
}
