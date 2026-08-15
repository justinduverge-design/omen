package com.slopssaloon.omen.app.feature.api

import com.slopssaloon.omen.app.feature.commandcenter.OmenLeaguePulseState
import com.slopssaloon.omen.app.feature.commandcenter.OmenLedgerPreviewState
import com.slopssaloon.omen.app.feature.commandcenter.OmenWaiverWatchState
import com.slopssaloon.omen.core.designsystem.component.OmenContextStripState
import com.slopssaloon.omen.core.designsystem.component.OmenMatchupHeroState
import com.slopssaloon.omen.core.designsystem.component.OmenPlatform
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * M5-Native-API-Client slices A–C, Android. Mirrors the iOS `OmenApiClientTests`,
 * `DashboardSummaryTests`, and `LeagueStandingsTests`.
 *
 * These live in `androidTest` rather than a JVM `test` source set because the app module has no
 * unit-test source set, and adding one would mean changing build configuration and dependencies
 * — outside this item's boundary.
 */
class OmenApiTest {

    // MARK: - Slice A, transport

    private class RecordingFetcher(
        private val status: Int,
        private val responseBody: String,
        private val transportFails: Boolean = false,
    ) : OmenHttpFetcher {
        var url: String? = null
        var method: String? = null
        var token: String? = null
        var sentBody: String? = null

        override suspend fun fetch(
            url: String,
            method: String,
            accessToken: String,
            body: String?,
        ): Pair<Int, String>? {
            this.url = url
            this.method = method
            this.token = accessToken
            this.sentBody = body
            return if (transportFails) null else status to responseBody
        }
    }

    private fun client(fetcher: OmenHttpFetcher) = OmenApiClient("https://example.invalid", fetcher)

    @Test
    fun buildsTheContractRelativeUrlAndPassesTheBearer() = runBlocking {
        val fetcher = RecordingFetcher(200, """{"ok":true}""")
        client(fetcher).get("api/dashboard/summary", "token-123") { it }

        assertEquals("https://example.invalid/api/dashboard/summary", fetcher.url)
        assertEquals("GET", fetcher.method)
        assertEquals("token-123", fetcher.token)
    }

    /** A token in the URL would land in server logs and any crash report capturing the request. */
    @Test
    fun neverPlacesTheTokenInTheUrl() = runBlocking {
        val fetcher = RecordingFetcher(200, """{"ok":true}""")
        client(fetcher).get("api/dashboard/summary", "token-123") { it }

        assertFalse(fetcher.url!!.contains("token-123"))
    }

    @Test
    fun mapsUnauthorizedStatuses() = runBlocking {
        for (status in listOf(401, 403)) {
            val result = client(RecordingFetcher(status, "")).get("api/x", "t") { it }
            assertEquals(OmenApiError.Unauthorized, (result as OmenApiResult.Failure).error)
        }
    }

    @Test
    fun mapsServerErrorAndCarriesStatus() = runBlocking {
        val result = client(RecordingFetcher(503, "")).get("api/x", "t") { it }
        assertEquals(OmenApiError.Server(503), (result as OmenApiResult.Failure).error)
    }

    @Test
    fun mapsTransportFailureToNetwork() = runBlocking {
        val result = client(RecordingFetcher(0, "", transportFails = true)).get("api/x", "t") { it }
        assertEquals(OmenApiError.Network, (result as OmenApiResult.Failure).error)
    }

    /** A 200 with an unreadable body is a decode failure, never a silent empty success. */
    @Test
    fun mapsUnreadableSuccessBodyToDecode() = runBlocking {
        val result = client(RecordingFetcher(200, "not json")).get("api/x", "t") {
            DashboardSummary.parse(it)
        }
        assertEquals(OmenApiError.Decode, (result as OmenApiResult.Failure).error)
    }

    // MARK: - Slice B, dashboard summary

    private fun summaryJson(
        omen: String,
        waiver: String = "ready",
        sleeperConnected: Boolean = false,
    ) = """
        {
          "contract_version": "dashboard-summary.v1",
          "is_mock": false,
          "user": { "favorite_team": "PHI" },
          "platforms": {
            "yahoo": { "connected": false, "league_id": null, "lastResult": null },
            "sleeper": { "connected": $sleeperConnected, "username": "slops", "lastResult": null },
            "espn": { "connected": false, "lastResult": null }
          },
          "tools": {
            "draft_assistant": { "available": true, "status": "ready" },
            "omen_of_the_week": { "available": true, "status": "$omen" },
            "waiver_wire": { "available": true, "status": "$waiver" }
          }
        }
    """.trimIndent()

