package com.slopssaloon.omen.app.feature.api

import com.slopssaloon.omen.app.feature.commandcenter.OmenLeaguePulseState
import com.slopssaloon.omen.core.designsystem.component.OmenContextStripState
import com.slopssaloon.omen.core.designsystem.component.OmenMatchupHeroState
import com.slopssaloon.omen.core.designsystem.component.OmenPlatform
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * `league-overview.v1` parsing and the Command Center mappings it feeds.
 * Swift twin: `LeagueOverviewTests.swift`.
 *
 * The Matchup Hero's populated states existed with no real-data path — the only production
 * path returned NoMatchup unconditionally. These cover the path that finally reaches them.
 */
class LeagueOverviewTest {

    private val defaultStandings = """
        {"status":"available",
         "playoff_picture":{"rank":3,"team_count":12,"line":"3rd of 12","cut_line_note":null,"settings_known":false},
         "teams":[{"team_name":"Team Slops","is_current_user":true,"rank":3,"wins":6,"losses":2}]}
    """.trimIndent()

    private val defaultActivity =
        """{"status":"empty","unavailable_families":["transactions"],"items":[]}"""

    private fun parse(
        matchup: String,
        standings: String = defaultStandings,
        activity: String = defaultActivity,
    ): LeagueOverview = requireNotNull(
        LeagueOverview.parse(
            """
            {"contract_version":"league-overview.v1","platform":"sleeper","league_id":"1",
             "league_name":"Slops Dynasty","season":2026,"week":8,
             "matchup":$matchup,"standings":$standings,"activity":$activity}
            """.trimIndent(),
        ),
    )

    private fun sides(status: String, you: String = "88.4", them: String = "91.1") = """
        {"status":"$status",
         "you":{"team_id":"7","team_name":"Team Slops","record":"6-2","points":$you,"projected":null},
         "opponent":{"team_id":"3","team_name":"Top Dogs","record":"7-1","points":$them,"projected":null},
         "unavailable_reason":null}
    """.trimIndent()

    @Test
    fun `live matchup reaches the hero with both sides`() {
        val hero = parse(sides("live")).matchupHero as OmenMatchupHeroState.Live

        assertEquals("Team Slops", hero.selectedTeam.name)
        assertEquals("6-2", hero.selectedTeam.record)
        assertEquals("88.4", hero.selectedTeam.scoreText)
        assertEquals("Top Dogs", hero.opponent.name)
        assertEquals("91.1", hero.opponent.scoreText)
        // This FIXTURE carries no projection, so the field stays empty rather than guessing.
        assertNull(hero.projectedFinish)
        assertEquals("Within 2.7 points right now.", hero.whatToWatch)
    }

    @Test
    fun `final matchup states the result from points`() {
        val hero = parse(sides("final", you = "120.0", them = "99.5")).matchupHero
            as OmenMatchupHeroState.Final

        assertEquals("Won 120.0–99.5", hero.resultSummary)
    }

    @Test
    fun `pregame carries no invented kickoff time`() {
        val hero = parse(sides("pregame", you = "0", them = "0")).matchupHero
            as OmenMatchupHeroState.BeforeGames

        // `league-overview.v1` carries no kickoff time. Say what is true, invent nothing.
        assertEquals("Not started", hero.startTime)
        assertNull("a margin line is meaningless before anyone has scored", hero.whatToWatch)
    }

    /** A bye and a failed read are different facts and must not collapse into one state. */
    @Test
    fun `bye and unavailable both leave the shell reason intact`() {
        val bye = parse("""{"status":"no_matchup","you":null,"opponent":null,"unavailable_reason":null}""")
        assertNull(bye.matchupHero)

        val dead = parse(
            """{"status":"unavailable","you":null,"opponent":null,"unavailable_reason":"provider_failed"}""",
        )
        assertNull(dead.matchupHero)
        assertEquals("provider_failed", dead.matchup.unavailableReason)
    }

    @Test
    fun `a matchup missing a team name does not reach the hero`() {
        val overview = parse(
            """
            {"status":"live",
             "you":{"team_id":"7","team_name":null,"record":"6-2","points":88.4,"projected":null},
             "opponent":{"team_id":"3","team_name":"Top Dogs","record":"7-1","points":91.1,"projected":null},
             "unavailable_reason":null}
            """.trimIndent(),
        )

        assertNull(overview.matchupHero)
    }

    /**
     * The contract is expected to grow. One unrecognized status must not blank a screen whose
     * other sections parsed fine.
     */
    @Test
    fun `an unknown status degrades rather than failing the parse`() {
        val overview = parse(sides("overtime_shootout"))

        assertEquals(LeagueOverview.Matchup.Status.Unavailable, overview.matchup.status)
        assertNull(overview.matchupHero)
        assertEquals(LeagueOverview.Standings.Status.Available, overview.standings.status)
        assertEquals(1, overview.standings.teams.size)
    }