    @Test
    fun decodesLiveContractShape() {
        val summary = DashboardSummary.parse(summaryJson("ready", sleeperConnected = true))!!

        assertEquals("dashboard-summary.v1", summary.contractVersion)
        assertFalse(summary.isMock)
        assertEquals("PHI", summary.favoriteTeam)
        assertTrue(summary.platforms.sleeperConnected)
        assertTrue(summary.platforms.anyConnected)
        assertEquals(DashboardSummary.ToolStatus.Ready, summary.omenStatus)
    }

    /** Additive growth is routine here. An unrecognized status must not black out the screen. */
    @Test
    fun unknownToolStatusDegradesRatherThanFailingTheResponse() {
        val summary = DashboardSummary.parse(summaryJson("some_future_status"))!!
        assertEquals(DashboardSummary.ToolStatus.Unknown, summary.omenStatus)
    }

    @Test
    fun eachF2StatusDecodesToItsOwnCase() {
        assertEquals(DashboardSummary.ToolStatus.Ready, DashboardSummary.parse(summaryJson("ready"))!!.omenStatus)
        assertEquals(
            DashboardSummary.ToolStatus.PendingLiveEngine,
            DashboardSummary.parse(summaryJson("pending_live_engine"))!!.omenStatus,
        )
        assertEquals(
            DashboardSummary.ToolStatus.NeedsPlatform,
            DashboardSummary.parse(summaryJson("needs_platform"))!!.omenStatus,
        )
        assertEquals(
            DashboardSummary.ToolStatus.OffSeason,
            DashboardSummary.parse(summaryJson("off_season"))!!.omenStatus,
        )
    }

    /** The contract carries no league or team name; naming one would be invention. */
    @Test
    fun mappingNeverInventsALeagueOrTeamName() {
        val state = DashboardSummary.parse(summaryJson("ready", sleeperConnected = true))!!
            .toCommandCenterState()

        assertEquals(OmenContextStripState.Empty, state.context)
    }

    /** `Calm(emptyList())` would read as "Omen looked and found nothing," which it has not done. */
    @Test
    fun readyWaiverToolDoesNotClaimAnEmptyOpportunityList() {
        val state = DashboardSummary.parse(summaryJson("ready", sleeperConnected = true))!!
            .toCommandCenterState()

        assertEquals(OmenWaiverWatchState.AvailabilityUnknown, state.waiverWatch)
    }

    @Test
    fun needsPlatformRendersDisconnectedRatherThanEmpty() {
        val state = DashboardSummary.parse(summaryJson("needs_platform", waiver = "needs_platform"))!!
            .toCommandCenterState()

        assertEquals(OmenWaiverWatchState.NotConnected, state.waiverWatch)
        assertEquals(OmenLedgerPreviewState.NotConnected, state.ledger)
        assertEquals(OmenLeaguePulseState.NotConnected, state.leaguePulse)
        assertEquals("Connect a league to see your matchup.", state.greeting)
    }

    /**
     * `buildWaiverTool()` has no off-season branch — the gate lives on `omen_of_the_week`. Without
     * the season override a connected user is told to watch waivers in August.
     */
    @Test
    fun offSeasonMapsToOffSeasonSectionsEvenWhenTheWaiverToolSaysReady() {
        val state = DashboardSummary.parse(
            summaryJson("off_season", waiver = "ready", sleeperConnected = true),
        )!!.toCommandCenterState()

        assertEquals(OmenWaiverWatchState.OffSeason, state.waiverWatch)
        assertTrue(state.leaguePulse is OmenLeaguePulseState.OffSeason)
        assertEquals("The season hasn't started yet.", state.greeting)
    }