    @Test
    fun `league pulse uses the server position and omits an unknown cut line`() {
        val pulse = parse(sides("live")).leaguePulse as OmenLeaguePulseState.Available

        assertEquals("3rd of 12", pulse.position)
        // `settings_known: false` — the cut line must stay absent even if one were sent.
        assertNull(pulse.cutLine)
        // v1 derives no activity signals.
        assertNull(pulse.activity)
    }

    @Test
    fun `off season standings are not reported as a failure`() {
        val overview = parse(
            matchup = """{"status":"no_matchup","you":null,"opponent":null,"unavailable_reason":null}""",
            standings = """{"status":"off_season","playoff_picture":null,"teams":[]}""",
        )

        assertTrue(overview.leaguePulse is OmenLeaguePulseState.OffSeason)
    }

    /**
     * The seam the waiver work drops into. If this shape changes, the integration has to change
     * the contract — which is exactly what building it now prevents.
     */
    @Test
    fun `the transactions slot is present and named`() {
        val activity = parse(sides("live")).activity

        assertEquals(LeagueOverview.Activity.Status.Empty, activity.status)
        assertEquals(listOf("transactions"), activity.unavailableFamilies)
        assertTrue(activity.items.isEmpty())
    }

    @Test
    fun `context strip requires a platform a league name and the callers team`() {
        val full = parse(sides("live")).contextStrip as OmenContextStripState.Selected
        assertEquals(OmenPlatform.Sleeper, full.platform)
        assertEquals("Slops Dynasty", full.leagueName)
        assertEquals("Team Slops", full.teamName)

        // No row flagged as the caller's — the strip stays empty rather than badging someone
        // else's team as yours.
        val notMine = parse(
            matchup = sides("live"),
            standings = """{"status":"available","playoff_picture":null,
                            "teams":[{"team_name":"Someone Else","is_current_user":false,"rank":1}]}""",
        )
        assertNull(notMine.contextStrip)
    }

    /**
     * F-HOT-01 twin. Android already tolerated an absent section; this pins that behaviour so
     * the two platforms cannot diverge again. iOS used to fail the whole decode here.
     */
    @Test
    fun `an absent section degrades instead of failing the whole payload`() {
        val overview = requireNotNull(
            LeagueOverview.parse(
                """
                {"contract_version":"league-overview.v1","platform":"sleeper","league_id":"1",
                 "league_name":"Slops Dynasty","season":2026,"week":8,
                 "standings":{"status":"available","playoff_picture":null,
                   "teams":[{"team_name":"Team Slops","is_current_user":true,"rank":3}]},
                 "activity":{"status":"empty","unavailable_families":["transactions"],"items":[]}}
                """.trimIndent(),
            ),
        )

        assertEquals(LeagueOverview.Matchup.Status.Unavailable, overview.matchup.status)
        assertNull(overview.matchupHero)
        assertEquals(LeagueOverview.Standings.Status.Available, overview.standings.status)
        assertEquals(1, overview.standings.teams.size)
    }

    /** F-SCR-01 twin — the column the league is actually sorted by. */
    @Test
    fun `standings rows carry their points columns`() {
        val overview = requireNotNull(
            LeagueOverview.parse(
                """
                {"contract_version":"league-overview.v1","platform":"sleeper","league_id":"1",
                 "league_name":"L","season":2026,"week":8,
                 "matchup":{"status":"no_matchup","you":null,"opponent":null,"unavailable_reason":null},
                 "standings":{"status":"available","playoff_picture":null,
                   "teams":[{"team_name":"Mine","is_current_user":true,"rank":1,"wins":6,"losses":2,
                             "points_for":1142.4,"points_against":980.6}]},
                 "activity":{"status":"empty","unavailable_families":[],"items":[]}}
                """.trimIndent(),
            ),
        )

        val team = overview.standings.teams.first()
        assertEquals(1142.4, team.pointsFor!!, 0.001)
        assertEquals(980.6, team.pointsAgainst!!, 0.001)
    }

    /** Absent points stay absent — never 0.0, the same rule the confidence fix established. */
    @Test
    fun `absent points stay absent rather than becoming zero`() {
        val overview = requireNotNull(
            LeagueOverview.parse(
                """
                {"contract_version":"league-overview.v1","platform":"espn","league_id":"1",
                 "league_name":"L","season":2026,"week":8,
                 "matchup":{"status":"no_matchup","you":null,"opponent":null,"unavailable_reason":null},
                 "standings":{"status":"available","playoff_picture":null,
                   "teams":[{"team_name":"Mine","is_current_user":true,"rank":1}]},
                 "activity":{"status":"empty","unavailable_families":[],"items":[]}}
                """.trimIndent(),
            ),
        )

        assertNull(overview.standings.teams.first().pointsFor)
        assertNull(overview.standings.teams.first().pointsAgainst)
    }

    // ---- Projected points ----
    //
    // `projected` has been in `league-overview.v1` since it shipped and nothing read it, so
    // before kickoff every hero showed an em dash on both sides — the one moment a projection
    // is the only number that exists. iOS mirror: `LeagueOverviewTests` projected section.

    private fun projectedSides(
        status: String,
        you: String = "0.0",
        them: String = "0.0",
        youProjected: String = "119.6",
        themProjected: String = "114.2",
    ) = """
        {"status":"$status",
         "you":{"team_id":"7","team_name":"Team Slops","record":"6-2","points":$you,"projected":$youProjected},
         "opponent":{"team_id":"3","team_name":"Top Dogs","record":"7-1","points":$them,"projected":$themProjected},
         "unavailable_reason":null}
    """.trimIndent()

    @Test
    fun `pregame puts the projection in its own column and leaves score empty`() {
        val hero = parse(projectedSides("pregame")).matchupHero as OmenMatchupHeroState.BeforeGames

        // Founder sketch 2026-09-04: PROJ and SCORE are two columns. Before kickoff the
        // projection is real and the score is not — an em dash, never "0.0", which would state
        // as fact that they scored nothing.
        assertEquals("119.6", hero.selectedTeam.projectedText)
        assertEquals("—", hero.selectedTeam.scoreText)
        assertEquals("114.2", hero.opponent.projectedText)
        assertEquals("—", hero.opponent.scoreText)
    }

    @Test
    fun `live shows both columns`() {
        val hero = parse(projectedSides("live", you = "88.4", them = "91.1")).matchupHero
            as OmenMatchupHeroState.Live

        // Where you are AND where you are heading. The pair is the whole point of the columns.
        assertEquals("119.6", hero.selectedTeam.projectedText)
        assertEquals("88.4", hero.selectedTeam.scoreText)
    }

    @Test
    fun `final drops the projection column entirely`() {
        val hero = parse(projectedSides("final", you = "120.0", them = "99.5")).matchupHero
            as OmenMatchupHeroState.Final

        // Null rather than a dash: it removes the column instead of drawing an empty one.
        assertNull(hero.selectedTeam.projectedText)
        assertEquals("120.0", hero.selectedTeam.scoreText)
    }

    @Test
    fun `pregame with no projection still refuses to print a zero`() {
        val matchup = """
            {"status":"pregame",
             "you":{"team_id":"7","team_name":"Team Slops","record":"6-2","points":null,"projected":null},
             "opponent":{"team_id":"3","team_name":"Top Dogs","record":"7-1","points":null,"projected":null},
             "unavailable_reason":null}
        """.trimIndent()
        val hero = parse(matchup).matchupHero as OmenMatchupHeroState.BeforeGames

        // An em dash, never "0.0" — a zero would read as "they scored nothing".
        assertEquals("—", hero.selectedTeam.scoreText)
    }

    @Test
    fun `live leads with real points and puts the projection on the centre rule`() {
        val hero = parse(projectedSides("live", you = "88.4", them = "91.1")).matchupHero
            as OmenMatchupHeroState.Live

        // Points lead once they exist; two numbers in one slot would be unreadable.
        assertEquals("88.4", hero.selectedTeam.scoreText)
        assertEquals("91.1", hero.opponent.scoreText)
        assertEquals("119.6–114.2 proj", hero.projectedFinish)
        // "Projected within" now means the projected margin, not the current one relabelled.
        assertEquals("Projected within 5.4 points.", hero.whatToWatch)
    }

    @Test
    fun `a one-sided projection is no projection at all`() {
        val matchup = """
            {"status":"live",
             "you":{"team_id":"7","team_name":"Team Slops","record":"6-2","points":88.4,"projected":119.6},
             "opponent":{"team_id":"3","team_name":"Top Dogs","record":"7-1","points":91.1,"projected":null},
             "unavailable_reason":null}
        """.trimIndent()
        val hero = parse(matchup).matchupHero as OmenMatchupHeroState.Live

        // A rule reading "119.6–" invites the reader to fill in the blank themselves.
        assertNull(hero.projectedFinish)
    }

    @Test
    fun `final ignores the projection entirely`() {
        val hero = parse(projectedSides("final", you = "120.0", them = "99.5")).matchupHero
            as OmenMatchupHeroState.Final

        // A projection after the whistle is noise.
        assertEquals("120.0", hero.selectedTeam.scoreText)
    }
}