    /** F2: `pending_live_engine` is missing league context, NOT an unbuilt engine. */
    @Test
    fun pendingLiveEngineCopyDescribesMissingLeagueDetailNotAMissingEngine() {
        val state = DashboardSummary.parse(
            summaryJson("pending_live_engine", sleeperConnected = true),
        )!!.toCommandCenterState()

        val reason = (state.matchup as OmenMatchupHeroState.NoMatchup).reason
        assertTrue(reason.contains("league details"))
        assertFalse(reason.lowercase().contains("coming soon"))
        assertFalse(reason.lowercase().contains("not built"))
    }

    /** facts-of-record #12: `connected` is not `usable`, and the copy must reflect that. */
    @Test
    fun connectedButUnusableIsNotDescribedAsNoLeagues() {
        val state = DashboardSummary.parse(
            summaryJson("needs_platform", waiver = "needs_platform", sleeperConnected = true),
        )!!.toCommandCenterState()

        val reason = (state.matchup as OmenMatchupHeroState.NoMatchup).reason
        assertTrue(reason.contains("isn't usable yet"))
    }

    // MARK: - Slice C, league standings

    private fun standingsJson(
        platform: String = "sleeper",
        leagueName: String? = "Slops Dynasty",
        teams: String = """{"team_name":"Team Slops","is_current_user":true,"rank":3}""",
    ): String {
        val name = leagueName?.let { "\"$it\"" } ?: "null"
        return """
            {
              "contract_version": "league-standings.v1",
              "platform": "$platform",
              "league_id": "123456",
              "league_name": $name,
              "standings": [$teams]
            }
        """.trimIndent()
    }

    @Test
    fun decodesStandingsContractShape() {
        val standings = LeagueStandings.parse(standingsJson())!!

        assertEquals("league-standings.v1", standings.contractVersion)
        assertEquals("Slops Dynasty", standings.leagueName)
        assertEquals("Team Slops", standings.currentUserTeam?.teamName)
        assertEquals(3, standings.currentUserTeam?.rank)
    }

    @Test
    fun mapsEachSupportedProviderToItsPlatformMark() {
        assertEquals(OmenPlatform.Sleeper, LeagueStandings.parse(standingsJson("sleeper"))!!.omenPlatform)
        assertEquals(OmenPlatform.Espn, LeagueStandings.parse(standingsJson("espn"))!!.omenPlatform)
        assertEquals(OmenPlatform.Yahoo, LeagueStandings.parse(standingsJson("yahoo"))!!.omenPlatform)
    }

    /** Badging a league with a guessed provider mark would be a visible lie about the source. */
    @Test
    fun unknownProviderYieldsNoPlatformAndNoContext() {
        val standings = LeagueStandings.parse(standingsJson("some_new_provider"))!!

        assertNull(standings.omenPlatform)
        assertNull(standings.contextStrip)
    }

    @Test
    fun buildsContextStripFromVerifiedIdentity() {
        val strip = LeagueStandings.parse(standingsJson())!!.contextStrip

        assertNotNull(strip)
        val selected = strip as OmenContextStripState.Selected
        assertEquals(OmenPlatform.Sleeper, selected.platform)
        assertEquals("Slops Dynasty", selected.leagueName)
        assertEquals("Team Slops", selected.teamName)
    }

    /** Better an unfilled strip than a placeholder printed beside a real value. */
    @Test
    fun missingOrEmptyLeagueNameProducesNoContext() {
        assertNull(LeagueStandings.parse(standingsJson(leagueName = null))!!.contextStrip)
        assertNull(LeagueStandings.parse(standingsJson(leagueName = ""))!!.contextStrip)
    }

    /** The off-season returns 200 with an empty array. Valid response, no context. */
    @Test
    fun offSeasonEmptyStandingsProducesNoContext() {
        val standings = LeagueStandings.parse(standingsJson(teams = ""))!!

        assertTrue(standings.standings.isEmpty())
        assertNull(standings.currentUserTeam)
        assertNull(standings.contextStrip)
    }

    /** A missing flag means "not known to be mine", never "mine". */
    @Test
    fun absentIsCurrentUserFlagDefaultsToNotMine() {
        val standings = LeagueStandings.parse(
            standingsJson(teams = """{"team_name":"Ambiguous Team","rank":1}"""),
        )!!

        assertFalse(standings.standings.first().isCurrentUser)
        assertNull(standings.contextStrip)
    }
}
